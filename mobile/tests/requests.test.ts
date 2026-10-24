import {groupRequests,formatDeadline} from '../src/features/requests/presentation';
test('groups by the workspace local day instead of UTC',()=>{
 const items=[{id:'a',title:'Late event',setup_deadline:'2026-10-23T23:30:00Z',status:'new'},{id:'b',title:'Unscheduled',setup_deadline:null,status:'needs_review'}] as any;
 expect(groupRequests(items,'Asia/Kolkata',new Date('2026-10-23T22:00:00Z')).map(x=>x.title)).toEqual(['Today','Needs review']);
 expect(formatDeadline(null,'Asia/Kolkata')).toBe('Deadline to confirm');
});

test('an expired deadline today is overdue and deadline groups are chronological',()=>{
 const items=[
  {id:'b',setup_deadline:'2026-10-24T04:00:00Z',status:'new'},
  {id:'a',setup_deadline:'2026-10-24T00:00:00Z',status:'in_progress'},
 ] as any;
 const groups=groupRequests(items,'Asia/Kolkata',new Date('2026-10-24T02:00:00Z'));
 expect(groups.map(x=>x.title)).toEqual(['Overdue','Today']);
 expect(groups[0].data[0].id).toBe('a');
});
