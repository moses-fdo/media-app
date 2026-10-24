from copy import deepcopy
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import select
from ..auth.sessions import get_session, require_member, require_admin
from ..models import RequestRecord, Message
from ..schemas import RequestCreate, RequestPatch
from .service import create_request, output, owned, save_data, validate_assignees
router=APIRouter(prefix='/api/v1')
@router.get('/requests')
def listing(tab:str='active',q:str='',department:str='',priority:str='',cursor:str|None=None,limit:int=Query(30,ge=1,le=100),member=Depends(require_member),db=Depends(get_session)):
    if tab not in ('active','needs_review','completed','agenda'): raise HTTPException(422,'Unknown request filter')
    rows=list(db.scalars(select(RequestRecord).where(RequestRecord.workspace_id==member.workspace_id)))
    def in_tab(d,t):
        if t=='needs_review': return d['status']=='needs_review' or bool(d.get('proposed_updates'))
        if t=='completed': return d['status'] in ('completed','cancelled')
        if t=='agenda': return d['status'] not in ('dismissed','cancelled')
        return d['status'] in ('new','in_progress','confirmed')
    counts={t:sum(in_tab(r.data,t) for r in rows) for t in ('active','needs_review','completed')}
    rows=[r for r in rows if in_tab(r.data,tab) and (not q or q.casefold() in (r.data['title']+' '+r.data.get('organizer','')+' '+r.data.get('venue','')).casefold()) and (not priority or r.data['priority']==priority) and (not department or any(x['department']==department for x in r.data.get('requirements',[])))]
    rows.sort(key=lambda r:(r.data.get('setup_deadline') or '9999',r.id))
    if cursor:
        ids=[r.id for r in rows]
        if cursor not in ids: raise HTTPException(400,'List changed. Refresh the list.')
        rows=rows[ids.index(cursor)+1:]
    batch=rows[:limit]
    return {'items':[output(r) for r in batch],'next_cursor':batch[-1].id if len(rows)>limit else None,'counts':counts}
@router.post('/requests',status_code=201)
def create(body:RequestCreate,member=Depends(require_member),db=Depends(get_session)):
    r=create_request(db,member.workspace_id,body.model_dump(mode='json'),member.name)
    db.commit();return output(r)
@router.get('/requests/{id}')
def detail(id:str,member=Depends(require_member),db=Depends(get_session)): return output(owned(db,id,member.workspace_id))
@router.patch('/requests/{id}')
def patch(id:str,body:RequestPatch,member=Depends(require_member),db=Depends(get_session)):
    record=owned(db,id,member.workspace_id);data=deepcopy(record.data)
    changes=body.model_dump(exclude_unset=True,mode='json');expected=changes.pop('expected_version')
    try: validated=RequestCreate.model_validate({**data,**changes}).model_dump(mode='json')
    except ValidationError as e: raise HTTPException(422,str(e))
    validate_assignees(db,validated,member.workspace_id)
    if ('setup_deadline' in changes and changes['setup_deadline']!=data.get('setup_deadline')): data['deadline_revision']=data.get('deadline_revision',1)+1
    data.update(validated)
    data['manual_fields']=list(set(data.get('manual_fields',[])+list(changes)))
    if data['event_start'] and data['setup_deadline']: data['review_reasons']=[]
    if data['status'] in ('new','confirmed') and (not data['event_start'] or not data['setup_deadline']): raise HTTPException(422,'Confirm the event date and setup deadline first')
    r=save_data(db,record,data,expected,member.name,'Updated '+', '.join(changes))
    from ..reminders.service import schedule_request_reminders
    schedule_request_reminders(db,r);db.commit();return output(r)
@router.get('/requests/{id}/activity')
def activity(id:str,member=Depends(require_member),db=Depends(get_session)): return {'items':owned(db,id,member.workspace_id).data.get('activity',[])}
@router.get('/sources/{id}')
def source(id:str,member=Depends(require_member),db=Depends(get_session)):
    m=db.get(Message,id)
    if not m or m.workspace_id!=member.workspace_id or m.classification=='irrelevant': raise HTTPException(404,'Source not found')
    return {'id':m.id,'sender':m.sender,'subject':m.subject,'received_at':m.received_at,'body':m.body,'attachments':m.attachments,'gmail_url':'https://mail.google.com/mail/u/0/#all/'+m.thread_id}
@router.post('/workspace/data/purge')
def purge_workspace_data(member=Depends(require_admin),db=Depends(get_session)):
    from ..models import Reminder
    from sqlalchemy import delete
    req_ids=list(db.scalars(select(RequestRecord.id).where(RequestRecord.workspace_id==member.workspace_id)))
    if req_ids:db.execute(delete(Reminder).where(Reminder.request_id.in_(req_ids)))
    db.execute(delete(RequestRecord).where(RequestRecord.workspace_id==member.workspace_id))
    db.execute(delete(Message).where(Message.workspace_id==member.workspace_id))
    db.commit()
    return {'ok':True,'purged':True}
