from datetime import datetime,timedelta,timezone
from sqlalchemy import select
from app.models import Reminder
from app.requests.service import create_request
from app.reminders.service import schedule_request_reminders

def test_reminders_deduplicate_and_cancel(app):
    with app.state.db() as db:
        future=(datetime.now(timezone.utc)+timedelta(days=3)).isoformat()
        r=create_request(db,'w1',{'title':'Future event','event_start':future,'setup_deadline':future})
        schedule_request_reminders(db,r);db.commit();schedule_request_reminders(db,r);db.commit()
        reminders=list(db.scalars(select(Reminder)))
        assert sorted(x.offset for x in reminders)==[60,1440]
        from copy import deepcopy
        d=deepcopy(r.data);d['status']='completed';r.data=d;schedule_request_reminders(db,r);db.commit()
        assert all(x.status=='cancelled' for x in db.scalars(select(Reminder)))

def test_notification_preferences_validate(client,auth):
    assert client.put('/api/v1/reminder-preferences',headers=auth,json={'offsets':[-1]}).status_code==422
    assert client.put('/api/v1/reminder-preferences',headers=auth,json={'offsets':[30,60]}).status_code==200
    assert client.get('/api/v1/me',headers=auth).json()['preferences']['offsets']==[30,60]
