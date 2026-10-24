from sqlalchemy import select
from app.models import Mailbox,Message,RequestRecord

def test_irrelevant_body_discarded_and_request_deduplicated(app):
    from app.extraction.service import process_message
    from app.extraction.schemas import AnalysisResult
    class Provider:
        def analyze(self,message):
            if message.subject=='Newsletter':return AnalysisResult(classification='irrelevant')
            return AnalysisResult(classification='request',events=[{'title':'Convocation','requirements':[{'title':'Microphones','quantity':4,'department':'audio'}]}])
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='fake');db.add(box);db.flush()
        a=Message(workspace_id='w1',mailbox_id=box.id,provider_id='1',thread_id='1',subject='Newsletter',body='Private newsletter text')
        b=Message(workspace_id='w1',mailbox_id=box.id,provider_id='2',thread_id='2',subject='Media request',body='Need 4 microphones')
        db.add_all([a,b]);db.commit()
        process_message(db,a,Provider());process_message(db,b,Provider());process_message(db,b,Provider())
        rows=list(db.scalars(select(RequestRecord)))
        assert len(rows)==1
        assert rows[0].data['setup_deadline'] is None
        assert rows[0].data['status']=='needs_review'
        assert rows[0].data['requirements'][0]['quantity']==4
        assert a.body==''

def test_invalid_extraction_rejected():
    from app.extraction.schemas import AnalysisResult
    from pydantic import ValidationError
    import pytest
    with pytest.raises(ValidationError):AnalysisResult(classification='send_email',events=[])
    with pytest.raises(ValidationError):AnalysisResult(classification='request',events=[{'title':'x','requirements':[{'title':'Mic','quantity':-2}]}])

def test_attachment_limits_and_unsupported():
    from app.extraction.attachments import extract_attachment
    assert extract_attachment(b'abc','image/png')['status']=='manual_review'
    assert extract_attachment(b'x'*(10*1024*1024+1),'application/pdf')['status']=='manual_review'

def test_extraction_provider_standard_template():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    from types import SimpleNamespace
    settings = SimpleNamespace(workspace_timezone='Asia/Kolkata')
    provider = ExtractionProvider(settings)

    body = """[MEDIA REQUEST]
Event Name: Morning Chapel Service
Department / Organizer: Department of Student Affairs
Venue: Main Auditorium
Date: 2026-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear: 4 Wireless Microphones, 1 Podium Mic
Video Gear: 1 LED Wall Display, 2 Cameras
Contact Person: Dr. John (9876543210)
Special Notes: Live streaming on YouTube required.
"""
    msg = Message(subject="Media Requirement for Chapel", body=body, sender="studentaffairs@karunya.edu.in")
    res = provider.analyze(msg)

    assert res.classification == 'request'
    assert len(res.events) == 1
    ev = res.events[0]
    assert ev.title == 'Morning Chapel Service'
    assert ev.organizer == 'Department of Student Affairs'
    assert ev.venue == 'Main Auditorium'
    assert ev.status == 'new'
    assert ev.event_start.hour == 10
    assert ev.event_start.minute == 0
    assert ev.setup_deadline.hour == 8
    assert ev.setup_deadline.minute == 30
    assert ev.contact == 'Dr. John (9876543210)'

    # Requirements check
    audio_reqs = [r for r in ev.requirements if r.department == 'audio']
    video_reqs = [r for r in ev.requirements if r.department == 'video']
    assert len(audio_reqs) == 2
    assert audio_reqs[0].title == 'Wireless Microphones'
    assert audio_reqs[0].quantity == 4
    assert audio_reqs[1].title == 'Podium Mic'
    assert audio_reqs[1].quantity == 1

    assert len(video_reqs) == 2
    assert video_reqs[0].title == 'LED Wall Display'
    assert video_reqs[0].quantity == 1
    assert video_reqs[1].title == 'Cameras'
    assert video_reqs[1].quantity == 2

def test_extraction_provider_subject_event_name_template():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    body = """Department / Organizer: Department of Student Affairs
Venue: Main Auditorium
Date: 2026-11-20
Event Time: 10:00 AM
Setup Deadline: 08:30 AM
Audio Gear:
- 4 Wireless Microphones
- 1 Podium Mic
Video Gear:
- 1 LED Wall Display
- 2 Cameras
Contact Person: Dr. John (9876543210)
Special Notes: Live streaming required.
"""
    msg = Message(subject="[MEDIA REQUEST] Morning Chapel Service", body=body, sender="studentaffairs@karunya.edu.in")
    res = provider.analyze(msg)

    assert res.classification == 'request'
    assert len(res.events) == 1
    ev = res.events[0]
    assert ev.title == 'Morning Chapel Service'
    assert ev.venue == 'Main Auditorium'
    assert ev.organizer == 'Department of Student Affairs'
    assert ev.status == 'new'
    assert len(ev.requirements) == 4

def test_extraction_provider_multiline_and_date_variations():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    body = """Event Name: National Science Conference
Venue: Silver Jubilee Hall
Date: 25 Nov 2026
Event Time: 14:00
Audio Requirements:
- 3 Collar Mics
- 2 Handheld Microphones
Video Requirements:
* Projector: 1
* 2 High-def Cameras
"""
    msg = Message(subject="Re: Conference", body=body, sender="prof@karunya.edu.in")
    res = provider.analyze(msg)

    assert res.classification == 'request'
    ev = res.events[0]
    assert ev.title == 'National Science Conference'
    assert ev.event_start.day == 25
    assert ev.event_start.month == 11
    assert ev.event_start.hour == 14
    # Default setup deadline is 1 hour before event_start if not specified
    assert ev.setup_deadline.hour == 13
    assert len(ev.requirements) == 4

def test_extraction_provider_media_tagged_incomplete_creates_review():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    body = "Hi team, we will need some mics for tomorrow's guest lecture at the hall. Let us know if available."
    msg = Message(subject="[MEDIA REQUEST] Guest Lecture mic query", body=body, sender="guest@karunya.edu.in")
    res = provider.analyze(msg)

    assert res.classification == 'request'
    assert len(res.events) == 1
    ev = res.events[0]
    assert ev.status == 'needs_review'
    assert 'Guest Lecture mic query' in ev.title
    assert len(res.review_reasons) > 0

def test_extraction_provider_generic_circular_classified_irrelevant():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    msg = Message(
        subject="CIRCULAR: STUDENTS FEEDBACK - REG.",
        body="Dear students, please submit your feedback via Google Form.",
        sender="mailadmin@karunya.edu.in"
    )
    res = provider.analyze(msg)
    assert res.classification == 'irrelevant'
    assert len(res.events) == 0

def test_extraction_provider_spam_classified_irrelevant():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    msg = Message(subject="Weekly Tech Newsletter", body="Click here to unsubscribe from this automated newsletter.", sender="no-reply@vendor.com")
    res = provider.analyze(msg)

    assert res.classification == 'irrelevant'
    assert len(res.events) == 0

def test_extraction_provider_user_screenshot_circulars_all_irrelevant():
    from app.extraction.provider import ExtractionProvider
    from app.models import Message
    provider = ExtractionProvider()

    examples = [
        ("Workshop on ChatGPT Astra-6 | 22 October 2026", "Event: Workshop on ChatGPT\nDate: 22.10.2026\nVenue: Hall B\nJoin the workshop."),
        ("CIRCULAR: Call for Applications – IndiaAI Fellowship Programme for AY 2026–27 - reg", "Please see attached circular regarding fellowships."),
        ("CIRCULAR: National Innovation Challenges & Hackathons - Call for Student Registrations - reg", "Hackathon circular details."),
        ("Update on Udemy Course Access", "Your access to Udemy courses has been updated."),
        ("CIRCULAR: Cyber Security Awareness Pledge - reg", "All students take pledge."),
        ("Combined Morning Assembly on 14.10.2026", "Assembly will be held at 8:30 AM at Main Auditorium."),
        ("Student Representatives-AY 2026–2027", "List of student representatives."),
        ("QUANTUMANIA 2.0 – Workshop on Mathematical Foundations and Basics of Quantum Computing", "Quantum workshop details at campus.")
    ]

    for subject, body in examples:
        msg = Message(subject=subject, body=body, sender="admin@karunya.edu.in")
        res = provider.analyze(msg)
        assert res.classification == 'irrelevant', f"Expected '{subject}' to be irrelevant but got {res.classification}"
        assert len(res.events) == 0

