import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc).isoformat()
class Workspace(Base):
    __tablename__='workspaces'
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str]=mapped_column(default='Media department')
    timezone: Mapped[str]=mapped_column(default='Asia/Kolkata')
class Member(Base):
    __tablename__='members'
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    workspace_id: Mapped[str]=mapped_column(ForeignKey('workspaces.id'))
    email: Mapped[str]=mapped_column(unique=True)
    subject: Mapped[str|None]=mapped_column(nullable=True, unique=True)
    name: Mapped[str]=mapped_column(default='Staff')
    role: Mapped[str]=mapped_column(default='staff')
    active: Mapped[bool]=mapped_column(default=True)
    preferences: Mapped[dict]=mapped_column(JSON, default=lambda:{'offsets':[1440,60]})
class SessionToken(Base):
    __tablename__='sessions'
    token_hash: Mapped[str]=mapped_column(String, primary_key=True)
    member_id: Mapped[str]=mapped_column(ForeignKey('members.id'))
    family: Mapped[str]=mapped_column(default=uid)
    kind: Mapped[str]=mapped_column(default='access')
    expires: Mapped[float]
    revoked: Mapped[bool]=mapped_column(default=False)
class OAuthState(Base):
    __tablename__='oauth_states'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    verifier: Mapped[str]
    challenge: Mapped[str]
    intent: Mapped[str]
    member_id: Mapped[str|None]=mapped_column(nullable=True)
    expires: Mapped[float]
class Mailbox(Base):
    __tablename__='mailboxes'
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    workspace_id: Mapped[str]=mapped_column(ForeignKey('workspaces.id'), unique=True)
    email: Mapped[str]
    encrypted_token: Mapped[str]=mapped_column(Text)
    history_id: Mapped[str|None]=mapped_column(nullable=True)
    status: Mapped[str]=mapped_column(default='connected')
    last_synced: Mapped[str|None]=mapped_column(nullable=True)
    error: Mapped[str|None]=mapped_column(nullable=True)
class Message(Base):
    __tablename__='messages'
    __table_args__=(UniqueConstraint('mailbox_id','provider_id'),)
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    workspace_id: Mapped[str]=mapped_column(ForeignKey('workspaces.id'))
    mailbox_id: Mapped[str]=mapped_column(ForeignKey('mailboxes.id'))
    provider_id: Mapped[str]
    thread_id: Mapped[str]
    subject: Mapped[str]=mapped_column(default='')
    sender: Mapped[str]=mapped_column(default='')
    received_at: Mapped[str]=mapped_column(default=now)
    body: Mapped[str]=mapped_column(Text, default='')
    attachments: Mapped[list]=mapped_column(JSON, default=list)
    status: Mapped[str]=mapped_column(default='queued')
    classification: Mapped[str|None]=mapped_column(nullable=True)
    error: Mapped[str|None]=mapped_column(nullable=True)
class RequestRecord(Base):
    __tablename__='requests'
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    workspace_id: Mapped[str]=mapped_column(ForeignKey('workspaces.id'), index=True)
    version: Mapped[int]=mapped_column(Integer, default=1)
    data: Mapped[dict]=mapped_column(JSON)
    created_at: Mapped[str]=mapped_column(default=now)
class Device(Base):
    __tablename__='devices'
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    member_id: Mapped[str]=mapped_column(ForeignKey('members.id'))
    token: Mapped[str]=mapped_column(unique=True)
    active: Mapped[bool]=mapped_column(default=True)
class Reminder(Base):
    __tablename__='reminders'
    __table_args__=(UniqueConstraint('request_id','revision','member_id','offset'),)
    id: Mapped[str]=mapped_column(String, primary_key=True, default=uid)
    request_id: Mapped[str]=mapped_column(ForeignKey('requests.id'))
    member_id: Mapped[str]=mapped_column(ForeignKey('members.id'))
    revision: Mapped[int]
    offset: Mapped[int]
    due: Mapped[str]
    status: Mapped[str]=mapped_column(default='pending')
    attempts: Mapped[int]=mapped_column(default=0)
    delivery: Mapped[list]=mapped_column(JSON, default=list)
