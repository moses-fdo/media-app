def test_refresh_replay_revokes_family(app,client):
    from app.auth.sessions import issue_session
    with app.state.db() as db:
        tokens=issue_session(db,'m1'); db.commit()
    first=client.post('/api/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']})
    assert first.status_code==200
    assert client.post('/api/v1/auth/refresh',json={'refresh_token':tokens['refresh_token']}).status_code==401
    assert client.get('/api/v1/me',headers={'Authorization':'Bearer '+first.json()['access_token']}).status_code==401

def test_member_removal_revokes_access(app,client,auth):
    from app.models import Member
    assert client.get('/api/v1/me',headers=auth).status_code==200
    with app.state.db() as db:
        db.get(Member,'m1').active=False;db.commit()
    assert client.get('/api/v1/me',headers=auth).status_code==401

def test_oauth_invalid_callback_and_unconfigured_start(app,client):
    assert client.get('/api/v1/auth/callback?state=invalid&code=bad').status_code==400
    app.state.settings.google_client_id = ''
    assert client.post('/api/v1/auth/start',json={'challenge':'a'*43}).status_code==503
