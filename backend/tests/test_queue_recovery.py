from copy import deepcopy
from sqlalchemy import select
from app.models import Mailbox, Member, Device, SessionToken


def connected_box(app):
    app.state.settings.demo_enabled=False
    app.state.settings.in_process_sync=False
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='synthetic',history_id='checkpoint')
        db.add(box);db.commit();return box.id


def test_queue_outage_is_reported_without_losing_backfill_checkpoint(app,client,auth,monkeypatch):
    box_id=connected_box(app)
    def unavailable(*args,**kwargs):raise ConnectionError('offline')
    monkeypatch.setattr('app.jobs.tasks.sync_one.delay',unavailable)
    assert client.post('/api/v1/mailbox/sync',headers=auth).status_code==503
    assert client.post('/api/v1/mailbox/backfill',headers=auth).status_code==503
    with app.state.db() as db:assert db.get(Mailbox,box_id).history_id=='checkpoint'


def test_demo_never_starts_real_gmail_jobs(client,auth):
    assert client.post('/api/v1/mailbox/sync',headers=auth).status_code==409
    assert client.post('/api/v1/mailbox/backfill',headers=auth).status_code==409


def test_removed_staff_can_be_reauthorized_without_reviving_old_sessions(app,client,auth):
    from app.auth.sessions import issue_session
    app.state.settings.allowed_domain=''
    with app.state.db() as db:
        staff=Member(workspace_id='w1',email='returning@example.edu',name='Returning Staff',role='staff');db.add(staff);db.flush()
        tokens=issue_session(db,staff.id)
        device=Device(member_id=staff.id,token='ExpoPushToken[returning]');db.add(device);db.commit();staff_id=staff.id
    assert client.delete('/api/v1/workspace/members/'+staff_id,headers=auth).status_code==200
    assert client.post('/api/v1/workspace/members',headers=auth,json={'email':'returning@example.edu','name':'Returning Staff','role':'staff'}).status_code==201
    assert client.get('/api/v1/me',headers={'Authorization':'Bearer '+tokens['access_token']}).status_code==401
    with app.state.db() as db:
        assert db.get(Member,staff_id).active
        assert not db.scalar(select(Device).where(Device.member_id==staff_id)).active


def test_logout_deactivates_push_devices(app,client,auth):
    with app.state.db() as db:
        db.add(Device(member_id='m1',token='ExpoPushToken[logout]'));db.commit()
    assert client.post('/api/v1/auth/logout',headers=auth).status_code==200
    with app.state.db() as db:
        assert not db.scalar(select(Device).where(Device.member_id=='m1')).active
