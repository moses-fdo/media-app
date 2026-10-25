import hashlib, secrets, time
from sqlalchemy import select, update
from fastapi import Request, HTTPException, Depends
from ..models import SessionToken, Member, Workspace, uid

def digest(value): return hashlib.sha256(value.encode()).hexdigest()
def issue_session(db, member_id, family=None):
    family=family or uid(); result={}
    for kind,seconds in [('access',900),('refresh',2592000)]:
        token=secrets.token_urlsafe(48)
        db.add(SessionToken(token_hash=digest(token),member_id=member_id,family=family,kind=kind,expires=time.time()+seconds))
        result[kind+'_token']=token
    return {**result,'expires_in':900}

def get_session(request: Request):
    with request.app.state.db() as db: yield db

def require_member(request: Request,db=Depends(get_session)):
    value=request.headers.get('Authorization','')
    if not value.startswith('Bearer '): raise HTTPException(401,'Sign in required')
    session=db.get(SessionToken,digest(value[7:]))
    if not session or session.kind!='access' or session.revoked or session.expires<time.time(): raise HTTPException(401,'Session expired. Sign in again.')
    member=db.get(Member,session.member_id)
    if not member or not member.active: raise HTTPException(401,'Account access unavailable')
    verify_personal_account(request.app.state.settings,db,member)
    return member

def require_admin(request:Request,member=Depends(require_member)):
    if request.app.state.settings.personal_accounts: raise HTTPException(403,'This action is unavailable for personal accounts.')
    if member.role!='admin': raise HTTPException(403,'Administrator access required')
    return member


def require_account_owner(request: Request, member=Depends(require_member)):
    if not request.app.state.settings.personal_accounts and member.role != 'admin':
        raise HTTPException(403, 'Administrator access required')
    return member


def verify_personal_account(settings, db, member):
    if settings.personal_accounts:
        workspace = db.get(Workspace, member.workspace_id)
        if not member.subject or not workspace or workspace.owner_subject != member.subject:
            raise HTTPException(401, 'Sign in again to connect your Gmail.')
