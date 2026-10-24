import httpx
from sqlalchemy import select
from ..models import Message, now
from .mime import parse_message

def sync_mailbox(db,box,client,days=30):
    box.status='syncing';box.error=None;db.commit()
    initial=not box.history_id
    checkpoint=client.profile()['historyId'] if initial else box.history_id
    token=None
    while True:
        try:page=client.list_messages(token,days) if initial else client.list_history(checkpoint,token)
        except httpx.HTTPStatusError as e:
            if not initial and e.response.status_code==404:
                initial=True;token=None;checkpoint=client.profile()['historyId'];continue
            raise
        ids=[m['id'] for m in page.get('messages',[])] if initial else [entry['message']['id'] for h in page.get('history',[]) for entry in h.get('messagesAdded',[])]
        for id in dict.fromkeys(ids):
            if db.scalar(select(Message).where(Message.mailbox_id==box.id,Message.provider_id==id)):continue
            try:raw=client.get_message(id)
            except httpx.HTTPStatusError as e:
                if e.response.status_code==404:continue
                raise
            if set(raw.get('labelIds',[])) & {'SPAM','TRASH','SENT','DRAFT'}:continue
            db.add(Message(workspace_id=box.workspace_id,mailbox_id=box.id,provider_id=id,thread_id=raw.get('threadId',id),**parse_message(raw)));db.commit()
        token=page.get('nextPageToken')
        if not token:
            box.history_id=checkpoint if initial else page.get('historyId',checkpoint);box.last_synced=now();box.status='connected';db.commit();break
