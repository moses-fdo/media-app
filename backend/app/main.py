from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .config import Settings
from .database import database, Base
from . import models

def create_app(settings=None):
    settings=settings or Settings()
    app=FastAPI(title='Karunya Media Desk API', version='0.1.0')
    app.state.settings=settings
    app.state.engine, app.state.db=database(settings.database_url)
    if settings.environment in ('test','development'):
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
