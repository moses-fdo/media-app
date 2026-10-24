from copy import deepcopy
from sqlalchemy import select
from ..models import RequestRecord, Message, uid
from ..requests.service import create_request,save_data
from ..reminders.service import schedule_request_reminders

def process_message(db,message,provider):
    message=db.scalar(select(Message).where(Message.id==message.id).with_for_update())
    if message.status=='processed':return
    analysis=provider.analyze(message)
    message.classification=analysis.classification
    attachment_review=any(a.get('status')=='manual_review' for a in message.attachments)
    if analysis.classification=='irrelevant' and not attachment_review:
        message.body='';message.attachments=[]
    else:
        related=[]
        for r in db.scalars(select(RequestRecord).where(RequestRecord.workspace_id==message.workspace_id)):
            source_ids=r.data.get('sources',[])
            for source_id in source_ids:
                source=db.get(Message,source_id)
                if source and source.thread_id==message.thread_id:related.append(r);break
        events=analysis.events
        if not events:
            from ..schemas import RequestCreate
            events=[RequestCreate(title=message.subject or 'Request needs review')]
        for event in events:
            payload=event.model_dump(mode='json')
            # The model cannot choose workflow status, assignment or preparation state.
            payload['status']='new'
            for req in payload['requirements']:req.update(id=uid(),status='pending',assignee_id=None,version=1)
            reasons=list(analysis.review_reasons)
            if analysis.classification=='uncertain':reasons.append('Confirm this is a media request')
            if attachment_review:reasons.append('Review unsupported or incomplete attachment')
            candidates=[r for r in related if r.data['title'].casefold()==payload['title'].casefold()]
            if not candidates and len(related)==1 and len(events)==1:candidates=related
            if candidates:
                r=candidates[0];data=deepcopy(r.data)
                data['proposed_updates'].append({'id':uid(),'source_id':message.id,'base_version':r.version,'changes':payload,'review_reasons':reasons})
                data['sources']=list(dict.fromkeys(data['sources']+[message.id]))
                save_data(db,r,data,r.version,'Email processing','New email update requires review')
            else:
                record=create_request(db,message.workspace_id,payload,sources=[message.id],review_reasons=reasons)
                schedule_request_reminders(db,record)
        message.attachments=[{k:v for k,v in a.items() if k not in ('inline_data',)} for a in message.attachments]
    message.status='processed';message.error=None;db.commit()
