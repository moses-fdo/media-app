from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field,field_validator
from sqlalchemy import select
from ..auth.sessions import require_member,get_session
from ..models import Device,RequestRecord,Reminder
from .service import schedule_request_reminders
from datetime import datetime,timezone
router=APIRouter(prefix='/api/v1')
class Preferences(BaseModel):
    offsets:list[int]=Field(min_length=1,max_length=10)
    @field_validator('offsets')
    @classmethod
    def valid(cls,v):
        if any(x<0 or x>43200 for x in v):raise ValueError('Offsets must be between 0 and 43200 minutes')
        return sorted(set(v))
@router.put('/reminder-preferences')
def preferences(body:Preferences,member=Depends(require_member),db=Depends(get_session)):
    member.preferences={**member.preferences,'offsets':body.offsets}
    for r in db.scalars(select(RequestRecord).where(RequestRecord.workspace_id==member.workspace_id)):schedule_request_reminders(db,r)
    db.commit();return member.preferences
class Registration(BaseModel):token:str=Field(pattern=r'^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$')
@router.post('/devices')
def register(body:Registration,member=Depends(require_member),db=Depends(get_session)):
    d=db.scalar(select(Device).where(Device.token==body.token))
    if d:d.member_id=member.id;d.active=True
    else:db.add(Device(member_id=member.id,token=body.token))
    # If notifications were enabled after an offset passed, recover the most
    # recent missed reminder per upcoming event rather than sending a burst.
    stamp=datetime.now(timezone.utc)
    recovered=set()
    for job in db.scalars(select(Reminder).where(Reminder.member_id==member.id,Reminder.status=='no_device').order_by(Reminder.due.desc()).limit(100)):
        record=db.get(RequestRecord,job.request_id)
        if not record or job.request_id in recovered or job.offset not in member.preferences.get('offsets',[1440,60]):continue
        data=record.data
        if data['status'] in ('confirmed','in_progress') and data.get('setup_deadline') and datetime.fromisoformat(data['setup_deadline'])>stamp and data.get('deadline_revision',1)==job.revision:
            job.status='pending';job.due=stamp.isoformat();job.claimed_at=None;recovered.add(job.request_id)
    db.commit();return {'ok':True}
@router.delete('/devices')
def unregister(body:Registration,member=Depends(require_member),db=Depends(get_session)):
    d=db.scalar(select(Device).where(Device.token==body.token,Device.member_id==member.id))
    if d:d.active=False;db.commit()
    return {'ok':True}
@router.get('/reminders')
def reminders(member=Depends(require_member),db=Depends(get_session)):
    return {'items':[{'id':r.id,'request_id':r.request_id,'due':r.due,'status':r.status} for r in db.scalars(select(Reminder).where(Reminder.member_id==member.id).order_by(Reminder.due).limit(100))]}
