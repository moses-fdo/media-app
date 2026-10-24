from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field,field_validator
from sqlalchemy import select
from ..auth.sessions import require_member,get_session
from ..models import Device,RequestRecord,Reminder
from .service import schedule_request_reminders
router=APIRouter(prefix='/api/v1')
class Preferences(BaseModel):
    offsets:list[int]=Field(max_length=10)
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
    db.commit();return {'ok':True}
@router.delete('/devices')
def unregister(body:Registration,member=Depends(require_member),db=Depends(get_session)):
    d=db.scalar(select(Device).where(Device.token==body.token,Device.member_id==member.id))
    if d:d.active=False;db.commit()
    return {'ok':True}
@router.get('/reminders')
def reminders(member=Depends(require_member),db=Depends(get_session)):
    return {'items':[{'id':r.id,'request_id':r.request_id,'due':r.due,'status':r.status} for r in db.scalars(select(Reminder).where(Reminder.member_id==member.id).order_by(Reminder.due).limit(100))]}
