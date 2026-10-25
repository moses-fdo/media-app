from copy import deepcopy
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import select
from ..auth.sessions import get_session, require_member, require_admin
from ..models import RequestRecord, Message, Mailbox
from ..schemas import RequestCreate, RequestPatch
from .service import create_request, output, owned, save_data, validate_assignees
from .validation import required_review_reasons
router=APIRouter(prefix='/api/v1')
@router.get('/requests')
def listing(tab:str='active',q:str='',department:str='',priority:str='',cursor:str|None=None,limit:int=Query(30,ge=1,le=100),member=Depends(require_member),db=Depends(get_session)):
    if tab not in ('active','needs_review','completed','agenda'): raise HTTPException(422,'Unknown request filter')
    from ..extraction.cleanup import exclude_non_template_imports
    exclude_non_template_imports(db, member.workspace_id)
    rows=list(db.scalars(select(RequestRecord).where(RequestRecord.workspace_id==member.workspace_id)))
    def in_tab(d,t):
        if d.get('status') in ('dismissed', 'cancelled'):
            return False if t != 'completed' else d['status'] == 'cancelled'
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
    from ..reminders.service import schedule_request_reminders
    schedule_request_reminders(db,r)
    db.commit();return output(r)
@router.get('/requests/{id}')
def detail(id:str,member=Depends(require_member),db=Depends(get_session)): return output(owned(db,id,member.workspace_id))
@router.patch('/requests/{id}')
def patch(id:str,body:RequestPatch,member=Depends(require_member),db=Depends(get_session)):
    record=owned(db,id,member.workspace_id,lock=True);data=deepcopy(record.data)
    changes=body.model_dump(exclude_unset=True,mode='json');expected=changes.pop('expected_version')
    if record.version!=expected: raise HTTPException(409,'This request changed. Reload before saving.')
    try: validated=RequestCreate.model_validate({**data,**changes}).model_dump(mode='json')
    except ValidationError as e: raise HTTPException(422,str(e))
    validate_assignees(db,validated,member.workspace_id)
    if ('setup_deadline' in changes and changes['setup_deadline']!=data.get('setup_deadline')): data['deadline_revision']=data.get('deadline_revision',1)+1
    data.update(validated)
    data['manual_fields']=list(set(data.get('manual_fields',[])+list(changes)))
    issues=required_review_reasons(data)
    if changes.get('status') in ('confirmed','in_progress','completed'):
        if issues: raise HTTPException(422,' '.join(issues))
        if data.get('proposed_updates'): raise HTTPException(409,'Accept or dismiss pending email updates before confirming or completing this request.')
        data['review_reasons']=[]
    else:
        automatic={'Confirm event date and time.','Confirm setup deadline.','Confirm event venue.','Confirm equipment requirements.','Confirm equipment quantities before confirming this request.','Confirm event date and setup deadline'}
        data['review_reasons']=list(dict.fromkeys([reason for reason in data.get('review_reasons',[]) if reason not in automatic]+issues))
        if data['review_reasons'] and data['status'] not in ('completed','cancelled','dismissed'):
            data['status']='needs_review'
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
