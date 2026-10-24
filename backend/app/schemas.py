from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from .models import uid
Status=Literal['needs_review','new','in_progress','confirmed','completed','cancelled','dismissed']
class Requirement(BaseModel):
    id:str=Field(default_factory=uid)
    title:str=Field(min_length=1,max_length=200)
    department:Literal['audio','video','other']='other'
    quantity:int|None=Field(default=None,gt=0,le=100000)
    notes:str=Field(default='',max_length=5000)
    assignee_id:str|None=None
    status:Literal['pending','prepared','tested']='pending'
    version:int=1
class RequestCreate(BaseModel):
    title:str=Field(min_length=1,max_length=250)
    organizer:str=Field(default='',max_length=500)
    event_start:datetime|None=None
    event_end:datetime|None=None
    setup_deadline:datetime|None=None
    timezone:str='Asia/Kolkata'
    venue:str=Field(default='',max_length=500)
    contact:str=Field(default='',max_length=500)
    summary:str=Field(default='',max_length=5000)
    priority:Literal['low','medium','high']='medium'
    status:Status='new'
    requirements:list[Requirement]=Field(default_factory=list,max_length=100)
    @field_validator('timezone')
    @classmethod
    def zone(cls,v):
        try: ZoneInfo(v)
        except ZoneInfoNotFoundError: raise ValueError('Choose a valid time zone')
        return v
    @field_validator('event_start','event_end','setup_deadline')
    @classmethod
    def aware(cls,v):
        if v and v.tzinfo is None: raise ValueError('An explicit time zone offset is required')
        return v
class RequestPatch(BaseModel):
    expected_version:int=Field(gt=0)
    title:str|None=None
    organizer:str|None=None
    event_start:datetime|None=None
    event_end:datetime|None=None
    setup_deadline:datetime|None=None
    timezone:str|None=None
    venue:str|None=None
    contact:str|None=None
    summary:str|None=None
    priority:Literal['low','medium','high']|None=None
    status:Status|None=None
    requirements:list[Requirement]|None=None
