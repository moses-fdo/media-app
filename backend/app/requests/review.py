from copy import deepcopy
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from ..auth.sessions import require_member,get_session
from ..schemas import RequestCreate, Requirement
from .service import owned,save_data,output
from ..reminders.service import schedule_request_reminders
router=APIRouter(prefix='/api/v1')
class Revision(BaseModel):expected_version:int=Field(gt=0)
@router.post('/requests/{id}/proposals/{proposal_id}/{action}')
def proposal(id:str,proposal_id:str,action:str,body:Revision,member=Depends(require_member),db=Depends(get_session)):
    if action not in ('accept','dismiss'):raise HTTPException(404,'Unknown action')
    r=owned(db,id,member.workspace_id);data=deepcopy(r.data)
    p=next((x for x in data['proposed_updates'] if x['id']==proposal_id),None)
    if not p:raise HTTPException(404,'Update not found')
    if action=='accept':
        changes=RequestCreate.model_validate({**data,**p['changes']}).model_dump(mode='json')
        # An explicit staff acceptance may update fields, but preserve unchanged equipment identity/state.
        old=data.get('requirements',[])
        merged=[]
        for req in changes['requirements']:
            match=next((x for x in old if (x['title'].casefold(),x['department'],x.get('quantity'),x.get('notes',''))==(req['title'].casefold(),req['department'],req.get('quantity'),req.get('notes',''))),None)
            merged.append(deepcopy(match) if match else req)
        changes['requirements']=merged
        if changes['setup_deadline']!=data.get('setup_deadline'):data['deadline_revision']=data.get('deadline_revision',1)+1
        changes['status']=data['status'] if data['status'] not in ('needs_review','completed') else 'new'
        if p.get('cancelled'):changes['status']='cancelled'
        data.update(changes)
        data['review_reasons']=p.get('review_reasons',[])
        if data['review_reasons'] or not data['event_start'] or not data['setup_deadline']:data['status']='needs_review'
    data['proposed_updates']=[x for x in data['proposed_updates'] if x['id']!=proposal_id]
    save_data(db,r,data,body.expected_version,member.name,action.title()+'ed email update')
    schedule_request_reminders(db,r);db.commit();return output(r)
