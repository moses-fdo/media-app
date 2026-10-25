"""Optional real PostgreSQL/Redis/Celery check; CI supplies isolated services."""
import os
import subprocess
import sys
import time
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.config import Settings
from app.main import create_app
from app.models import Workspace, Member, Mailbox, Message, RequestRecord, Reminder
from app.auth.sessions import issue_session
from app.extraction.provider import ExtractionProvider
from app.extraction.service import process_message
from tests.test_production_workflows import TEMPLATE


@pytest.mark.skipif(not os.getenv('TEST_DATABASE_URL'),reason='Set TEST_DATABASE_URL and TEST_REDIS_URL for isolated service integration')
def test_migrations_real_parser_review_and_celery_retention():
    root=Path(__file__).parents[1]
    url=os.environ['TEST_DATABASE_URL']
    redis_url=os.environ['TEST_REDIS_URL']
    environment={**os.environ,'ENVIRONMENT':'test','DATABASE_URL':url,'REDIS_URL':redis_url,'DEMO_ENABLED':'false','IN_PROCESS_SYNC':'false','RATE_LIMIT_ENABLED':'false'}
    subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=root,env=environment,check=True,capture_output=True)
    config=Settings(_env_file=None,personal_accounts=False,environment='production',database_url=url,redis_url=redis_url,encryption_key=Fernet.generate_key().decode(),admin_email='admin@example.edu',google_client_id='synthetic',google_client_secret='synthetic',google_redirect_uri='https://api.example.edu/api/v1/auth/callback',cors_origins='https://app.example.edu',demo_enabled=False)
    app=create_app(config)
    with app.state.db() as db:
        workspace=Workspace(name='Service integration');db.add(workspace);db.flush()
        member=Member(workspace_id=workspace.id,email=f'integration-{uuid4().hex}@example.edu',role='admin');db.add(member)
        box=Mailbox(workspace_id=workspace.id,email='synthetic@example.edu',encrypted_token='synthetic',status='reconnect_required');db.add(box);db.flush()
        message=Message(workspace_id=workspace.id,mailbox_id=box.id,provider_id='integration-initial',thread_id='integration-thread',subject='[MEDIA REQUEST] Chapel Service',body=TEMPLATE,attachments=[]);db.add(message);db.commit()
        process_message(db,message,ExtractionProvider(config))
        record=db.scalar(select(RequestRecord).where(RequestRecord.workspace_id==workspace.id));rid=record.id
        tokens=issue_session(db,member.id);db.commit()
        followup=Message(workspace_id=workspace.id,mailbox_id=box.id,provider_id='concurrent-reply',thread_id='integration-thread',subject='Re: [MEDIA REQUEST] Chapel Service',body='Venue: Updated Hall',attachments=[])
        db.add(followup);db.commit();followup_id=followup.id
    barrier=Barrier(2)
    def process_concurrently():
        with app.state.db() as db:
            message=db.get(Message,followup_id)
            barrier.wait(timeout=10)
            process_message(db,message,ExtractionProvider(config))
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures=[executor.submit(process_concurrently) for _ in range(2)]
        for future in futures:future.result(timeout=20)
    with TestClient(app) as client:
        assert client.get('/ready').status_code==200
        auth={'Authorization':'Bearer '+tokens['access_token']}
        record=client.get('/api/v1/requests/'+rid,headers=auth).json()
        assert record['status']=='new'
        assert len(record['requirements'])==3
        assert len(record['proposed_updates'])==1
        proposed=record['proposed_updates'][0]
        accepted=client.post(f'/api/v1/requests/{rid}/proposals/{proposed["id"]}/accept',headers=auth,json={'expected_version':record['version']})
        assert accepted.status_code==200,accepted.text
        record=accepted.json()
        assert record['venue']=='Updated Hall'
        confirmed=client.patch('/api/v1/requests/'+rid,headers=auth,json={'expected_version':record['version'],'status':'confirmed'})
        assert confirmed.status_code==200,confirmed.text
        with app.state.db() as db:
            assert len(list(db.scalars(select(Reminder).where(Reminder.request_id==rid))))==2
            message=db.get(Message,message.id);message.received_at=(datetime.now(timezone.utc)-timedelta(days=100)).isoformat();db.commit()
    # A new app process must retain the confirmed event.
    restarted=create_app(config)
    with TestClient(restarted) as client:
        assert client.get('/api/v1/requests/'+rid,headers=auth).json()['status']=='confirmed'
        log_path=root.parent/'build'/'celery-integration.log'
        log_path.parent.mkdir(exist_ok=True)
        with log_path.open('w') as log:
            worker=subprocess.Popen([sys.executable,'-m','celery','-A','app.jobs.celery_app','worker','--pool=solo','--concurrency=1','--loglevel=warning'],cwd=root,env=environment,stdout=log,stderr=log)
            try:
                # Publish through the real broker; do not call the task function.
                publish=subprocess.run([sys.executable,'-c',"from app.jobs.tasks import retention; retention.delay()"],cwd=root,env=environment,capture_output=True,timeout=20)
                assert publish.returncode==0,publish.stderr.decode()
                deadline=time.monotonic()+30
                expired=False
                while time.monotonic()<deadline:
                    with restarted.state.db() as db:
                        expired=db.get(Message,message.id).body=='Source expired under retention policy'
                    if expired:break
                    if worker.poll() is not None:break
                    time.sleep(0.2)
                assert expired,'Celery retention task did not complete; inspect build/celery-integration.log'
            finally:
                worker.terminate()
                try:worker.wait(timeout=10)
                except subprocess.TimeoutExpired:worker.kill();worker.wait(timeout=10)
