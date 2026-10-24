import base64
from sqlalchemy import select
from app.models import Mailbox,Message

def encoded(s): return base64.urlsafe_b64encode(s.encode()).decode()
class GmailFake:
    def profile(self): return {'historyId':'42'}
    def list_messages(self, page_token=None, days=30):
        return {'messages':[{'id':'b'}]} if page_token else {'messages':[{'id':'a'}],'nextPageToken':'next'}
    def get_message(self,id):
        return {'id':id,'threadId':'thread-'+id,'internalDate':'1792895400000','labelIds':['INBOX'],'payload':{'mimeType':'text/plain','headers':[{'name':'Subject','value':'AV request'},{'name':'From','value':'registrar@example.edu'}],'body':{'data':encoded('Please provide four microphones')}}}
    def list_history(self,start,page_token=None):return {'history':[{'messagesAdded':[{'message':{'id':'a'}}]}],'historyId':'43'}

def test_paginated_sync_idempotent_and_checkpoint(app):
    from app.gmail.sync import sync_mailbox
    with app.state.db() as db:
        box=Mailbox(workspace_id='w1',email='dept@example.edu',encrypted_token='test');db.add(box);db.commit()
        sync_mailbox(db,box,GmailFake())
        assert len(list(db.scalars(select(Message))))==2
        assert box.history_id=='42'
        sync_mailbox(db,box,GmailFake())
        assert len(list(db.scalars(select(Message))))==2
        assert box.history_id=='43'
        assert all(m.status=='queued' for m in db.scalars(select(Message)))

def test_mime_html_and_nested_attachments():
    from app.gmail.mime import parse_message
    result=parse_message({'internalDate':'1792895400000','payload':{'parts':[{'mimeType':'text/html','body':{'data':encoded('<p>Need a projector</p><script>bad()</script>')}},{'filename':'schedule.pdf','mimeType':'application/pdf','body':{'attachmentId':'attach','size':32}}]}})
    assert 'Need a projector' in result['body']
    assert 'bad()' not in result['body']
    assert result['attachments'][0]['provider_id']=='attach'
