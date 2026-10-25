from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from ..models import Reminder, Member

def schedule_request_reminders(db,record):
    data=record.data;revision=data.get('deadline_revision',1)
    db.execute(update(Reminder).where(Reminder.request_id==record.id,Reminder.status=='pending').values(status='cancelled'))
    if data['status'] not in ('confirmed','in_progress') or not data.get('setup_deadline'): return
    deadline=datetime.fromisoformat(data['setup_deadline'])
    for member in db.scalars(select(Member).where(Member.workspace_id==record.workspace_id,Member.active==True)):
        for offset in member.preferences.get('offsets',[1440,60]):
            due=(deadline-timedelta(minutes=offset)).astimezone(timezone.utc).isoformat()
            existing=db.scalar(select(Reminder).where(Reminder.request_id==record.id,Reminder.revision==revision,Reminder.member_id==member.id,Reminder.offset==offset))
            if existing:
                if existing.status=='cancelled' and due>datetime.now(timezone.utc).isoformat():existing.status='pending'
            elif due>datetime.now(timezone.utc).isoformat():db.add(Reminder(request_id=record.id,revision=revision,member_id=member.id,offset=offset,due=due))
