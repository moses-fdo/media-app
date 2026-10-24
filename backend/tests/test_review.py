from copy import deepcopy
from app.models import RequestRecord
from tests.test_requests import BASE

def test_accept_change_preserves_tested_equipment(app,client,auth):
    item=client.post('/api/v1/requests',headers=auth,json=BASE).json()
    rid=item['id']
    with app.state.db() as db:
        r=db.get(RequestRecord,rid);d=deepcopy(r.data);d['requirements'][0]['status']='tested'
        d['proposed_updates']=[{'id':'p1','source_id':'s1','base_version':1,'changes':{**BASE,'venue':'New hall','requirements':[{'title':'Wireless mics','department':'audio','quantity':4},{'title':'Projector','department':'video','quantity':1}]}}];r.data=d;db.commit()
    result=client.post(f'/api/v1/requests/{rid}/proposals/p1/accept',headers=auth,json={'expected_version':1})
    assert result.status_code==200,result.text
    assert result.json()['requirements'][0]['status']=='tested'
    assert result.json()['requirements'][1]['status']=='pending'
    assert result.json()['venue']=='New hall'
    assert not result.json()['proposed_updates']
