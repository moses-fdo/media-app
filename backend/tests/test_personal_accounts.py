from urllib.parse import parse_qs, urlsplit
import httpx
import pytest
from sqlalchemy import select
from cryptography.fernet import Fernet
from app.auth.routes import challenge
from app.auth.sessions import issue_session, digest
from app.models import Member, Workspace, Mailbox, SessionToken, Device
from tests.test_oauth_flow import configure

GMAIL = 'https://www.googleapis.com/auth/gmail.readonly'

@pytest.fixture
def personal(app):
    config = configure(app)
    config.personal_accounts = True
    # Old deployment values must not restrict private account sign-in.
    config.allowed_domain = 'example.edu'
    config.domain_auto_join = True
    return config


def sign_in(client, monkeypatch, email='one@gmail.com', subject='google-one', *, refresh='private-refresh', scope=GMAIL, headers=None, path='/auth/start'):
    verifier = 'a' * 64
    start = client.post('/api/v1' + path, json={'challenge': challenge(verifier)}, headers=headers or {})
    assert start.status_code == 200, start.text
    state = parse_qs(urlsplit(start.json()['url']).query)['state'][0]
    payload = {'id_token': 'synthetic', 'scope': 'openid email profile ' + scope}
    if refresh: payload['refresh_token'] = refresh
    monkeypatch.setattr('app.auth.routes.httpx.post', lambda *a, **k: httpx.Response(200, request=httpx.Request('POST','https://example.invalid'), json=payload))
    monkeypatch.setattr('app.auth.routes.id_token.verify_oauth2_token', lambda *a, **k: {'email': email, 'email_verified': True, 'sub': subject, 'nonce': state, 'name': 'Account Owner'})
    result = client.get('/api/v1/auth/callback', params={'state':state,'code':'synthetic'}, follow_redirects=False)
    if result.status_code != 307: return result, None
    code = parse_qs(urlsplit(result.headers['location']).query)['code'][0]
    exchange = client.post('/api/v1/auth/exchange',json={'code':code,'verifier':verifier})
    assert exchange.status_code == 200, exchange.text
    auth = {'Authorization':'Bearer ' + exchange.json()['access_token']}
    return client.get('/api/v1/me',headers=auth), auth


def test_sign_in_requests_read_only_gmail_in_one_flow(client, personal):
    result = client.post('/api/v1/auth/start',json={'challenge':challenge('a'*64)})
    params = parse_qs(urlsplit(result.json()['url']).query)
    assert GMAIL in params['scope'][0].split()
    assert params['access_type'] == ['offline']
    assert 'consent' in params['prompt'][0]
    assert 'hd' not in params


def test_new_people_get_private_inboxes_and_cannot_read_each_others_events(app, client, monkeypatch, personal):
    first, auth1 = sign_in(client, monkeypatch)
    second, auth2 = sign_in(client, monkeypatch, 'two@gmail.com', 'google-two')
    assert first.status_code == second.status_code == 200
    assert first.json()['account_mode'] == 'personal'
    assert first.json()['role'] == 'user'
    assert first.json()['workspace_id'] != second.json()['workspace_id']
    event = client.post('/api/v1/requests',headers=auth1,json={'title':'Private event'}).json()
    assert client.get('/api/v1/requests/'+event['id'],headers=auth2).status_code == 404
    assert client.get('/api/v1/requests',headers=auth2).json()['items'] == []
    assert client.get('/api/v1/mailbox/status',headers=auth1).json()['email'] == 'one@gmail.com'
    assert client.get('/api/v1/mailbox/status',headers=auth2).json()['email'] == 'two@gmail.com'
    with app.state.db() as db:
        box = db.scalar(select(Mailbox).where(Mailbox.workspace_id == first.json()['workspace_id']))
        assert box.encrypted_token != 'private-refresh'
        assert Fernet(personal.encryption_key.encode()).decrypt(box.encrypted_token.encode()) == b'private-refresh'


def test_existing_shared_account_is_separated_without_moving_shared_records(app, client, monkeypatch, personal):
    from app.requests.service import create_request
    with app.state.db() as db:
        member = db.get(Member,'m1'); member.subject = 'old-google'
        old = issue_session(db,member.id)
        record = create_request(db,'w1',{'title':'Earlier shared event'})
        record_id = record.id
        db.add(Device(member_id=member.id,token='ExpoPushToken[old]',active=True))
        db.commit()
    old_auth = {'Authorization':'Bearer '+old['access_token']}
    assert client.get('/api/v1/requests',headers=old_auth).status_code == 401
    me, auth = sign_in(client,monkeypatch,'admin@example.edu','old-google')
    assert me.status_code == 200, me.text
    assert me.json()['workspace_id'] != 'w1'
    assert client.get('/api/v1/requests/'+record_id,headers=auth).status_code == 404
    with app.state.db() as db:
        from app.models import RequestRecord
        assert db.get(RequestRecord,record_id).workspace_id == 'w1'
        assert all(row.revoked for row in db.scalars(select(SessionToken).where(SessionToken.token_hash.in_([digest(old['access_token']),digest(old['refresh_token'])]))))
        assert db.scalar(select(Device).where(Device.member_id=='m1')).active is False


@pytest.mark.parametrize('scope,refresh', [('', 'refresh'),(GMAIL,None)])
def test_missing_permission_or_offline_token_does_not_create_account(app,client,monkeypatch,personal,scope,refresh):
    result, _ = sign_in(client,monkeypatch,scope=scope,refresh=refresh)
    assert result.status_code == 400
    with app.state.db() as db:
        assert db.scalar(select(Member).where(Member.email=='one@gmail.com')) is None


def test_repeated_sign_in_reuses_private_account_and_can_keep_existing_token(app,client,monkeypatch,personal):
    first, _ = sign_in(client,monkeypatch)
    second, _ = sign_in(client,monkeypatch,refresh=None)
    assert second.status_code == 200
    assert first.json()['workspace_id'] == second.json()['workspace_id']
    assert first.json()['id'] == second.json()['id']


def test_reconnect_cannot_attach_someone_elses_inbox(client,monkeypatch,personal):
    _, auth = sign_in(client,monkeypatch)
    result, _ = sign_in(client,monkeypatch,'two@gmail.com','google-two',path='/mailbox/connect',headers=auth)
    assert result.status_code == 403
    assert client.get('/api/v1/mailbox/status',headers=auth).json()['email'] == 'one@gmail.com'


def test_owner_can_manage_own_gmail_but_no_membership_endpoints(client,monkeypatch,personal):
    _, auth = sign_in(client,monkeypatch)
    assert client.get('/api/v1/workspace/members',headers=auth).status_code == 403
    assert client.post('/api/v1/workspace/members',headers=auth,json={'email':'other@gmail.com'}).status_code == 403
    assert client.get('/api/v1/mailbox/excluded',headers=auth).status_code == 200
    assert client.post('/api/v1/workspace/data/purge',headers=auth).status_code == 200
    monkeypatch.setattr('app.gmail.routes.httpx.post',lambda *a,**k:httpx.Response(200))
    assert client.post('/api/v1/mailbox/disconnect',headers=auth).status_code == 200
    assert client.get('/api/v1/mailbox/status',headers=auth).json()['status'] == 'reconnect_required'


def test_personal_production_configuration_does_not_require_shared_account_settings():
    from app.config import Settings
    config = Settings(_env_file=None, environment='production', personal_accounts=True,
                      database_url='postgresql://test:test@localhost/test',
                      encryption_key=Fernet.generate_key().decode(), google_client_id='test',
                      google_client_secret='test', google_redirect_uri='https://api.example.com/api/v1/auth/callback',
                      cors_origins='https://app.example.com', admin_email='', domain_auto_join=True, allowed_domain='')
    assert config.personal_accounts is True


def test_old_shared_refresh_session_cannot_create_usable_personal_access(app, client, personal):
    with app.state.db() as db:
        tokens = issue_session(db,'m1'); db.commit()
    result = client.post('/api/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']})
    assert result.status_code == 401


def test_personal_schema_migrates_existing_002_database(tmp_path):
    import os, subprocess, sys
    from pathlib import Path
    from sqlalchemy import create_engine, inspect, text
    url = 'sqlite:///' + str(tmp_path / 'migration.db')
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE workspaces (id VARCHAR PRIMARY KEY, name VARCHAR, timezone VARCHAR)'))
        conn.execute(text("INSERT INTO workspaces VALUES ('old', 'Previous events', 'Asia/Kolkata')"))
        conn.execute(text('CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)'))
        conn.execute(text("INSERT INTO alembic_version VALUES ('002')"))
    env = {**os.environ, 'ENVIRONMENT':'test','DATABASE_URL':url,'PERSONAL_ACCOUNTS':'true'}
    subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=Path(__file__).parents[1],env=env,check=True,capture_output=True)
    assert 'owner_subject' in {column['name'] for column in inspect(engine).get_columns('workspaces')}
    with engine.connect() as conn:
        assert conn.execute(text('SELECT version_num FROM alembic_version')).scalar() == '003'
        assert conn.execute(text("SELECT name FROM workspaces WHERE id='old'")).scalar() == 'Previous events'
    engine.dispose()


def test_private_mode_does_not_poll_previous_shared_mailbox(app,monkeypatch,personal):
    from app.gmail.sync import run_in_process_sync
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='old@example.edu',encrypted_token='old-token',status='connected')
        db.add(box);db.commit();box_id=box.id
    run_in_process_sync(personal,box_id)
    with app.state.db() as db:
        box=db.get(Mailbox,box_id)
        assert box.status=='connected'
        assert box.error is None


def test_queued_shared_extraction_is_not_resumed_in_private_mode(app,monkeypatch,personal):
    from app.jobs import tasks
    from app.models import Message
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='old@example.edu',encrypted_token='old-token',status='connected')
        db.add(box);db.flush()
        message=Message(workspace_id='w1',mailbox_id=box.id,provider_id='old',thread_id='old',subject='[MEDIA REQUEST] Example',body='Earlier message',status='queued')
        db.add(message);db.commit();message_id=message.id
    monkeypatch.setattr(tasks,'resources',lambda:(personal,app.state.engine,app.state.db))
    tasks.extract_one.run(message_id)
    with app.state.db() as db:
        assert db.get(Message,message_id).status=='queued'


def test_google_identity_keeps_events_when_account_email_changes(client,monkeypatch,personal):
    first, auth = sign_in(client,monkeypatch)
    event=client.post('/api/v1/requests',headers=auth,json={'title':'My event'}).json()
    renamed, new_auth = sign_in(client,monkeypatch,'renamed@gmail.com','google-one')
    assert renamed.status_code==200
    assert renamed.json()['id']==first.json()['id']
    assert renamed.json()['workspace_id']==first.json()['workspace_id']
    assert client.get('/api/v1/requests/'+event['id'],headers=new_auth).status_code==200
    assert client.get('/api/v1/mailbox/status',headers=new_auth).json()['email']=='renamed@gmail.com'
