import hashlib, secrets, time
from sqlalchemy import select, update
from fastapi import Request, HTTPException, Depends
from ..models import SessionToken, Member, uid

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
    if not member or not member.active: raise HTTPException(401,'Staff access removed')
    return member

def require_admin(member=Depends(require_member)):
    if member.role!='admin': raise HTTPException(403,'Administrator access required')
    return member
