"""Small ASGI guards; shared Redis counters work across API processes."""
import hashlib
import json
import time
from redis import Redis
from starlette.responses import JSONResponse


class RequestGuards:
    def __init__(self, app, settings):
        self.app = app
        self.settings = settings
        self.redis = Redis.from_url(settings.redis_url, socket_timeout=2, socket_connect_timeout=2)

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        path = scope.get('path', '')
        headers = dict(scope.get('headers', []))
        chunks, size = [], 0
        if scope.get('method') not in ('GET', 'HEAD', 'OPTIONS'):
            try:
                if int(headers.get(b'content-length', b'0')) > self.settings.max_request_bytes:
                    return await self.reject(scope, receive, send, 413, 'Request body is too large')
            except ValueError:
                return await self.reject(scope, receive, send, 400, 'Invalid Content-Length')
            while True:
                event = await receive()
                if event['type'] == 'http.disconnect':
                    return
                size += len(event.get('body', b''))
                if size > self.settings.max_request_bytes:
                    return await self.reject(scope, receive, send, 413, 'Request body is too large')
                chunks.append(event.get('body', b''))
                if not event.get('more_body', False):
                    break
        if self.settings.rate_limit_enabled and path.startswith('/api/v1/') and scope['method'] != 'OPTIONS':
            import asyncio
            is_auth = path.startswith('/api/v1/auth/')
            # Use the server's trusted client address, never arbitrary bearer
            # values (which an attacker could rotate to evade the limit).
            identity = str(scope.get('client', ('unknown',))[0]).encode()
            key = 'rate:' + ('auth:' if is_auth else 'api:') + hashlib.sha256(identity).hexdigest() + ':' + str(int(time.time()) // 60)
            try:
                count = await asyncio.to_thread(self.increment, key)
            except Exception:
                return await self.reject(scope, receive, send, 503, 'Service temporarily unavailable. Please retry.')
            limit = self.settings.auth_requests_per_minute if is_auth else self.settings.api_requests_per_minute
            if count > limit:
                return await self.reject(scope, receive, send, 429, 'Too many requests. Please retry shortly.', {'Retry-After': '60'})
        sent_body = False
        async def replay():
            nonlocal sent_body
            if chunks and not sent_body:
                sent_body = True
                return {'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}
            return await receive()
        async def guarded_send(message):
            if message['type'] == 'http.response.start':
                message['headers'] = list(message.get('headers', [])) + [(b'x-content-type-options', b'nosniff'), (b'referrer-policy', b'no-referrer')]
                if path.startswith('/api/'):
                    message['headers'].append((b'cache-control', b'no-store'))
            await send(message)
        await self.app(scope, replay if chunks else receive, guarded_send)

    def increment(self, key):
        # Atomic increment/expiry avoids keys without TTL after a process crash.
        return self.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n", 1, key)

    @staticmethod
    async def reject(scope, receive, send, status, message, headers=None):
        await JSONResponse({'error': {'code': str(status), 'message': message, 'fields': {}}}, status_code=status, headers=headers)(scope, receive, send)
