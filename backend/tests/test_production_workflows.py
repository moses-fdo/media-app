"""Exercise the real parser and staff-review boundary, without mocked extraction."""
from pathlib import Path
import re
import pytest
from sqlalchemy import select
from app.extraction.provider import ExtractionProvider, parse_time_str
from app.extraction.service import process_message
from app.models import Mailbox, Message, RequestRecord, Reminder

TEMPLATE = '''Event Name: Chapel Service
Department / Organizer: Student Affairs
Venue: Main Auditorium
Date: 2099-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear:
- 4 Wireless Microphones
- 1 Podium Mic
Video Gear:
- 2 Cameras
Contact Person: Dr. John
Special Notes: Record the event.
'''


def analyze(body=TEMPLATE, subject='[MEDIA REQUEST] Chapel Service', attachments=None):
    return ExtractionProvider().analyze(Message(subject=subject,body=body,sender='organizer@example.edu',attachments=attachments or []))


@pytest.mark.parametrize('value,result',[('9 AM',(9,0)),('12:00 AM',(0,0)),('12:00 PM',(12,0)),('23:59',(23,59)),('13:00 PM',None),('25:00',None),('10:75',None)])
def test_explicit_time_formats(value,result):
    assert parse_time_str(value)==result


def test_new_email_missing_template_time_header_is_excluded():
    result=analyze(TEMPLATE.replace('Event Time: 10:00 AM\n',''))
    assert result.classification=='irrelevant'
    assert result.events==[]


@pytest.mark.parametrize('raw',['2027-02-30','2027-13-01','00/11/2027','29 Feb 2027'])
def test_invalid_dates_go_to_review(raw):
    result=analyze(TEMPLATE.replace('2099-11-20',raw))
    assert result.events[0].event_start is None
    assert any('Invalid event date' in reason for reason in result.review_reasons)


def test_new_email_missing_setup_header_is_excluded():
    result=analyze(TEMPLATE.replace('Setup Deadline: 08:30 AM\n',''))
    assert result.classification=='irrelevant'
    assert result.events==[]


def test_unsubscribe_footer_does_not_discard_request():
    assert analyze(TEMPLATE+'\nUnsubscribe from mailing list').classification=='request'


def test_casual_request_without_template_is_excluded():
    result=analyze('Please arrange 4 microphones and a projector tomorrow at the Main Auditorium.',subject='Equipment for tomorrow')
    assert result.classification=='irrelevant'
    assert result.events==[]


def test_parsed_attachment_supplies_fields():
    result=analyze('Please see attached.',attachments=[{'status':'parsed','text':TEMPLATE}])
    assert result.events[0].venue=='Main Auditorium'
    assert len(result.events[0].requirements)==3
    assert result.events[0].event_start.hour==10


def test_conflicting_attachment_requires_review():
    result=analyze(attachments=[{'status':'parsed','text':TEMPLATE.replace('Main Auditorium','Another Hall')}])
    assert result.events[0].venue=='Main Auditorium'
    assert result.events[0].status=='needs_review'
    assert any('Conflicting venue' in reason for reason in result.review_reasons)


@pytest.mark.parametrize('quantity',['0','-2','100001'])
def test_invalid_quantities_do_not_crash(quantity):
    result=analyze(TEMPLATE.replace('4 Wireless Microphones',quantity+' Wireless Microphones'))
    assert result.events[0].requirements[0].quantity is None
    assert result.events[0].status=='needs_review'


def test_quoted_template_does_not_qualify_a_new_message():
    result=analyze('Venue: New Hall\nOn Tuesday someone wrote:\n'+TEMPLATE)
    assert result.classification=='irrelevant'
    assert result.events==[]


def test_actual_mobile_template_parses():
    text=(Path(__file__).parents[2]/'mobile/src/app/settings/template.tsx').read_text(encoding='utf-8')
    sample=re.search(r'export const STANDARD_MEDIA_REQUEST_TEMPLATE = `([\s\S]*?)`;',text).group(1)
    result=analyze(sample,subject='[MEDIA REQUEST] Morning Chapel Service')
    assert result.events[0].title=='Morning Chapel Service'
    assert len(result.events[0].requirements)==5
    assert result.events[0].status=='new'


@pytest.fixture
def ingest(app):
    def ingest_message(body,provider_id):
        with app.state.db() as db:
            box=db.scalar(select(Mailbox).where(Mailbox.workspace_id=='w1'))
            if not box:
                box=Mailbox(workspace_id='w1',email='synthetic@example.edu',encrypted_token='synthetic');db.add(box);db.flush()
            message=Message(workspace_id='w1',mailbox_id=box.id,provider_id=provider_id,thread_id='same-thread',subject='Re: [MEDIA REQUEST] Chapel Service',body=body,attachments=[])
            db.add(message);db.commit();process_message(db,message,ExtractionProvider())
            return db.scalar(select(RequestRecord).where(RequestRecord.workspace_id=='w1')).id
    return ingest_message


def accept(client,auth,rid):
    current=client.get('/api/v1/requests/'+rid,headers=auth).json()
    proposal=current['proposed_updates'][0]
    return client.post(f'/api/v1/requests/{rid}/proposals/{proposal["id"]}/accept',headers=auth,json={'expected_version':current['version']})


def test_venue_only_reply_preserves_existing_data(app,client,auth,ingest):
    rid=ingest(TEMPLATE,'initial')
    before=client.get('/api/v1/requests/'+rid,headers=auth).json()
    ingest('Venue: New Hall','followup')
    current=client.get('/api/v1/requests/'+rid,headers=auth).json()
    assert current['proposed_updates'][0]['changes']=={'venue':'New Hall'}
    result=accept(client,auth,rid)
    assert result.status_code==200,result.text
    assert result.json()['venue']=='New Hall'
    assert result.json()['event_start']==before['event_start']
    assert result.json()['requirements']==before['requirements']
    with app.state.db() as db:
        assert not list(db.scalars(select(Reminder)))
    confirmed=client.patch('/api/v1/requests/'+rid,headers=auth,json={'expected_version':result.json()['version'],'status':'confirmed'})
    assert confirmed.status_code==200,confirmed.text
    with app.state.db() as db:
        assert len(list(db.scalars(select(Reminder))))==2


def test_conflicting_manual_edit_is_protected(client,auth,ingest):
    rid=ingest(TEMPLATE,'initial');ingest('Venue: New Hall','followup')
    current=client.get('/api/v1/requests/'+rid,headers=auth).json()
    client.patch('/api/v1/requests/'+rid,headers=auth,json={'expected_version':current['version'],'venue':'Staff-selected Hall'})
    assert accept(client,auth,rid).status_code==409
    assert client.get('/api/v1/requests/'+rid,headers=auth).json()['venue']=='Staff-selected Hall'


def test_date_only_reply_preserves_time(client,auth,ingest):
    rid=ingest(TEMPLATE,'initial');ingest('Date: 2099-11-22','followup')
    current=client.get('/api/v1/requests/'+rid,headers=auth).json()
    changes=current['proposed_updates'][0]['changes']
    assert changes['event_start']=='2099-11-22T10:00:00+05:30'
    assert changes['setup_deadline']=='2099-11-22T08:30:00+05:30'


def test_partial_equipment_reply_keeps_other_items(client,auth,ingest):
    rid=ingest(TEMPLATE,'initial')
    current=client.get('/api/v1/requests/'+rid,headers=auth).json()
    requirements=current['requirements'];requirements[2]['status']='tested'
    client.patch('/api/v1/requests/'+rid,headers=auth,json={'expected_version':current['version'],'requirements':requirements})
    ingest('Audio Gear: 6 Wireless Microphones','followup')
    result=accept(client,auth,rid)
    assert result.status_code==200,result.text
    assert len(result.json()['requirements'])==3
    assert result.json()['requirements'][0]['quantity']==6
    assert result.json()['requirements'][2]['status']=='tested'


def test_incomplete_request_cannot_be_confirmed(app,client,auth):
    current=client.post('/api/v1/requests',headers=auth,json={'title':'Incomplete'}).json()
    assert client.patch('/api/v1/requests/'+current['id'],headers=auth,json={'expected_version':current['version'],'status':'confirmed'}).status_code==422
    with app.state.db() as db:
        assert not list(db.scalars(select(Reminder)))


def test_impossible_manual_schedule_rejected(client,auth):
    from tests.test_requests import BASE
    assert client.post('/api/v1/requests',headers=auth,json={**BASE,'setup_deadline':'2026-10-26T10:00:00+05:30'}).status_code==422
