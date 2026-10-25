import pytest
from fastapi.testclient import TestClient
from tests.test_release_guards import production_settings


def test_explicit_local_browser_origin_is_accepted_without_weakening_public_origins():
    config=production_settings(local_browser_origins='http://localhost:8081')
    assert 'http://localhost:8081' in config.browser_origins
    assert config.valid_client_redirect('http://localhost:8081/sign-in')
    assert not config.valid_client_redirect('http://localhost:8082/sign-in')
    assert not config.valid_client_redirect('http://localhost.evil.com:8081/sign-in')


@pytest.mark.parametrize('origin',[
    '*', 'http://0.0.0.0:8081', 'http://192.168.1.10:8081',
    'http://localhost.evil.com:8081', 'http://localhost:8081/sign-in',
    'http://localhost:8081/', 'http://localhost:8081?redirect=evil',
    'http://localhost:8081#x', 'http://user:password@localhost:8081',
    'http://localhost', 'file://localhost:8081',
])
def test_local_browser_option_accepts_only_exact_loopback_origins(origin):
    with pytest.raises(ValueError):
        production_settings(local_browser_origins=origin)


def test_google_callback_must_still_be_public_https_with_local_browser_enabled():
    with pytest.raises(ValueError):
        production_settings(local_browser_origins='http://localhost:8081',google_redirect_uri='http://localhost:8000/api/v1/auth/callback')
    with pytest.raises(ValueError):
        production_settings(local_browser_origins='http://localhost:8081',cors_origins='http://localhost:8081')


def test_local_browser_preflight_and_oauth_redirect_work_together(app,client):
    config=app.state.settings
    config.local_browser_origins='http://localhost:8081'
    config.cors_origins='https://app.example.edu'
    config.google_client_id='synthetic';config.google_client_secret='synthetic'
    # Middleware captures its origin list at construction, just as after redeploy.
    from app.main import create_app
    with TestClient(create_app(config)) as browser:
        response=browser.options('/api/v1/auth/start',headers={
            'Origin':'http://localhost:8081',
            'Access-Control-Request-Method':'POST',
            'Access-Control-Request-Headers':'content-type',
        })
        assert response.status_code==200
        assert response.headers['access-control-allow-origin']=='http://localhost:8081'
        start=browser.post('/api/v1/auth/start',json={'challenge':'a'*43,'redirect_uri':'http://localhost:8081/sign-in'},headers={'Origin':'http://localhost:8081'})
        assert start.status_code==200
        assert start.headers['access-control-allow-origin']=='http://localhost:8081'
        rejected=browser.options('/api/v1/auth/start',headers={
            'Origin':'http://localhost:8082',
            'Access-Control-Request-Method':'POST',
        })
        assert rejected.status_code==400
        assert 'access-control-allow-origin' not in rejected.headers
