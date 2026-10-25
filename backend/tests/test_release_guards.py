from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from cryptography.fernet import Fernet
from sqlalchemy import select
import pytest
from app.config import Settings
from app.guards import RequestGuards
from app.models import RequestRecord, Reminder, Device
from app.requests.service import create_request


def production_settings(**changes):
    values = dict(_env_file=None, environment='production', database_url='postgresql://local:local@localhost/audit', redis_url='redis://localhost:6379/0', encryption_key=Fernet.generate_key().decode(), admin_email='admin@example.edu', google_client_id='synthetic', google_client_secret='synthetic', google_redirect_uri='https://api.example.edu/api/v1/auth/callback', cors_origins='https://app.example.edu', demo_enabled=False)
    return Settings(**{**values, **changes})


@pytest.mark.parametrize('changes',[
    {'demo_enabled':True}, {'encryption_key':'published-placeholder'},
    {'cors_origins':'*'}, {'cors_origins':'http://localhost:8082'},
    {'google_redirect_uri':'http://api.example.edu/callback'},
    {'google_client_secret':''}, {'in_process_sync':True},
    {'rate_limit_enabled':False}, {'database_url':'sqlite://'},
])
def test_production_rejects_unsafe_configuration(changes):
    with pytest.raises(ValueError):production_settings(**changes)


def test_production_defaults_use_workers_and_limits():
    config=production_settings()
    assert config.in_process_sync is False
    assert config.rate_limit_enabled is True


@pytest.mark.parametrize('redirect',['https://evil.example/callback','mediaops://evil','https://localhost:8082/','https://good.example@evil.example/','mediaops://auth?redirect=https://evil.example'])
def test_oauth_rejects_unapproved_redirect_before_contacting_google(app,client,redirect):
    app.state.settings.google_client_id='synthetic'
    app.state.settings.google_client_secret='synthetic'
    response=client.post('/api/v1/auth/start',json={'challenge':'a'*43,'redirect_uri':redirect})
    assert response.status_code==400


def test_oauth_accepts_configured_app_origin(app,client):
    app.state.settings.google_client_id='synthetic';app.state.settings.google_client_secret='synthetic'
    response=client.post('/api/v1/auth/start',json={'challenge':'a'*43,'redirect_uri':'http://localhost:8082/settings/mailbox'})
    assert response.status_code==200
    assert response.json()['url'].startswith('https://accounts.google.com/')


def test_startup_keeps_requests_regardless_of_title(app):
    with app.state.db() as db:
        record=create_request(db,'w1',{'title':'Hackathon and ChatGPT workshop support'})
        rid=record.id;db.commit()
    app.state.settings.environment='development'
    app.state.settings.in_process_sync=False
    with TestClient(app):
        with app.state.db() as db:assert db.get(RequestRecord,rid) is not None


def test_oversized_body_is_rejected(app,client,auth):
    app.state.settings.max_request_bytes=1024
    assert client.post('/api/v1/requests',headers=auth,json={'title':'x','summary':'x'*2000}).status_code==413


def test_distributed_limit_is_enforced_and_reports_retry_after(app,client,monkeypatch):
    count=[0]
    def increment(self,key):
        count[0]+=1
        return count[0]
    monkeypatch.setattr(RequestGuards,'increment',increment)
    app.state.settings.rate_limit_enabled=True;app.state.settings.auth_requests_per_minute=2
    app.state.settings.google_client_id=''
    for _ in range(2):assert client.post('/api/v1/auth/start',json={'challenge':'a'*43}).status_code==503
    result=client.post('/api/v1/auth/start',json={'challenge':'a'*43})
    assert result.status_code==429
    assert result.headers['retry-after']=='60'


def test_failed_limiter_does_not_allow_unbounded_authentication(app,client,monkeypatch):
    def unavailable(self,key):raise ConnectionError('queue unavailable')
    monkeypatch.setattr(RequestGuards,'increment',unavailable)
    app.state.settings.rate_limit_enabled=True
    assert client.post('/api/v1/auth/start',json={'challenge':'a'*43}).status_code==503


def test_empty_notification_preferences_rejected(client,auth):
    assert client.put('/api/v1/reminder-preferences',headers=auth,json={'offsets':[]}).status_code==422


def test_interrupted_reminder_is_recovered_and_invalid_device_disabled(app,monkeypatch):
    from app.reminders.delivery import deliver_due_reminders
    from app.reminders.service import schedule_request_reminders
    import httpx
    now=datetime.now(timezone.utc)
    with app.state.db() as db:
        start=(now+timedelta(days=3)).isoformat()
        record=create_request(db,'w1',{'title':'Future','venue':'Hall','requirements':[{'title':'Mic','quantity':1}],'status':'confirmed','event_start':start,'setup_deadline':start})
        schedule_request_reminders(db,record);db.flush()
        reminder=db.scalar(select(Reminder));reminder.status='sending';reminder.claimed_at=(now-timedelta(minutes=10)).isoformat();reminder.due=(now-timedelta(minutes=20)).isoformat();reminder.attempts=1
        device=Device(member_id='m1',token='ExpoPushToken[synthetic]');db.add(device);db.commit()
        monkeypatch.setattr('app.reminders.delivery.httpx.post',lambda *a,**k:httpx.Response(200,request=httpx.Request('POST','https://example.invalid'),json={'data':[{'status':'error','details':{'error':'DeviceNotRegistered'}}]}))
        deliver_due_reminders(db,now)
        assert reminder.status=='failed'
        assert device.active is False


def test_legacy_empty_proposal_fields_cannot_erase_data(app,client,auth):
    from copy import deepcopy
    from tests.test_requests import BASE
    record=client.post('/api/v1/requests',headers=auth,json=BASE).json()
    with app.state.db() as db:
        row=db.get(RequestRecord,record['id']);data=deepcopy(row.data)
        data['proposed_updates']=[{'id':'legacy','changes':{'venue':'Another Hall','event_start':None,'requirements':[],'title':''}}]
        row.data=data;db.commit()
    result=client.post(f'/api/v1/requests/{record["id"]}/proposals/legacy/accept',headers=auth,json={'expected_version':record['version']})
    assert result.status_code==200,result.text
    assert result.json()['event_start']==record['event_start']
    assert result.json()['requirements']==record['requirements']
