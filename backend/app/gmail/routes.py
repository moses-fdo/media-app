from fastapi import APIRouter,Depends,Request,HTTPException,Query
from sqlalchemy import select,func,delete
from cryptography.fernet import Fernet
import httpx
from ..auth.sessions import require_member,require_admin,get_session
from ..models import Mailbox,Message
router=APIRouter(prefix='/api/v1')
def mailbox(db,workspace):return db.scalar(select(Mailbox).where(Mailbox.workspace_id==workspace))
@router.get('/mailbox/status')
def status(request:Request,member=Depends(require_member),db=Depends(get_session)):
    b=mailbox(db,member.workspace_id)
    if not b:return {'status':'disconnected','email':None,'last_synced':None,'demo':request.app.state.settings.demo_enabled}
    return {'status':b.status,'email':b.email,'last_synced':b.last_synced,'error':b.error,'queued':db.scalar(select(func.count()).select_from(Message).where(Message.mailbox_id==b.id,Message.status=='queued')),'failed':db.scalar(select(func.count()).select_from(Message).where(Message.mailbox_id==b.id,Message.status=='failed')),'demo':request.app.state.settings.demo_enabled}
@router.post('/mailbox/sync',status_code=202)
def sync(request:Request,member=Depends(require_member),db=Depends(get_session)):
    b=mailbox(db,member.workspace_id)
    if not b:raise HTTPException(409,'Connect Gmail first')
    if request.app.state.settings.demo_enabled:raise HTTPException(409,'Demo mode does not connect to Gmail')
    try:
        from ..jobs.tasks import sync_one
        sync_one.delay(b.id)
    except Exception:raise HTTPException(503,'Background worker unavailable. Try again later.')
    return {'status':'queued'}
@router.post('/mailbox/backfill',status_code=202)
def backfill(days:int=Query(90,ge=1,le=365),member=Depends(require_admin),db=Depends(get_session)):
    b=mailbox(db,member.workspace_id)
    if not b:raise HTTPException(409,'Connect Gmail first')
    b.history_id=None;db.commit()
    from ..jobs.tasks import sync_one
    sync_one.delay(b.id,days);return {'status':'queued'}
@router.post('/mailbox/disconnect')
def disconnect(request:Request,member=Depends(require_admin),db=Depends(get_session)):
    b=mailbox(db,member.workspace_id)
    if b:
        if b.encrypted_token and not request.app.state.settings.demo_enabled:
            token=Fernet(request.app.state.settings.encryption_key.encode()).decrypt(b.encrypted_token.encode()).decode()
            r=httpx.post('https://oauth2.googleapis.com/revoke',data={'token':token},timeout=20)
            if r.status_code not in (200,400):raise HTTPException(502,'Google revocation failed; please retry')
        b.encrypted_token='';b.status='reconnect_required';b.error='Mailbox disconnected';db.commit()
    return {'ok':True}
@router.get('/mailbox/excluded')
def excluded(offset:int=Query(0,ge=0),member=Depends(require_admin),db=Depends(get_session)):
    rows=db.scalars(select(Message).where(Message.workspace_id==member.workspace_id,Message.classification=='irrelevant').order_by(Message.received_at.desc(),Message.id).offset(offset).limit(30))
    return {'items':[{'id':m.id,'subject':m.subject,'sender':m.sender,'received_at':m.received_at} for m in rows]}
@router.post('/mailbox/excluded/{id}/reprocess',status_code=202)
def reprocess(id:str,request:Request,member=Depends(require_admin),db=Depends(get_session)):
    m=db.get(Message,id)
    if not m or m.workspace_id!=member.workspace_id:raise HTTPException(404,'Message not found')
    from .client import GmailClient
    from .mime import parse_message
    client=GmailClient(request.app.state.settings,db.get(Mailbox,m.mailbox_id))
    for k,v in parse_message(client.get_message(m.provider_id)).items():setattr(m,k,v)
    m.status='queued';m.classification=None;db.commit()
    from ..jobs.tasks import extract_one
    extract_one.delay(m.id);return {'status':'queued'}
