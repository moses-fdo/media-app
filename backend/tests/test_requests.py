BASE={'title':'Annual Convocation','timezone':'Asia/Kolkata','event_start':'2026-10-25T10:00:00+05:30','setup_deadline':'2026-10-25T08:00:00+05:30','requirements':[{'title':'Wireless mics','department':'audio','quantity':4}]}

def test_request_edit_states_versions_and_isolation(app,client,auth):
    from app.auth.sessions import issue_session
    result=client.post('/api/v1/requests',headers=auth,json=BASE)
    assert result.status_code==201,result.text
    item=result.json(); rid=item['id']; requirement=item['requirements'][0]
    changed=client.patch(f'/api/v1/requests/{rid}',headers=auth,json={'expected_version':1,'requirements':[{**requirement,'status':'prepared'}]})
    assert changed.status_code==200,changed.text
    assert changed.json()['requirements'][0]['status']=='prepared'
    assert client.patch(f'/api/v1/requests/{rid}',headers=auth,json={'expected_version':1,'status':'completed'}).status_code==409
    completed=client.patch(f'/api/v1/requests/{rid}',headers=auth,json={'expected_version':2,'status':'completed'})
    assert completed.status_code==200
    assert len(client.get('/api/v1/requests?tab=active',headers=auth).json()['items'])==0
    assert len(client.get('/api/v1/requests?tab=completed',headers=auth).json()['items'])==1
    with app.state.db() as db:
        other=issue_session(db,'m2');db.commit()
    assert client.get(f'/api/v1/requests/{rid}',headers={'Authorization':'Bearer '+other['access_token']}).status_code==404

def test_missing_date_review_validation_and_search(client,auth):
    item=client.post('/api/v1/requests',headers=auth,json={'title':'Recording request'}).json()
    assert item['status']=='needs_review'
    assert item['setup_deadline'] is None
    assert len(client.get('/api/v1/requests?tab=needs_review&q=record',headers=auth).json()['items'])==1
    assert client.post('/api/v1/requests',headers=auth,json={**BASE,'requirements':[{'title':'Mic','quantity':-1}]}).status_code==422
    assert client.post('/api/v1/requests',headers=auth,json={**BASE,'timezone':'not/a-zone'}).status_code==422

def test_staff_cannot_manage_members(app,client):
    from app.auth.sessions import issue_session
    with app.state.db() as db:
        token=issue_session(db,'m2');db.commit()
    assert client.post('/api/v1/workspace/members',headers={'Authorization':'Bearer '+token['access_token']},json={'email':'bad@example.edu'}).status_code==403
    assert client.post('/api/v1/workspace/data/purge',headers={'Authorization':'Bearer '+token['access_token']}).status_code==403

def test_admin_can_purge_workspace_data(client,auth):
    client.post('/api/v1/requests',headers=auth,json=BASE)
    assert len(client.get('/api/v1/requests',headers=auth).json()['items'])>=1
    res=client.post('/api/v1/workspace/data/purge',headers=auth)
    assert res.status_code==200 and res.json()['purged'] is True
    assert len(client.get('/api/v1/requests',headers=auth).json()['items'])==0
