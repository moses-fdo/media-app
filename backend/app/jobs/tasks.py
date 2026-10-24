import base64
from datetime import datetime,timedelta,timezone
from sqlalchemy import select
from redis import Redis
from ..config import Settings
from ..database import database
from ..models import Mailbox,Message,Reminder
from ..gmail.client import GmailClient,ReconnectRequired
from ..gmail.sync import sync_mailbox
from ..extraction.provider import ExtractionProvider
from ..extraction.attachments import extract_attachment
from ..extraction.service import process_message
from ..reminders.delivery import deliver_due_reminders,collect_push_receipts
from .celery_app import celery

def resources():
    c=Settings();engine,sessions=database(c.database_url);return c,engine,sessions
@celery.task(name='media.sync_all')
def sync_all():
    c,e,sessions=resources()
    with sessions() as db:
        for box in db.scalars(select(Mailbox).where(Mailbox.status!='reconnect_required')):sync_one.delay(box.id)
    e.dispose()
@celery.task(name='media.sync_one',bind=True,max_retries=5)
def sync_one(self,id,days=30):
    c,e,sessions=resources();lock=Redis.from_url(c.redis_url).lock('mailbox:'+id,timeout=900,blocking_timeout=0)
    if not lock.acquire(blocking=False):e.dispose();return
    try:
        with sessions() as db:
            box=db.get(Mailbox,id)
            if not box:return
            try:
                client=GmailClient(c,box);sync_mailbox(db,box,client,days)
                for m in db.scalars(select(Message).where(Message.mailbox_id==id,Message.status.in_(['queued','failed'])).limit(100)):extract_one.delay(m.id)
            except ReconnectRequired:
                box.status='reconnect_required';box.error='Reconnect Gmail to resume synchronization';db.commit()
            except Exception:
                db.rollback();box=db.get(Mailbox,id);box.status='error';box.error='Synchronization failed; retry scheduled';db.commit();raise self.retry(countdown=min(600,30*2**self.request.retries))
    finally:
        try:lock.release()
        except Exception:pass
        e.dispose()
@celery.task(name='media.extract_one',bind=True,max_retries=4,soft_time_limit=180,time_limit=210)
def extract_one(self,id):
    c,e,sessions=resources()
    try:
        with sessions() as db:
            m=db.scalar(select(Message).where(Message.id==id).with_for_update())
            if not m or m.status=='processed':return
            try:
                attachments=[];client=None
                for a in m.attachments:
                    if a.get('status')=='pending':
                        if a.get('size',0)>10*1024*1024:a={**a,'status':'manual_review','reason':'Attachment exceeds 10 MB'}
                        else:
                            if a.get('inline_data'):data=base64.urlsafe_b64decode(a['inline_data']+'='*(-len(a['inline_data'])%4))
                            elif a.get('provider_id'):
                                client=client or GmailClient(c,db.get(Mailbox,m.mailbox_id));data=client.get_attachment(m.provider_id,a['provider_id'])
                            else:data=b''
                            a={**a,**extract_attachment(data,a['mime_type'])}
                    attachments.append({k:v for k,v in a.items() if k!='inline_data'})
                m.attachments=attachments
                process_message(db,m,ExtractionProvider(c))
            except Exception:
                db.rollback();m=db.get(Message,id);m.status='failed';m.error='Analysis failed. Check provider configuration or retry.';db.commit();raise self.retry(countdown=60*2**self.request.retries)
    finally:e.dispose()
@celery.task(name='media.reminders')
def reminders():
    c,e,sessions=resources()
    with sessions() as db:deliver_due_reminders(db);collect_push_receipts(db)
    e.dispose()
@celery.task(name='media.retention')
def retention():
    c,e,sessions=resources();cutoff=(datetime.now(timezone.utc)-timedelta(days=c.source_retention_days)).isoformat()
    with sessions() as db:
        for m in db.scalars(select(Message).where(Message.received_at<cutoff,Message.status=='processed')):m.body='Source expired under retention policy';m.attachments=[]
        db.commit()
    e.dispose()
