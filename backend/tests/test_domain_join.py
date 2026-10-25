from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from sqlalchemy import select

from app.auth.routes import challenge
from app.config import Settings
from app.models import Member
from tests.test_oauth_flow import configure


def login(app, client, monkeypatch, email='new@example.edu', *, verified=True, subject='new-subject'):
    verifier = 'a' * 64
    start = client.post('/api/v1/auth/start', json={'challenge': challenge(verifier)})
    state = parse_qs(urlsplit(start.json()['url']).query)['state'][0]
    monkeypatch.setattr('app.auth.routes.httpx.post', lambda *a, **k: httpx.Response(
        200, request=httpx.Request('POST', 'https://example.invalid/token'), json={'id_token': 'synthetic'}))
    monkeypatch.setattr('app.auth.routes.id_token.verify_oauth2_token', lambda *a, **k: {
        'email': email, 'email_verified': verified, 'nonce': state, 'sub': subject, 'name': 'New Staff'})
    callback = client.get('/api/v1/auth/callback', params={'state': state, 'code': 'synthetic'}, follow_redirects=False)
    if callback.status_code != 307:
        return callback
    handoff = parse_qs(urlsplit(callback.headers['location']).query)['code'][0]
    exchange = client.post('/api/v1/auth/exchange', json={'code': handoff, 'verifier': verifier})
    assert exchange.status_code == 200
    return client.get('/api/v1/me', headers={'Authorization': 'Bearer ' + exchange.json()['access_token']})


@pytest.fixture
def domain_config(app):
    config = configure(app)
    config.admin_email = 'admin@example.edu'
    config.allowed_domain = 'example.edu'
    config.domain_auto_join = True
    return config


def test_domain_member_joins_admin_workspace_as_staff(app, client, monkeypatch, domain_config):
    result = login(app, client, monkeypatch, 'NEW@EXAMPLE.EDU')
    assert result.status_code == 200, result.text
    assert result.json()['workspace_id'] == 'w1'
    assert result.json()['role'] == 'staff'
    with app.state.db() as db:
        member = db.scalar(select(Member).where(Member.email == 'new@example.edu'))
        assert member.subject == 'new-subject'
    # Repeated sign-in reuses membership, never creates a new workspace/account.
    assert login(app, client, monkeypatch).json()['id'] == result.json()['id']


@pytest.mark.parametrize('email,verified', [('outsider@elsewhere.edu', True), ('new@sub.example.edu', True), ('new@example.edu.evil.com', True), ('new@example.edu', False)])
def test_domain_join_rejects_other_domains_and_unverified_accounts(app, client, monkeypatch, domain_config, email, verified):
    assert login(app, client, monkeypatch, email, verified=verified).status_code in (400, 403)
    with app.state.db() as db:
        assert db.scalar(select(Member).where(Member.email == email)) is None


def test_removed_member_is_not_reactivated(app, client, monkeypatch, domain_config):
    with app.state.db() as db:
        db.add(Member(workspace_id='w1', email='new@example.edu', role='staff', active=False))
        db.commit()
    assert login(app, client, monkeypatch).status_code == 403


def test_auto_join_can_be_disabled(app, client, monkeypatch, domain_config):
    domain_config.domain_auto_join = False
    assert login(app, client, monkeypatch).status_code == 403


def test_auto_join_requires_active_configured_administrator(app, client, monkeypatch, domain_config):
    domain_config.admin_email = 'missing@example.edu'
    assert login(app, client, monkeypatch).status_code == 503
    with app.state.db() as db:
        assert db.scalar(select(Member).where(Member.email == 'new@example.edu')) is None


def test_auto_join_does_not_promote_staff_or_move_existing_members(app, client, monkeypatch, domain_config):
    result = login(app, client, monkeypatch, 'other@example.edu')
    assert result.status_code == 200
    assert result.json()['workspace_id'] == 'w2'
    assert result.json()['role'] == 'staff'


def test_joined_staff_cannot_manage_members_or_connect_mailbox(app, client, monkeypatch, domain_config):
    result = login(app, client, monkeypatch)
    from app.auth.sessions import issue_session
    with app.state.db() as db:
        tokens = issue_session(db, result.json()['id'])
        db.commit()
    headers = {'Authorization': 'Bearer ' + tokens['access_token']}
    assert client.post('/api/v1/workspace/members', headers=headers, json={'email': 'another@example.edu'}).status_code == 403
    assert client.post('/api/v1/mailbox/connect', headers=headers, json={'challenge': challenge('a' * 64)}).status_code == 403


def test_auto_join_requires_explicit_domain_and_admin():
    for values in ({'allowed_domain': '', 'admin_email': 'admin@example.edu'}, {'allowed_domain': 'example.edu', 'admin_email': ''}):
        with pytest.raises(ValueError):
            Settings(_env_file=None, personal_accounts=False, domain_auto_join=True, **values)
