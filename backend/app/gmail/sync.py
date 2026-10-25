import httpx
from sqlalchemy import select,update
from ..models import Message, now
from .mime import parse_message

def sync_mailbox(db,box,client,days=30):
    db.refresh(box)
    if not box.encrypted_token or box.status=='reconnect_required':return
    box.status='syncing';box.error=None;db.commit()
    from ..extraction.cleanup import exclude_non_template_imports
    exclude_non_template_imports(db, box)
    initial=not box.history_id
    checkpoint=client.profile()['historyId'] if initial else box.history_id
    token=None
    while True:
        db.refresh(box)
        if not box.encrypted_token or box.status=='reconnect_required':return
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
            try:
                with db.begin_nested():
                    db.add(Message(workspace_id=box.workspace_id,mailbox_id=box.id,provider_id=id,thread_id=raw.get('threadId',id),**parse_message(raw)))
                    db.flush()
                db.commit()
            except Exception as e:
                db.rollback()
                err = str(e).lower()
                if 'unique' in err or 'duplicate' in err or 'integrity' in err:
                    continue
                raise
        token=page.get('nextPageToken')
        if not token:
            db.execute(update(type(box)).where(type(box).id==box.id,type(box).encrypted_token!='',type(box).status!='reconnect_required').values(history_id=checkpoint if initial else page.get('historyId',checkpoint),last_synced=now(),status='connected'))
            db.commit();db.refresh(box);break

def run_in_process_sync(settings, mailbox_id: str, days: int = 30, full: bool = False, retry_failed: bool = False):
    import base64
    from ..database import database
    from ..models import Mailbox
    from ..extraction.provider import ExtractionProvider
    from ..extraction.attachments import extract_attachment
    from ..extraction.service import process_message
    from .client import GmailClient, ReconnectRequired

    engine, sessions = database(settings.database_url)
    try:
        with sessions() as db:
            box = db.get(Mailbox, mailbox_id)
            if not box or not box.encrypted_token or box.status=='reconnect_required':
                return
            try:
                if full:box.history_id=None;db.commit()
                client = GmailClient(settings, box)
                sync_mailbox(db, box, client, days)
                
                provider = ExtractionProvider(settings)
                queued = db.scalars(
                    select(Message).where(Message.mailbox_id == mailbox_id, Message.status.in_(['queued', 'failed'] if retry_failed else ['queued'])).order_by(Message.status.desc(),Message.received_at).limit(100)
                ).all()
                for m in queued:
                    try:
                        attachments = []
                        g_client = None
                        for a in (m.attachments or []):
                            if a.get('status') == 'pending':
                                if a.get('size', 0) > 10 * 1024 * 1024:
                                    a = {**a, 'status': 'manual_review', 'reason': 'Attachment exceeds 10 MB'}
                                else:
                                    if a.get('inline_data'):
                                        data = base64.urlsafe_b64decode(a['inline_data'] + '=' * (-len(a['inline_data']) % 4))
                                    elif a.get('provider_id'):
                                        g_client = g_client or GmailClient(settings, box)
                                        data = g_client.get_attachment(m.provider_id, a['provider_id'])
                                    else:
                                        data = b''
                                    a = {**a, **extract_attachment(data, a.get('mime_type', 'application/octet-stream'))}
                            attachments.append({k: v for k, v in a.items() if k != 'inline_data'})
                        m.attachments = attachments
                        process_message(db, m, provider)
                    except Exception as err:
                        db.rollback()
                        m = db.get(Message, m.id)
                        if m:
                            m.status = 'failed'
                            m.error = f'Analysis failed: {err}'
                            db.commit()
            except ReconnectRequired:
                box.status = 'reconnect_required'
                box.error = 'Reconnect Gmail to resume synchronization'
                db.commit()
            except Exception as e:
                db.rollback()
                box = db.get(Mailbox, mailbox_id)
                if box:
                    box.status = 'error'
                    box.error = f'Synchronization failed: {e}'
                    db.commit()
    finally:
        engine.dispose()
