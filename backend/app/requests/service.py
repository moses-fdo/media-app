from copy import deepcopy
from sqlalchemy import select, update
from fastapi import HTTPException
from ..models import RequestRecord, Member, now, uid
from ..schemas import RequestCreate
from .validation import required_review_reasons

def output(record):
    data=deepcopy(record.data)
    data['requirements_summary']=' · '.join((f"{r['quantity']} " if r.get('quantity') else '')+r['title'] for r in data.get('requirements',[])[:3])
    return {**data,'id':record.id,'version':record.version}
def owned(db,id,workspace,lock=False):
    query=select(RequestRecord).where(RequestRecord.id==id,RequestRecord.workspace_id==workspace)
    record=db.scalar(query.with_for_update() if lock else query)
    if not record or record.workspace_id!=workspace: raise HTTPException(404,'Request not found')
    return record

def validate_assignees(db,data,workspace):
    for r in data.get('requirements',[]):
        if r.get('assignee_id'):
            m=db.get(Member,r['assignee_id'])
            if not m or not m.active or m.workspace_id!=workspace: raise HTTPException(422,'Assigned staff member is unavailable')

def create_request(db,workspace,data,actor='Email processing',sources=None,review_reasons=None):
    payload=RequestCreate.model_validate(data).model_dump(mode='json')
    validate_assignees(db,payload,workspace)
    reasons=list(review_reasons or [])
    reasons.extend(required_review_reasons(payload))
    if reasons: payload['status']='needs_review'
    payload.update(sources=sources or [],proposed_updates=[],review_reasons=list(dict.fromkeys(reasons)),activity=[{'at':now(),'actor':actor,'action':'Request created'}],manual_fields=[],deadline_revision=1)
    record=RequestRecord(workspace_id=workspace,data=payload);db.add(record);db.flush();return record

def save_data(db,record,data,expected_version,actor,action):
    if record.version!=expected_version: raise HTTPException(409,'This request changed. Reload before saving.')
    data=deepcopy(data)
    data['activity']=(data.get('activity',[])+[{'at':now(),'actor':actor,'action':action}])[-200:]
    changed=db.execute(update(RequestRecord).where(RequestRecord.id==record.id,RequestRecord.version==expected_version).values(data=data,version=expected_version+1))
    if changed.rowcount!=1: raise HTTPException(409,'This request changed. Reload before saving.')
    db.flush();db.refresh(record);return record
