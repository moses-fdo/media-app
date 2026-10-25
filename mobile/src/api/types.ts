export type Tokens={access_token:string;refresh_token:string};
export type Requirement={id:string;title:string;department:'audio'|'video'|'other';quantity:number|null;notes:string;assignee_id:string|null;status:'pending'|'prepared'|'tested';version:number};
export type MediaRequest={id:string;version:number;title:string;organizer:string;venue:string;contact:string;summary:string;timezone:string;event_start:string|null;event_end:string|null;setup_deadline:string|null;status:string;priority:string;requirements_summary:string;requirements:Requirement[];sources:string[];review_reasons:string[];proposed_updates:{id:string;source_id?:string;review_reasons?:string[];changes:Partial<MediaRequest>}[];activity:{at:string;actor:string;action:string}[]};
export type Member={id:string;name:string;email:string;role:string};
export type Me=Member & {workspace_id:string;workspace_name:string;timezone:string;demo:boolean;preferences:{offsets:number[]}};
export type RequestPage={items:MediaRequest[];next_cursor:string|null;counts:Record<string,number>};
export type Mailbox={status:string;email:string|null;last_synced:string|null;demo:boolean;error?:string;queued?:number;failed?:number};
