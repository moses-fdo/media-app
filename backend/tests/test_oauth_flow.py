from urllib.parse import urlsplit, parse_qs
from cryptography.fernet import Fernet
import httpx
from sqlalchemy import select
from app.auth.routes import challenge
from app.models import Mailbox


def configure(app):
    config=app.state.settings
    config.google_client_id='synthetic-client'
    config.google_client_secret='synthetic-secret'
    config.encryption_key=Fernet.generate_key().decode()
    config.allowed_domain=''
    return config


def google_response(monkeypatch,state,*,scope='openid email profile',refresh='synthetic-refresh'):
    payload={'id_token':'synthetic-id-token','access_token':'synthetic-google-access','scope':scope}
    if refresh:payload['refresh_token']=refresh
    monkeypatch.setattr('app.auth.routes.httpx.post',lambda *a,**k:httpx.Response(200,request=httpx.Request('POST','https://example.invalid/token'),json=payload))
    monkeypatch.setattr('app.auth.routes.id_token.verify_oauth2_token',lambda *a,**k:{'email':'admin@example.edu','email_verified':True,'nonce':state,'sub':'synthetic-subject','name':'Admin'})


def test_google_login_pkce_exchange_and_replay_protection(app,client,monkeypatch):
    configure(app)
    verifier='a'*64
    start=client.post('/api/v1/auth/start',json={'challenge':challenge(verifier),'redirect_uri':'mediaops://auth'})
    state=parse_qs(urlsplit(start.json()['url']).query)['state'][0]
    google_response(monkeypatch,state)
    callback=client.get('/api/v1/auth/callback',params={'state':state,'code':'synthetic-google-code'},follow_redirects=False)
    assert callback.status_code==307
    handoff=parse_qs(urlsplit(callback.headers['location']).query)['code'][0]
    assert 'access_token' not in callback.headers['location']
    assert client.post('/api/v1/auth/exchange',json={'code':handoff,'verifier':'b'*64}).status_code==400
    exchanged=client.post('/api/v1/auth/exchange',json={'code':handoff,'verifier':verifier})
    assert exchanged.status_code==200
    assert client.get('/api/v1/me',headers={'Authorization':'Bearer '+exchanged.json()['access_token']}).status_code==200
    assert client.post('/api/v1/auth/exchange',json={'code':handoff,'verifier':verifier}).status_code==400
    assert client.get('/api/v1/auth/callback',params={'state':state,'code':'synthetic-google-code'},follow_redirects=False).status_code==400


def test_mailbox_connection_requires_scope_and_encrypts_refresh_token(app,client,auth,monkeypatch):
    config=configure(app)
    verifier='a'*64
    start=client.post('/api/v1/mailbox/connect',headers=auth,json={'challenge':challenge(verifier)})
    state=parse_qs(urlsplit(start.json()['url']).query)['state'][0]
    google_response(monkeypatch,state,scope='openid email profile https://www.googleapis.com/auth/gmail.readonly')
    response=client.get('/api/v1/auth/callback',params={'state':state,'code':'synthetic-google-code'},follow_redirects=False)
    assert response.status_code==307
    with app.state.db() as db:
        box=db.scalar(select(Mailbox).where(Mailbox.workspace_id=='w1'))
        assert box.status=='connected'
        assert box.encrypted_token!='synthetic-refresh'
        assert Fernet(config.encryption_key.encode()).decrypt(box.encrypted_token.encode()).decode()=='synthetic-refresh'


def test_mailbox_rejects_missing_gmail_permission(app,client,auth,monkeypatch):
    configure(app)
    start=client.post('/api/v1/mailbox/connect',headers=auth,json={'challenge':challenge('a'*64)})
    state=parse_qs(urlsplit(start.json()['url']).query)['state'][0]
    google_response(monkeypatch,state)
    result=client.get('/api/v1/auth/callback',params={'state':state,'code':'synthetic-google-code'},follow_redirects=False)
    assert result.status_code==400
    with app.state.db() as db:
        assert db.scalar(select(Mailbox).where(Mailbox.workspace_id=='w1')) is None
