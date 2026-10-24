import pytest
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.models import Workspace, Member

@pytest.fixture
def app(tmp_path):
    app=create_app(Settings(environment='test',database_url=f'sqlite:///{tmp_path}/db',demo_enabled=True))
    with app.state.db() as db:
        w=Workspace(id='w1'); w2=Workspace(id='w2'); db.add_all([w,w2]); db.flush()
        db.add_all([Member(id='m1',workspace_id='w1',email='admin@example.edu',role='admin'),Member(id='m2',workspace_id='w2',email='other@example.edu',role='staff')]);db.commit()
    return app

@pytest.fixture
def client(app):
    with TestClient(app) as client: yield client

@pytest.fixture
def auth(app):
    from app.auth.sessions import issue_session
    with app.state.db() as db:
        tokens=issue_session(db,'m1'); db.commit()
    return {'Authorization':'Bearer '+tokens['access_token']}
