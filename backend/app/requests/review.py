from copy import deepcopy
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ValidationError
from ..auth.sessions import require_member, get_session
from ..schemas import RequestCreate
from .service import owned, save_data, output, validate_assignees
from .validation import editable_email_changes, required_review_reasons
from ..reminders.service import schedule_request_reminders

router = APIRouter(prefix='/api/v1')


class Revision(BaseModel):
    expected_version: int = Field(gt=0)


def content_value(key, value):
    if key == 'requirements':
        return [(item['title'].casefold(), item['department'], item.get('quantity'), item.get('notes', '')) for item in (value or [])]
    return value


@router.post('/requests/{id}/proposals/{proposal_id}/{action}')
def proposal(id: str, proposal_id: str, action: str, body: Revision,
             member=Depends(require_member), db=Depends(get_session)):
    if action not in ('accept', 'dismiss'):
        raise HTTPException(404, 'Unknown action')
    record = owned(db, id, member.workspace_id, lock=True)
    if record.version != body.expected_version:
        raise HTTPException(409, 'This request changed. Reload before saving.')
    data = deepcopy(record.data)
    proposed = next((item for item in data['proposed_updates'] if item['id'] == proposal_id), None)
    if not proposed:
        raise HTTPException(404, 'Update not found')
    if action == 'accept':
        changes = editable_email_changes(proposed['changes'])
        for key, original in proposed.get('base_values', {}).items():
            if key in changes and content_value(key, data.get(key)) != content_value(key, original):
                raise HTTPException(409, 'This email update conflicts with newer changes. Dismiss it and apply the desired values manually.')
        try:
            validated = RequestCreate.model_validate({**data, **changes}).model_dump(mode='json')
        except ValidationError:
            raise HTTPException(422, 'The proposed schedule is invalid. Correct the event and setup times before accepting.')
        if 'requirements' in changes:
            old = data.get('requirements', [])
            merged = deepcopy(old)
            for requirement in validated['requirements']:
                match = next((item for item in old if (item['title'].casefold(),item['department']) == (requirement['title'].casefold(),requirement['department'])), None)
                if match:
                    if not requirement.get('notes'):requirement['notes']=match.get('notes','')
                    if requirement.get('quantity') is None:requirement['quantity']=match.get('quantity')
                if not match:
                    merged.append(requirement)
                elif content_value('requirements', [match]) != content_value('requirements', [requirement]):
                    updated={**requirement,'id':match['id'],'assignee_id':match.get('assignee_id'),'status':'pending','version':match.get('version',1)+1}
                    if updated.get('quantity') is None:updated['quantity']=match.get('quantity')
                    merged=[updated if item['id']==match['id'] else item for item in merged]
            validated['requirements'] = merged
            if len(merged)>100:raise HTTPException(422,'A request supports at most 100 equipment items. Edit the list before accepting this update.')
        validate_assignees(db, validated, member.workspace_id)
        if validated['setup_deadline'] != data.get('setup_deadline'):
            data['deadline_revision'] = data.get('deadline_revision', 1) + 1
        # An email cannot reopen a completed/dismissed event or cancel it by itself.
        validated['status'] = data['status']
        data.update(validated)
        reasons = list(dict.fromkeys(required_review_reasons(data) + data.get('review_reasons', []) + proposed.get('review_reasons', [])))
        data['review_reasons'] = reasons
        if reasons and data['status'] not in ('completed', 'cancelled', 'dismissed'):
            data['status'] = 'needs_review'
    data['proposed_updates'] = [item for item in data['proposed_updates'] if item['id'] != proposal_id]
    save_data(db, record, data, body.expected_version, member.name, action.title() + 'ed email update')
    schedule_request_reminders(db, record)
    db.commit()
    return output(record)
