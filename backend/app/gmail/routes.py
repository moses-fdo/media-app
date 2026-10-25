from fastapi import APIRouter, Depends, Request, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, func
from cryptography.fernet import Fernet
import httpx
from ..auth.sessions import require_member, require_account_owner, get_session
from ..models import Mailbox, Message
from .sync import run_in_process_sync

router = APIRouter(prefix='/api/v1')


def mailbox(db, workspace):
    return db.scalar(select(Mailbox).where(Mailbox.workspace_id == workspace))


def connected_mailbox(request, db, workspace):
    box = mailbox(db, workspace)
    if request.app.state.settings.demo_enabled:
        raise HTTPException(409, 'Demo mode does not connect to Gmail')
    if not box or not box.encrypted_token or box.status == 'reconnect_required':
        raise HTTPException(409, 'Connect or reconnect Gmail first')
    return box


def queue_sync(request, background_tasks, box, days=30, full=False):
    try:
        from ..jobs.tasks import sync_one
        sync_one.delay(box.id, days, full=full, retry_failed=True)
    except Exception:
        if not request.app.state.settings.in_process_sync:
            raise HTTPException(503, 'Background queue unavailable. Retry synchronization shortly.')
        background_tasks.add_task(run_in_process_sync, request.app.state.settings, box.id, days, full, True)


@router.get('/mailbox/status')
def status(request: Request, member=Depends(require_member), db=Depends(get_session)):
    box = mailbox(db, member.workspace_id)
    if not box:
        return {'status': 'disconnected', 'email': None, 'last_synced': None, 'demo': request.app.state.settings.demo_enabled}
    count = lambda state: db.scalar(select(func.count()).select_from(Message).where(Message.mailbox_id == box.id, Message.status == state))
    return {'status': box.status, 'email': box.email, 'last_synced': box.last_synced, 'error': box.error, 'queued': count('queued'), 'failed': count('failed'), 'demo': request.app.state.settings.demo_enabled}


@router.post('/mailbox/sync', status_code=202)
def sync(background_tasks: BackgroundTasks, request: Request, full: bool = Query(False), member=Depends(require_member), db=Depends(get_session)):
    box = connected_mailbox(request, db, member.workspace_id)
    from ..models import RequestRecord
    has_requests = db.scalar(select(RequestRecord.id).where(RequestRecord.workspace_id == member.workspace_id).limit(1)) is not None
    queue_sync(request, background_tasks, box, full=full or not has_requests)
    return {'status': 'queued'}


@router.post('/mailbox/backfill', status_code=202)
def backfill(background_tasks: BackgroundTasks, request: Request, days: int = Query(90, ge=1, le=365), member=Depends(require_account_owner), db=Depends(get_session)):
    box = connected_mailbox(request, db, member.workspace_id)
    # Reset history inside the mailbox worker lock, after dispatch succeeds.
    queue_sync(request, background_tasks, box, days, full=True)
    return {'status': 'queued'}


@router.post('/mailbox/disconnect')
def disconnect(request: Request, member=Depends(require_account_owner), db=Depends(get_session)):
    box = mailbox(db, member.workspace_id)
    if box:
        if box.encrypted_token and not request.app.state.settings.demo_enabled:
            try:
                token = Fernet(request.app.state.settings.encryption_key.encode()).decrypt(box.encrypted_token.encode()).decode()
                response = httpx.post('https://oauth2.googleapis.com/revoke', data={'token': token}, timeout=20)
                if response.status_code not in (200, 400):
                    raise ValueError('Revocation failed')
            except Exception:
                raise HTTPException(502, 'Google revocation failed; please retry')
        box.encrypted_token = ''
        box.status = 'reconnect_required'
        box.error = 'Mailbox disconnected'
        db.commit()
    return {'ok': True}


@router.get('/mailbox/excluded')
def excluded(offset: int = Query(0, ge=0), member=Depends(require_account_owner), db=Depends(get_session)):
    rows = db.scalars(select(Message).where(Message.workspace_id == member.workspace_id, Message.classification == 'irrelevant').order_by(Message.received_at.desc(), Message.id).offset(offset).limit(30))
    return {'items': [{'id': m.id, 'subject': m.subject, 'sender': m.sender, 'received_at': m.received_at} for m in rows]}


@router.post('/mailbox/excluded/{id}/reprocess', status_code=202)
def reprocess(id: str, request: Request, member=Depends(require_account_owner), db=Depends(get_session)):
    message = db.get(Message, id)
    if not message or message.workspace_id != member.workspace_id:
        raise HTTPException(404, 'Message not found')
    box = connected_mailbox(request, db, member.workspace_id)
    if message.mailbox_id != box.id:
        raise HTTPException(409, 'This source belongs to a previously connected mailbox')
    from .client import GmailClient, ReconnectRequired
    from .mime import parse_message
    try:
        raw = GmailClient(request.app.state.settings, box).get_message(message.provider_id)
    except ReconnectRequired:
        raise HTTPException(409, 'Reconnect Gmail before recovering this message')
    except Exception:
        raise HTTPException(502, 'Unable to fetch the source email. Please retry.')
    for key, value in parse_message(raw).items():
        setattr(message, key, value)
    message.status = 'queued'
    # Re-fetch and recheck against the template policy. Valid recovered requests
    # require staff review; unrelated mail must still remain excluded.
    message.classification = 'uncertain'
    db.commit()
    try:
        from ..jobs.tasks import extract_one
        extract_one.delay(message.id)
    except Exception:
        raise HTTPException(503, 'Message recovered; processing will resume when the background queue is available.')
    return {'status': 'queued'}
