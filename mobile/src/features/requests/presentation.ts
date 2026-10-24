import {MediaRequest} from '../../api/types';
export function dateKey(value:string|Date,zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}
export function clock(value:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(value))}
export function formatDeadline(value:string|null,zone:string){return value?'Setup by '+clock(value,zone):'Deadline to confirm'}
export function dateLabel(value:string|null,zone:string){return value?new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(value)):'Date to confirm'}
export function groupRequests(items:MediaRequest[],zone:string,now=new Date()){
 const today=dateKey(now,zone);const tomorrow=dateKey(new Date(now.getTime()+86400000),zone);
 const groups=new Map<string,MediaRequest[]>();
 for(const item of [...items].sort((a,b)=>(a.setup_deadline?new Date(a.setup_deadline).getTime():Infinity)-(b.setup_deadline?new Date(b.setup_deadline).getTime():Infinity))){const date=item.setup_deadline;const day=date?dateKey(date,zone):null;const done=['completed','cancelled'].includes(item.status);const key=!date?'Needs review':!done&&new Date(date)<now?'Overdue':day===today?'Today':day===tomorrow?'Tomorrow':dateLabel(date,zone);groups.set(key,[...(groups.get(key)||[]),item])}
 return Array.from(groups,([title,data])=>({title,data}));
}
export const statusLabel=(s:string)=>({needs_review:'Needs review',new:'New',in_progress:'In progress',confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled',dismissed:'Dismissed'}[s]||s);
