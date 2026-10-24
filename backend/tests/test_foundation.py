from fastapi.testclient import TestClient

def test_health_ready_and_persistence(tmp_path):
    from app.main import create_app
    from app.config import Settings
    config = Settings(database_url=f"sqlite:///{tmp_path}/test.db", environment="test")
    app = create_app(config)
    with TestClient(app) as client:
        assert client.get('/health').status_code == 200
        assert client.get('/ready').status_code == 200
        assert client.get('/api/v1/requests').status_code == 401
    with TestClient(create_app(config)) as client:
        assert client.get('/ready').status_code == 200

def test_production_rejects_demo_and_weak_configuration():
    from app.config import Settings
    import pytest
    with pytest.raises(ValueError):
        Settings(environment="production", demo_enabled=True)


def test_in_memory_database_shared_across_request_threads():
    from app.main import create_app
    from app.config import Settings
    with TestClient(create_app(Settings(environment='test',database_url='sqlite://',demo_enabled=True))) as client:
        assert client.post('/api/v1/auth/demo').status_code == 200
