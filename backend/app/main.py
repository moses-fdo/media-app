import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, select
from redis import Redis
from .config import Settings
from .database import database, Base
from . import models
from .guards import RequestGuards

logger = logging.getLogger(__name__)


def create_app(settings=None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        task = None
        if settings.in_process_sync and settings.environment != 'test':
            async def sync_loop():
                from .gmail.sync import run_in_process_sync
                while True:
                    await asyncio.sleep(120)
                    try:
                        with app.state.db() as db:
                            ids = list(db.scalars(select(models.Mailbox.id).where(models.Mailbox.status.in_(['connected', 'error']))))
                        for mailbox_id in ids:
                            await asyncio.to_thread(run_in_process_sync, settings, mailbox_id, 30)
                    except Exception:
                        logger.exception('Development mailbox polling failed')
            task = asyncio.create_task(sync_loop())
        # Startup never classifies or deletes existing user data.
        try:
            yield
        finally:
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
            app.state.engine.dispose()

    app = FastAPI(title='Karunya Media Desk API', version='0.2.0', lifespan=lifespan)
    app.state.settings = settings
    app.state.engine, app.state.db = database(settings.database_url)
    if settings.environment != 'production':
        Base.metadata.create_all(app.state.engine)
    app.add_middleware(RequestGuards, settings=settings)
    app.add_middleware(CORSMiddleware, allow_origins=[value.strip() for value in settings.cors_origins.split(',') if value.strip()], allow_methods=['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], allow_headers=['Authorization', 'Content-Type'])

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse({'error': {'code': str(exc.status_code), 'message': str(exc.detail), 'fields': {}}}, status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(Exception)
    async def internal_error(request, exc):
        logger.error('Unhandled API error: %s', type(exc).__name__)
        return JSONResponse({'error': {'code': '500', 'message': 'Unable to complete this action. Please retry.', 'fields': {}}}, status_code=500)

    @app.get('/health')
    def health():
        return {'status': 'ok'}

    @app.get('/ready')
    def ready():
        try:
            with app.state.engine.connect() as connection:
                connection.execute(text('SELECT 1'))
                if settings.environment == 'production':
                    revision = connection.execute(text('SELECT version_num FROM alembic_version')).scalar()
                    if revision != '003':
                        raise RuntimeError('Migrations required')
            if settings.rate_limit_enabled:
                with Redis.from_url(settings.redis_url, socket_timeout=2, socket_connect_timeout=2) as queue:
                    queue.ping()
        except Exception:
            raise HTTPException(503, 'Database, migrations or queue unavailable')
        return {'status': 'ready'}

    from .auth.routes import router as auth_router
    from .requests.routes import router as requests_router
    from .requests.review import router as review_router
    from .gmail.routes import router as gmail_router
    from .reminders.routes import router as reminders_router
    from .demo import router as demo_router
    for router in (auth_router, requests_router, review_router, gmail_router, reminders_router, demo_router):
        app.include_router(router)
    return app
