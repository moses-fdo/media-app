from datetime import datetime,timezone,timedelta
from sqlalchemy import select,update
import httpx
from ..models import Reminder,RequestRecord,Device,Member

def deliver_due_reminders(db,now=None):
    instant=now or datetime.now(timezone.utc)
    stamp=instant.isoformat()
    cutoff=(instant-timedelta(minutes=5)).isoformat()
    stale=list(db.scalars(select(Reminder).where(Reminder.status=='sending', (Reminder.claimed_at<cutoff)|(Reminder.claimed_at.is_(None)))))
    for job in stale:
        job.status='pending' if job.attempts<5 else 'failed'
        job.claimed_at=None
    db.commit()
    candidates=list(db.scalars(select(Reminder).where(Reminder.status=='pending',Reminder.due<=stamp).limit(100)))
    for job in candidates:
        claimed=db.execute(update(Reminder).where(Reminder.id==job.id,Reminder.status=='pending').values(status='sending',attempts=Reminder.attempts+1,claimed_at=stamp));db.commit()
        if claimed.rowcount!=1:continue
        db.expire_all()
        record=db.get(RequestRecord,job.request_id);member=db.get(Member,job.member_id)
        if not member or not record or not member.active or record.data['status'] not in ('confirmed','in_progress') or record.data.get('deadline_revision',1)!=job.revision:
            job.status='cancelled';db.commit();continue
        devices=list(db.scalars(select(Device).where(Device.member_id==job.member_id,Device.active==True)))
        if not devices:job.status='no_device';db.commit();continue
        try:
            r=httpx.post('https://exp.host/--/api/v2/push/send',json=[{'to':d.token,'title':record.data['title'],'body':'Media setup deadline is approaching. Open the request for details.','data':{'request_id':record.id},'sound':'default'} for d in devices],timeout=20);r.raise_for_status()
            receipts=r.json()['data']
            if not isinstance(receipts,list) or len(receipts)!=len(devices) or any(item.get('status')=='ok' and not item.get('id') for item in receipts):raise ValueError('Incomplete push response')
            job.delivery=[{**item,'device_id':d.id} for d,item in zip(devices,receipts)]
            for d,item in zip(devices,receipts):
                if item.get('details',{}).get('error')=='DeviceNotRegistered':d.active=False
            if any(x.get('status')=='ok' for x in receipts):job.status='submitted'
            elif any(x.get('details',{}).get('error')=='MessageRateExceeded' for x in receipts):raise ValueError('Retry push rate limit')
            else:job.status='failed'
        except Exception:
            job.status='pending' if job.attempts<5 else 'failed'
            job.due=(datetime.now(timezone.utc)+timedelta(seconds=min(3600,30*2**job.attempts))).isoformat()
        db.commit()

def collect_push_receipts(db):
    for job in db.scalars(select(Reminder).where(Reminder.status=='submitted').limit(100)):
        ids=[x['id'] for x in job.delivery if x.get('id')]
        if not ids:job.status='failed';db.commit();continue
        try:
            r=httpx.post('https://exp.host/--/api/v2/push/getReceipts',json={'ids':ids},timeout=20);r.raise_for_status();receipts=r.json()['data']
        except (httpx.HTTPError,KeyError,ValueError):continue
        if not all(x in receipts for x in ids):continue
        job.status='delivered' if all(receipts[x]['status']=='ok' for x in ids) else 'failed'
        for ticket in job.delivery:
            if receipts.get(ticket.get('id'),{}).get('details',{}).get('error')=='DeviceNotRegistered':
                device=db.get(Device,ticket['device_id'])
                if device:device.active=False
        db.commit()
