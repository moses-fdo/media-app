import base64
from datetime import datetime, timezone
from bs4 import BeautifulSoup

def decode(value):
    try:return base64.urlsafe_b64decode(value+'='*(-len(value)%4)).decode('utf-8',errors='replace')
    except Exception:return ''
def parse_message(raw):
    payload=raw.get('payload',{});headers={h['name'].lower():h['value'] for h in payload.get('headers',[])}
    plain=[];html=[];attachments=[]
    def visit(part):
        body=part.get('body',{});mime=part.get('mimeType','')
        if part.get('filename'):
            attachments.append({'name':part['filename'],'mime_type':mime,'provider_id':body.get('attachmentId'),'inline_data':body.get('data'),'size':body.get('size',0),'status':'pending'})
        elif mime=='text/plain':plain.append(decode(body.get('data','')))
        elif mime=='text/html':
            soup=BeautifulSoup(decode(body.get('data','')),'html.parser')
            for tag in soup(['script','style','iframe','object']):tag.decompose()
            for tag in soup.select('blockquote, .gmail_quote'):tag.decompose()
            # Keep block/line boundaries so HTML templates retain their field labels.
            for tag in soup.find_all('br'):tag.replace_with('\n')
            for tag in soup.find_all(['p','div','li','tr']):tag.insert_after('\n')
            html.append(soup.get_text('',strip=False))
        for child in part.get('parts',[]):visit(child)
    visit(payload)
    return {'subject':headers.get('subject','(No subject)'),'sender':headers.get('from',''),'received_at':datetime.fromtimestamp(int(raw.get('internalDate','0'))/1000,timezone.utc).isoformat(),'body':'\n'.join(plain or html)[:100000],'attachments':attachments}
