from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import Settings
from .database import database, Base
from . import models

from contextlib import asynccontextmanager

def create_app(settings=None):
    settings=settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = None
        if settings.environment != 'test':
            import asyncio
            async def sync_loop():
                while True:
                    await asyncio.sleep(120)
                    try:
                        from .models import Mailbox
                        from .gmail.sync import run_in_process_sync
                        from sqlalchemy import select
                        with app.state.db() as session:
                            boxes = session.scalars(select(Mailbox).where(Mailbox.status != 'reconnect_required')).all()
                            for box in boxes:
                                run_in_process_sync(app.state.settings, box.id, 30)
                    except Exception:
                        pass
            # Auto-purge non-media circulars that were accidentally ingested
            try:
                import re
                from sqlalchemy import select, delete
                from .models import RequestRecord, Reminder
                with app.state.db() as session:
                    to_delete = []
                    for req in session.scalars(select(RequestRecord)).all():
                        d = req.data or {}
                        title = d.get('title', '')
                        reqs = d.get('requirements', [])
                        is_explicit = bool(re.search(r'\[media\s*request\]|\[media\]', title, re.IGNORECASE))
                        is_circular = bool(re.search(r'\bcircular\b|\budemy\b|\bfellowship\b|\bhackathon\b|\bawareness\s*pledge\b|\bstudent\s*representatives\b|\belection\b|\bchatgpt\b|\bquantumania\b', title, re.IGNORECASE))
                        if is_circular or (len(reqs) == 0 and not is_explicit):
                            to_delete.append(req.id)
                    if to_delete:
                        session.execute(delete(Reminder).where(Reminder.request_id.in_(to_delete)))
                        session.execute(delete(RequestRecord).where(RequestRecord.id.in_(to_delete)))
                        session.commit()
            except Exception:
                pass

            task = asyncio.create_task(sync_loop())
        yield
        if task:
            task.cancel()

    app=FastAPI(title='Karunya Media Desk API', version='0.1.0', lifespan=lifespan)
    app.state.settings=settings
    app.state.engine, app.state.db=database(settings.database_url)
    Base.metadata.create_all(app.state.engine)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(','), allow_methods=['*'], allow_headers=['Authorization','Content-Type'])
    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return JSONResponse({'error': {'code':str(exc.status_code),'message':str(exc.detail),'fields':{}}}, status_code=exc.status_code)
    @app.get('/health')
    def health(): return {'status':'ok'}
    @app.get('/ready')
    def ready():
        try:
            with app.state.engine.connect() as conn: conn.execute(text('SELECT 1'))
        except Exception: raise HTTPException(503,'Database unavailable')
        return {'status':'ready'}
    from .auth.routes import router as auth_router
    from .requests.routes import router as requests_router
    app.include_router(auth_router)
    app.include_router(requests_router)
    from .requests.review import router as review_router
    from .gmail.routes import router as gmail_router
    from .reminders.routes import router as reminders_router
    app.include_router(review_router)
    app.include_router(gmail_router)
    app.include_router(reminders_router)
    from .demo import router as demo_router
    app.include_router(demo_router)
    return app
