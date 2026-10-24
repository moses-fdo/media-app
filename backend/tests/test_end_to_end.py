from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app
from app.models import Mailbox, Message, RequestRecord, Reminder
from app.gmail.sync import sync_mailbox
from app.extraction.service import process_message
from app.extraction.schemas import AnalysisResult
from app.auth.sessions import issue_session

class MockGmail:
    def profile(self): return {'historyId': '101'}
    def list_messages(self, page_token=None, days=30):
        return {'messages': [{'id': 'msg-1'}]}
    def get_message(self, id):
        return {
            'id': id,
            'threadId': 'th-1',
            'internalDate': '1792895400000',
            'labelIds': ['INBOX'],
            'payload': {
                'mimeType': 'text/plain',
                'headers': [
                    {'name': 'Subject', 'value': 'AV Request: Annual Commencement'},
                    {'name': 'From', 'value': 'provost@example.edu'}
                ],
                'body': {'data': 'UGxlYXNlIHByb3ZpZGUgNCBtaWNyb3Bob25lcyBhbmQgMSBwcm9qZWN0b3IgZm9yIENvbW1lbmNlbWVudC4='}
            }
        }
    def list_history(self, start, page_token=None):
        return {'history': [], 'historyId': '102'}

class MockExtractor:
    def analyze(self, message):
        start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(microsecond=0)
        setup = start - timedelta(hours=2)
        return AnalysisResult(
            classification='request',
            events=[{
                'title': 'Annual Commencement',
                'organizer': 'Provost Office',
                'venue': 'Main Quad',
                'event_start': start.isoformat(),
                'setup_deadline': setup.isoformat(),
                'timezone': 'Asia/Kolkata',
                'requirements': [
                    {'title': 'Wireless microphones', 'department': 'audio', 'quantity': 4},
                    {'title': 'Projector', 'department': 'video', 'quantity': 1}
                ],
                'sources': [message.id]
            }]
        )

def test_full_pipeline_end_to_end(tmp_path):
    db_path = f"sqlite:///{tmp_path}/e2e.db"
    settings = Settings(environment="test", database_url=db_path, demo_enabled=True)
    app = create_app(settings)

    with app.state.db() as db:
        # Seed workspace and member
        from app.models import Workspace, Member
        w = Workspace(name='Test Workspace', timezone='Asia/Kolkata')
        db.add(w)
        db.flush()
        m = Member(workspace_id=w.id, email='admin@example.edu', role='admin', name='Admin')
        db.add(m)
        box = Mailbox(workspace_id=w.id, email='dept@example.edu', encrypted_token='token')
        db.add(box)
        db.commit()

        # Step 1: Ingest via sync_mailbox
        sync_mailbox(db, box, MockGmail())
        msg = db.scalar(select(Message).where(Message.mailbox_id == box.id))
        assert msg is not None
        assert msg.status == 'queued'

        # Step 2: Extract via extraction service
        process_message(db, msg, MockExtractor())
        req = db.scalar(select(RequestRecord).where(RequestRecord.workspace_id == w.id))
        assert req is not None
        assert req.data['title'] == 'Annual Commencement'
        assert len(req.data['requirements']) == 2
        req_id = req.id

        tokens = issue_session(db, m.id)
        db.commit()

    # Step 3: View and mutate request through API
    with TestClient(app) as client:
        auth = {'Authorization': f"Bearer {tokens['access_token']}"}
        
        # Show request
        detail = client.get(f'/api/v1/requests/{req_id}', headers=auth)
        assert detail.status_code == 200
        req_data = detail.json()
        assert req_data['title'] == 'Annual Commencement'

        # Edit requirements: mark first item prepared
        req_item = req_data['requirements'][0]
        res = client.patch(
            f'/api/v1/requests/{req_id}',
            headers=auth,
            json={'expected_version': 1, 'requirements': [{**req_item, 'status': 'prepared'}]}
        )
        assert res.status_code == 200
        assert res.json()['requirements'][0]['status'] == 'prepared'

        # Accept reschedule proposal
        with app.state.db() as db:
            r_db = db.get(RequestRecord, req_id)
            from copy import deepcopy
            d = deepcopy(r_db.data)
            new_deadline = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
            d['proposed_updates'] = [{
                'id': 'prop-1',
                'source_id': msg.id,
                'base_version': 2,
                'changes': {'setup_deadline': new_deadline}
            }]
            r_db.data = d
            db.commit()

        accept_res = client.post(
            f'/api/v1/requests/{req_id}/proposals/prop-1/accept',
            headers=auth,
            json={'expected_version': 2}
        )
        assert accept_res.status_code == 200
        assert accept_res.json()['setup_deadline'].startswith(new_deadline[:19])

        # Complete the request
        comp_res = client.patch(
            f'/api/v1/requests/{req_id}',
            headers=auth,
            json={'expected_version': 3, 'status': 'completed'}
        )
        assert comp_res.status_code == 200
        assert comp_res.json()['status'] == 'completed'

        # Verify reminders cancelled
        with app.state.db() as db:
            reminders = list(db.scalars(select(Reminder).where(Reminder.request_id == req_id)))
            assert all(rem.status == 'cancelled' for rem in reminders)

    # Step 4: Verify persistence across API restart
    restarted_app = create_app(settings)
    with TestClient(restarted_app) as client:
        with restarted_app.state.db() as db:
            new_tokens = issue_session(db, m.id)
            db.commit()
        persisted = client.get(
            f'/api/v1/requests/{req_id}',
            headers={'Authorization': f"Bearer {new_tokens['access_token']}"}
        )
        assert persisted.status_code == 200
        assert persisted.json()['status'] == 'completed'

def test_missing_key_states_produce_actionable_errors(tmp_path):
    settings = Settings(
        environment="test",
        database_url=f"sqlite:///{tmp_path}/unconfigured.db",
        google_client_id="",
        google_client_secret="",
        encryption_key="",
        demo_enabled=False
    )
    app = create_app(settings)
    with TestClient(app) as client:
        # Starting OAuth without Google credentials configured returns 503
        res = client.post('/api/v1/auth/start', json={'challenge': 'a' * 43})
        assert res.status_code == 503
        assert 'Configure Google OAuth' in res.json()['error']['message']
