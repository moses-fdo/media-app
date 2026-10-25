import secrets, time, base64, hashlib
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete
from google.oauth2 import id_token
from google.auth.transport.requests import Request as GoogleRequest
from cryptography.fernet import Fernet
from .sessions import get_session, require_member, require_admin, digest, issue_session
from ..models import SessionToken, OAuthState, Member, Workspace, Mailbox, Device
router=APIRouter(prefix='/api/v1')
class Refresh(BaseModel): refresh_token: str=Field(min_length=1,max_length=256)
class Start(BaseModel):
    challenge: str=Field(min_length=43,max_length=128,pattern=r'^[A-Za-z0-9_-]+$')
    redirect_uri: str|None=None
class Exchange(BaseModel):
    code: str=Field(min_length=1,max_length=256)
    verifier: str=Field(min_length=43,max_length=128,pattern=r'^[A-Za-z0-9._~-]+$')

def challenge(value): return base64.urlsafe_b64encode(hashlib.sha256(value.encode()).digest()).decode().rstrip('=')

def oauth_start(request, body, db, member=None):
    c=request.app.state.settings
    if not c.valid_client_redirect(body.redirect_uri): raise HTTPException(400,'Use an approved app redirect URL')
    if not c.google_client_id or not c.google_client_secret: raise HTTPException(503,'Configure Google OAuth before connecting')
    if member and not c.encryption_key: raise HTTPException(503,'Configure mailbox encryption key first')
    state=secrets.token_urlsafe(32); verifier=secrets.token_urlsafe(48)
    intent_str=('mailbox' if member else 'login')+(f"|{body.redirect_uri}" if body.redirect_uri else '')
    db.add(OAuthState(id=state,verifier=verifier,challenge=body.challenge,intent=intent_str,member_id=member.id if member else None,expires=time.time()+600));db.commit()
    scopes='openid email profile'+(' https://www.googleapis.com/auth/gmail.readonly' if member else '')
    params={'client_id':c.google_client_id,'redirect_uri':c.google_redirect_uri,'response_type':'code','scope':scopes,'state':state,'nonce':state,'code_challenge':challenge(verifier),'code_challenge_method':'S256','access_type':'offline','prompt':'consent' if member else 'select_account'}
    if c.allowed_domain: params['hd']=c.allowed_domain
    return {'url':'https://accounts.google.com/o/oauth2/v2/auth?'+urlencode(params)}
@router.post('/auth/start')
def start(body:Start,request:Request,db=Depends(get_session)): return oauth_start(request,body,db)
@router.post('/mailbox/connect')
def connect(body:Start,request:Request,member=Depends(require_admin),db=Depends(get_session)): return oauth_start(request,body,db,member)
@router.get('/auth/callback')
def callback(request:Request,state:str='',code:str='',error:str='',db=Depends(get_session)):
    c=request.app.state.settings
    record=db.get(OAuthState,state)
    if not record or record.expires<time.time() or record.intent=='handoff': raise HTTPException(400,'Invalid or expired connection attempt')
    # Consume once, before external calls; a failed authorization starts a fresh attempt.
    values={k:getattr(record,k) for k in ('verifier','challenge','intent','member_id')}
    consumed=db.execute(delete(OAuthState).where(OAuthState.id==state));db.commit()
    intent_parts=values['intent'].split('|',1)
    base_intent=intent_parts[0]
    custom_redirect=intent_parts[1] if len(intent_parts)>1 else None
    target_redirect=custom_redirect or c.mobile_redirect_uri
    sep='&' if '?' in target_redirect else '?'

    if consumed.rowcount!=1 or error or not code:
        if custom_redirect:
            return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'Google authorization was cancelled or expired'})}")
        raise HTTPException(400,'Google authorization was cancelled or expired')
    try:
        response=httpx.post('https://oauth2.googleapis.com/token',data={'code':code,'client_id':c.google_client_id,'client_secret':c.google_client_secret,'redirect_uri':c.google_redirect_uri,'grant_type':'authorization_code','code_verifier':values['verifier']},timeout=20)
        response.raise_for_status(); tokens=response.json()
        identity=id_token.verify_oauth2_token(tokens['id_token'],GoogleRequest(),c.google_client_id)
        if not identity.get('email_verified') or identity.get('nonce')!=state: raise ValueError('Invalid identity')
        if c.allowed_domain and not identity.get('email','').lower().endswith(f"@{c.allowed_domain.lower()}"):
            err_msg=f"Only @{c.allowed_domain} accounts are permitted to sign in"
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':err_msg})}")
            raise HTTPException(403,err_msg)
    except HTTPException: raise
    except Exception:
        if custom_redirect:
            return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'Google connection failed. Please try again.'})}")
        raise HTTPException(400,'Google connection failed. Please try again.')
    if base_intent=='mailbox':
        member=db.get(Member,values['member_id'])
        if not member or not member.active or member.role!='admin':
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'Administrator access removed'})}")
            raise HTTPException(403,'Administrator access removed')
        if not tokens.get('refresh_token'):
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'Google did not grant offline access. Reconnect with consent.'})}")
            raise HTTPException(400,'Google did not grant offline access. Reconnect with consent.')
        if 'https://www.googleapis.com/auth/gmail.readonly' not in tokens.get('scope','').split():
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'Read-only Gmail permission is required'})}")
            raise HTTPException(400,'Read-only Gmail permission is required')
        box=db.scalar(select(Mailbox).where(Mailbox.workspace_id==member.workspace_id))
        if box and box.email!=identity['email']:
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':'This workspace is linked to a different Gmail account. Reconnect its original account.'})}")
            raise HTTPException(409,'This workspace is linked to a different Gmail account. Reconnect its original account.')
        if not box: box=Mailbox(workspace_id=member.workspace_id,email=identity['email']);db.add(box)
        box.encrypted_token=Fernet(c.encryption_key.encode()).encrypt(tokens['refresh_token'].encode()).decode();box.status='connected';box.error=None
    else:
        member=db.scalar(select(Member).where(Member.email==identity['email'].lower()))
        if not member and identity['email'].lower()==c.admin_email.lower() and c.admin_email:
            w=db.scalar(select(Workspace))
            if not w: w=Workspace(timezone=c.workspace_timezone);db.add(w);db.flush()
            member=Member(workspace_id=w.id,email=identity['email'].lower(),role='admin',name=identity.get('name','Administrator'));db.add(member);db.flush()
        if not member and c.domain_auto_join:
            # Join only the configured administrator's workspace; never pick an
            # arbitrary workspace or elevate a new domain member to administrator.
            admin=db.scalar(select(Member).where(Member.email==c.admin_email.strip().lower(),Member.active==True,Member.role=='admin'))
            if not admin:
                err_msg='Shared workspace is not ready. Ask the administrator to sign in first.'
                if custom_redirect:
                    return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':err_msg})}")
                raise HTTPException(503,err_msg)
            member=Member(workspace_id=admin.workspace_id,email=identity['email'].lower(),role='staff',name=identity.get('name') or 'Staff')
            db.add(member);db.flush()
        if not member or not member.active:
            err_msg='Ask your administrator to grant staff access'
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':err_msg})}")
            raise HTTPException(403,err_msg)
        if member.subject and member.subject!=identity['sub']:
            err_msg='Identity does not match staff account'
            if custom_redirect:
                return RedirectResponse(f"{target_redirect}{sep}{urlencode({'error':err_msg})}")
            raise HTTPException(403,err_msg)
        member.subject=identity['sub']
    handoff=secrets.token_urlsafe(32)
    db.add(OAuthState(id=digest(handoff),verifier='',challenge=values['challenge'],intent='handoff',member_id=member.id,expires=time.time()+90));db.commit()
    return RedirectResponse(f"{target_redirect}{sep}{urlencode({'code':handoff})}")
@router.post('/auth/exchange')
def exchange(body:Exchange,db=Depends(get_session)):
    state=db.get(OAuthState,digest(body.code))
    if not state or state.intent!='handoff' or state.expires<time.time() or not secrets.compare_digest(state.challenge,challenge(body.verifier)): raise HTTPException(400,'Expired or invalid sign-in code')
    member_id=state.member_id
    used=db.execute(delete(OAuthState).where(OAuthState.id==state.id));db.flush()
    if used.rowcount!=1: raise HTTPException(400,'Sign-in code already used')
    member=db.get(Member,member_id)
    if not member or not member.active: raise HTTPException(403,'Access removed')
    result=issue_session(db,member_id);db.commit();return result
@router.post('/auth/refresh')
def refresh(body:Refresh,db=Depends(get_session)):
    token=db.get(SessionToken,digest(body.refresh_token))
    if not token or token.kind!='refresh': raise HTTPException(401,'Invalid session')
    if token.revoked:
        db.execute(update(SessionToken).where(SessionToken.family==token.family).values(revoked=True));db.commit();raise HTTPException(401,'Session reuse detected. Sign in again.')
    member=db.get(Member,token.member_id)
    if token.expires<time.time() or not member or not member.active: raise HTTPException(401,'Session expired')
    claimed=db.execute(update(SessionToken).where(SessionToken.token_hash==token.token_hash,SessionToken.revoked==False).values(revoked=True))
    if claimed.rowcount!=1: raise HTTPException(401,'Session already refreshed')
    result=issue_session(db,member.id,token.family);db.commit();return result
@router.post('/auth/logout')
def logout(member=Depends(require_member),db=Depends(get_session)):
    db.execute(update(SessionToken).where(SessionToken.member_id==member.id).values(revoked=True))
    db.execute(update(Device).where(Device.member_id==member.id).values(active=False));db.commit();return {'ok':True}
@router.get('/me')
def me(request:Request,member=Depends(require_member),db=Depends(get_session)):
    w=db.get(Workspace,member.workspace_id)
    return {'id':member.id,'name':member.name,'email':member.email,'role':member.role,'workspace_id':w.id,'workspace_name':w.name,'timezone':w.timezone,'preferences':member.preferences,'demo':request.app.state.settings.demo_enabled}
class MemberInput(BaseModel):
    email:str=Field(pattern=r'^[^@\s]+@[^@\s]+\.[^@\s]+$');name:str='Staff';role:str=Field(default='staff',pattern='^(staff|admin)$')
@router.get('/workspace/members')
def members(member=Depends(require_member),db=Depends(get_session)):
    return {'items':[{'id':m.id,'email':m.email,'name':m.name,'role':m.role} for m in db.scalars(select(Member).where(Member.workspace_id==member.workspace_id,Member.active==True))]}
@router.post('/workspace/members',status_code=201)
def add_member(body:MemberInput,request:Request,member=Depends(require_admin),db=Depends(get_session)):
    c=request.app.state.settings
    if c.allowed_domain and not body.email.lower().endswith(f"@{c.allowed_domain.lower()}"):
        raise HTTPException(400,f"Staff emails must be within @{c.allowed_domain}")
    existing=db.scalar(select(Member).where(Member.email==body.email.lower()))
    if existing and existing.workspace_id==member.workspace_id and not existing.active:
        existing.active=True;existing.role=body.role;existing.name=body.name;db.commit();return {'ok':True}
    if existing: raise HTTPException(409,'That staff account already exists')
    db.add(Member(workspace_id=member.workspace_id,**{**body.model_dump(),'email':body.email.lower()}));db.commit();return {'ok':True}
@router.delete('/workspace/members/{id}')
def remove_member(id:str,member=Depends(require_admin),db=Depends(get_session)):
    target=db.get(Member,id)
    if not target or target.workspace_id!=member.workspace_id: raise HTTPException(404,'Staff member not found')
    if target.id==member.id: raise HTTPException(400,'You cannot remove your own access')
    target.active=False
    db.execute(update(SessionToken).where(SessionToken.member_id==target.id).values(revoked=True))
    db.execute(update(Device).where(Device.member_id==target.id).values(active=False));db.commit();return {'ok':True}
