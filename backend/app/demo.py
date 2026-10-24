from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter,Request,HTTPException,Depends
from sqlalchemy import select
from .auth.sessions import get_session,issue_session
from .models import Workspace,Member,Mailbox,Message,RequestRecord
from .requests.service import create_request
router=APIRouter(prefix='/api/v1')
@router.post('/auth/demo')
def demo(request:Request,db=Depends(get_session)):
    if not request.app.state.settings.demo_enabled:raise HTTPException(404,'Not found')
    member=db.scalar(select(Member).where(Member.email=='demo@media-ops.example'))
    if not member:
        w=Workspace(name='University media department');db.add(w);db.flush()
        member=Member(workspace_id=w.id,email='demo@media-ops.example',name='Jamie',role='admin');db.add(member);db.flush()
        box=Mailbox(workspace_id=w.id,email='Synthetic sample mailbox',encrypted_token='',status='demo');db.add(box);db.flush()
        today=datetime.now(ZoneInfo('Asia/Kolkata')).replace(hour=0,minute=0,second=0,microsecond=0)
        fixtures=[('Annual Convocation','Office of the Registrar','Main Auditorium',0,10,8,'new',[('Wireless microphones',4,'audio'),('LED wall',1,'video'),('Cameras',2,'video')]),('Guest lecture recording','Department of Psychology','Seminar Hall B',0,14,13,'in_progress',[('Camera',1,'video'),('Lapel microphones',2,'audio')]),('Bioethics Symposium','School of Life Sciences','Science Hall',1,11,10,'confirmed',[('Lapel microphones',3,'audio'),('Projector',1,'video')]),('Student film screening','Film Society','Arts Theatre',3,17,16,'new',[('Projector',1,'video'),('PA speakers',2,'audio')]),('Research interview','Research Office','Venue to confirm',2,11,10,'needs_review',[('Camera',1,'video')]),('Welcome address','Student Services','Main Hall',-1,9,8,'completed',[('Podium microphone',1,'audio')])]
        for i,(title,organizer,venue,day,start,setup,status,gear) in enumerate(fixtures):
            date=today+timedelta(days=day)
            m=Message(workspace_id=w.id,mailbox_id=box.id,provider_id='demo-'+str(i),thread_id='demo-'+str(i),subject=title+' — media arrangements',sender=organizer+' <organizer@example.edu>',body=f'Dear Media Team,\n\nPlease arrange media support for {title} at {venue}. We need '+', '.join(f'{n} {t.lower()}' for t,n,_ in gear)+f'.\n\nThe event starts at {start}:00. Please finish setup by {setup}:00.\n\nThank you,\n{organizer}',classification='request',status='processed');db.add(m);db.flush()
            data={'title':title,'organizer':organizer,'venue':venue,'event_start':(date+timedelta(hours=start)).isoformat(),'setup_deadline':None if status=='needs_review' else (date+timedelta(hours=setup)).isoformat(),'status':status,'summary':'Media support requested by '+organizer,'requirements':[{'title':t,'quantity':n,'department':dept} for t,n,dept in gear]}
            create_request(db,w.id,data,'Demo setup',[m.id])
        db.commit()
    tokens=issue_session(db,member.id);db.commit();return tokens
