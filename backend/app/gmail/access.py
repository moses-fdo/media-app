"""Apply the same mailbox ownership boundary to every sync worker."""
from sqlalchemy import select
from ..models import Member, Workspace


def may_read_mailbox(settings, db, box):
    if not settings.personal_accounts:
        return True
    if box is None:
        return False
    workspace = db.get(Workspace, box.workspace_id)
    if not workspace or not workspace.owner_subject:
        return False
    return db.scalar(select(Member.id).where(
        Member.workspace_id == workspace.id,
        Member.subject == workspace.owner_subject,
        Member.email == box.email,
        Member.active == True,
    )) is not None
