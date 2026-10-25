"""Private Gmail accounts reuse the existing workspace isolation boundary."""
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select, update, delete
from ..models import Member, Workspace, Mailbox, SessionToken, Device, Reminder, OAuthState

GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly'


def complete_personal_sign_in(db, settings, identity, tokens, reconnect_member_id=None):
    email = identity['email'].lower()
    subject = identity['sub']
    by_subject = db.scalar(select(Member).where(Member.subject == subject))
    by_email = db.scalar(select(Member).where(Member.email == email))
    if by_subject and by_email and by_subject.id != by_email.id:
        raise HTTPException(403, 'Unable to sign in with this account.')
    member = by_subject or by_email
    if member and (not member.active or (member.subject and member.subject != subject)):
        raise HTTPException(403, 'Unable to sign in with this account.')
    # A reconnect must belong to the signed-in Google identity, even when the
    # browser's account chooser defaults to another account.
    if reconnect_member_id and (not member or member.id != reconnect_member_id or member.subject != subject):
        raise HTTPException(403, 'Choose the Google account you used to sign in.')
    if GMAIL_READONLY not in tokens.get('scope', '').split():
        raise HTTPException(400, 'Allow read-only Gmail access to import your events.')
    workspace = db.get(Workspace, member.workspace_id) if member else None
    personal = workspace is not None and workspace.owner_subject == subject
    box = db.scalar(select(Mailbox).where(Mailbox.workspace_id == workspace.id)) if personal else None
    refresh = tokens.get('refresh_token')
    if not refresh and (not box or not box.encrypted_token or box.status == 'reconnect_required'):
        raise HTTPException(400, 'Reconnect with Google to allow offline Gmail access.')
    if not personal:
        workspace = db.scalar(select(Workspace).where(Workspace.owner_subject == subject))
        if workspace is None:
            workspace = Workspace(name='Your events', timezone=settings.workspace_timezone, owner_subject=subject)
            db.add(workspace); db.flush()
        if member:
            # Do not move shared records into a private account. Preserve them
            # in their previous workspace and retire old sessions/reminders.
            db.execute(update(SessionToken).where(SessionToken.member_id == member.id).values(revoked=True))
            db.execute(update(Device).where(Device.member_id == member.id).values(active=False))
            db.execute(update(Reminder).where(Reminder.member_id == member.id).values(status='cancelled'))
            db.execute(delete(OAuthState).where(OAuthState.member_id == member.id))
            member.workspace_id = workspace.id
        else:
            member = Member(workspace_id=workspace.id, email=email)
            db.add(member)
    member.email = email
    member.role = 'user'
    member.subject = subject
    member.name = identity.get('name') or 'Your account'
    db.flush()
    if box is None:
        box = Mailbox(workspace_id=workspace.id, email=email, encrypted_token='')
        db.add(box)
    if refresh:
        box.encrypted_token = Fernet(settings.encryption_key.encode()).encrypt(refresh.encode()).decode()
    box.email = email
    box.status = 'connected'
    box.error = None
    return member
