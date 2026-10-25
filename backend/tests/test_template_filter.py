from sqlalchemy import select
from app.extraction.provider import ExtractionProvider
from app.extraction.service import process_message
from app.models import Mailbox, Message, RequestRecord

TEMPLATE='''Department / Organizer: Student Affairs
Venue: Main Auditorium
Date: 2099-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear: 4 microphones
Video Gear:
Contact Person: Office
Special Notes: Record the event.
'''

def test_keyword_newsletter_and_tag_only_email_are_excluded():
    for subject, body in [('Workshop on ChatGPT Astra-6','Please arrange video support for this workshop.'),('[MEDIA REQUEST] Guest lecture','Need microphones and cameras tomorrow'),('CIRCULAR: Morning assembly',TEMPLATE)]:
        result=ExtractionProvider().analyze(Message(subject=subject,body=body))
        assert result.classification=='irrelevant'
        assert not result.events

def test_template_body_or_parsed_attachment_is_accepted():
    for body,attachments in [(TEMPLATE,[]),('See attached',[{'status':'parsed','text':TEMPLATE}])]:
        result=ExtractionProvider().analyze(Message(subject='[MEDIA REQUEST] Convocation',body=body,attachments=attachments))
        assert result.classification=='request'
        assert result.events[0].venue=='Main Auditorium'

def test_body_tag_and_event_name_in_body_is_accepted():
    body = """[MEDIA REQUEST]
Event Name: Weekend Youth Summit
Department / Organizer: Department of Student Affairs
Venue: Main Auditorium
Date: 2026-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear: 4 Wireless Microphones, 2 PA Speakers
Video Gear: 1 LED Wall Display, 2 Cameras
Contact Person: Dr. John (9876543210)
Special Notes: Live streaming required.
"""
    result = ExtractionProvider().analyze(Message(subject='', body=body))
    assert result.classification == 'request'
    assert len(result.events) == 1
    assert result.events[0].title == 'Weekend Youth Summit'
    assert result.events[0].venue == 'Main Auditorium'
    assert len(result.events[0].requirements) >= 2

def test_unrelated_unsupported_attachment_cannot_create_a_review_entry(app):
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='fake');db.add(box);db.flush()
        message=Message(workspace_id='w1',mailbox_id=box.id,provider_id='circular',thread_id='circular',subject='Global Technology Internship 2027',body='Register now',attachments=[{'status':'manual_review','name':'poster.png'}])
        db.add(message);db.commit();process_message(db,message,ExtractionProvider())
        assert list(db.scalars(select(RequestRecord)))==[]
        assert message.classification=='irrelevant'
        assert message.status=='processed'

def test_recovery_flag_cannot_override_template_filter(app):
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='fake');db.add(box);db.flush()
        message=Message(workspace_id='w1',mailbox_id=box.id,provider_id='recovered',thread_id='recovered',subject='Newsletter',body='Register for camera training',classification='uncertain')
        db.add(message);db.commit();process_message(db,message,ExtractionProvider())
        assert list(db.scalars(select(RequestRecord)))==[]
        assert message.classification=='irrelevant'

def test_next_sync_excludes_only_untouched_non_template_imports(app):
    from app.gmail.sync import sync_mailbox
    from app.requests.service import create_request, save_data
    from copy import deepcopy
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='fake');db.add(box);db.flush()
        bad=Message(workspace_id='w1',mailbox_id=box.id,provider_id='old-circular',thread_id='old-circular',subject='Call for fellowship',body='Register now',status='processed',classification='uncertain')
        good=Message(workspace_id='w1',mailbox_id=box.id,provider_id='good',thread_id='good',subject='[MEDIA REQUEST] Event',body=TEMPLATE,status='processed',classification='request')
        db.add_all([bad,good]);db.flush()
        unwanted=create_request(db,'w1',{'title':'Call for fellowship'},sources=[bad.id])
        valid=create_request(db,'w1',{'title':'Actual media request'},sources=[good.id])
        edited=create_request(db,'w1',{'title':'Staff corrected this'},sources=[bad.id])
        data=deepcopy(edited.data);data['manual_fields']=['venue'];save_data(db,edited,data,edited.version,'Staff member','Updated venue')
        db.commit()
        class Gmail:
            def profile(self):return {'historyId':'1'}
            def list_messages(self,*args):return {'messages':[]}
        sync_mailbox(db,box,Gmail())
        db.refresh(unwanted);db.refresh(valid);db.refresh(edited)
        assert unwanted.data['status']=='dismissed'
        assert valid.data['status']=='needs_review'
        assert edited.data['status']=='needs_review'
        assert db.get(Message,bad.id) is not None

def test_rejected_legacy_record_cannot_swallow_a_later_valid_template(app):
    from app.requests.service import create_request
    from app.extraction.cleanup import exclude_non_template_imports
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='fake');db.add(box);db.flush()
        old=Message(workspace_id='w1',mailbox_id=box.id,provider_id='legacy',thread_id='shared',subject='Campus newsletter',body='Register now',status='processed')
        db.add(old);db.flush();create_request(db,'w1',{'title':'Campus newsletter'},sources=[old.id]);db.commit()
        exclude_non_template_imports(db,box)
        message=Message(workspace_id='w1',mailbox_id=box.id,provider_id='later',thread_id='shared',subject='[MEDIA REQUEST] Actual event',body=TEMPLATE)
        db.add(message);db.commit();process_message(db,message,ExtractionProvider())
        active=[record for record in db.scalars(select(RequestRecord)) if record.data['status']!='dismissed']
        assert len(active)==1
        assert active[0].data['title']=='Actual event'

def test_listing_requests_cleans_up_untouched_non_template_imports(app, client):
    from app.requests.service import create_request
    from app.auth.sessions import issue_session
    from app.models import Member
    with app.state.db() as db:
        m = Member(workspace_id='w1', email='staff@example.com', name='Staff', role='staff', active=True)
        box = Mailbox(workspace_id='w1', email='dept@example.edu', encrypted_token='fake')
        db.add_all([m, box])
        db.flush()
        session = issue_session(db, m.id)
        token = session['access_token']
        bad = Message(workspace_id='w1', mailbox_id=box.id, provider_id='old-circ', thread_id='old-circ', subject='Campus Circular', body='No template', status='processed', classification='uncertain')
        db.add(bad)
        db.flush()
        create_request(db, 'w1', {'title': 'Campus Circular'}, sources=[bad.id])
        db.commit()

    resp = client.get('/api/v1/requests?tab=needs_review', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['counts']['needs_review'] == 0
    assert len(data['items']) == 0

