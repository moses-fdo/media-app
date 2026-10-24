def test_demo_is_explicit_and_populates_requests(client):
    r=client.post('/api/v1/auth/demo')
    assert r.status_code==200
    auth={'Authorization':'Bearer '+r.json()['access_token']}
    assert client.get('/api/v1/me',headers=auth).json()['demo'] is True
    page=client.get('/api/v1/requests',headers=auth).json()
    assert len(page['items'])>=3
    assert all(x['title'] for x in page['items'])

def test_demo_disabled_by_default(tmp_path):
    from app.main import create_app
    from app.config import Settings
    from fastapi.testclient import TestClient
    with TestClient(create_app(Settings(environment='test',database_url=f'sqlite:///{tmp_path}/prod.db',demo_enabled=False))) as client:
        assert client.post('/api/v1/auth/demo').status_code==404
