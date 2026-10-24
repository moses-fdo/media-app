import base64
import httpx
from cryptography.fernet import Fernet
class ReconnectRequired(Exception): pass
class GmailClient:
    def __init__(self,settings,mailbox):
        token=Fernet(settings.encryption_key.encode()).decrypt(mailbox.encrypted_token.encode()).decode()
        response=httpx.post('https://oauth2.googleapis.com/token',data={'grant_type':'refresh_token','refresh_token':token,'client_id':settings.google_client_id,'client_secret':settings.google_client_secret},timeout=20)
        if response.status_code in (400,401):raise ReconnectRequired('Gmail authorization expired')
        response.raise_for_status();self.access_token=response.json()['access_token']
    def get(self,path,params=None):
        r=httpx.get('https://gmail.googleapis.com/gmail/v1/users/me/'+path,params=params,headers={'Authorization':'Bearer '+self.access_token},timeout=30)
        if r.status_code==401:raise ReconnectRequired('Gmail authorization expired')
        r.raise_for_status();return r.json()
    def profile(self):return self.get('profile')
    def list_messages(self,page_token=None,days=30):return self.get('messages',{'q':f'newer_than:{days}d -in:spam -in:trash -in:sent','maxResults':100,**({'pageToken':page_token} if page_token else {})})
    def get_message(self,id):return self.get('messages/'+id,{'format':'full'})
    def list_history(self,start,page_token=None):return self.get('history',{'startHistoryId':start,'historyTypes':'messageAdded','maxResults':100,**({'pageToken':page_token} if page_token else {})})
    def get_attachment(self,message_id,attachment_id):
        data=self.get(f'messages/{message_id}/attachments/{attachment_id}')['data']
        return base64.urlsafe_b64decode(data+'='*(-len(data)%4))
