import {Tokens} from './types';
export class ApiError extends Error {constructor(message:string,public status:number){super(message)}}
export class ApiClient {
 tokens:Tokens|null=null; private refreshing:Promise<void>|null=null;
 private transport:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>;
 constructor(public base:string,private persist:(v:Tokens|null)=>Promise<void>,transport?:typeof fetch){
  this.transport = transport ? (...args) => transport(...args) : (...args) => globalThis.fetch(...args);
 }
 async setSession(value:Tokens|null){this.tokens=value;await this.persist(value)}
 private async refresh(){
  if(!this.refreshing){this.refreshing=(async()=>{
   try{
    const r=await this.transport(this.base+'/api/v1/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:this.tokens?.refresh_token})});
    if(!r.ok){if(r.status===401){await this.setSession(null);throw new ApiError('Sign in again to continue',401)}throw new ApiError('Sign-in service unavailable. Try again.',r.status)}
    await this.setSession(await r.json());
   }finally{this.refreshing=null}
  })()}
  return this.refreshing;
 }
 async request<T>(path:string,method='GET',body?:unknown,retry=true):Promise<T>{
  const token=this.tokens?.access_token;
  const r=await this.transport(this.base+'/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(r.status===401&&retry&&this.tokens){if(token===this.tokens.access_token)await this.refresh();return this.request(path,method,body,false)}
  const data=await r.json();
  if(!r.ok){if(r.status===401)await this.setSession(null);throw new ApiError(data.error?.message|| (Array.isArray(data.detail)?data.detail.map((x:any)=>x.msg).join('. '):data.detail)||'Unable to complete this action',r.status)}
  return data;
 }
 get<T>(path:string){return this.request<T>(path)}
 post<T>(path:string,body?:unknown){return this.request<T>(path,'POST',body)}
 patch<T>(path:string,body:unknown){return this.request<T>(path,'PATCH',body)}
 put<T>(path:string,body?:unknown){return this.request<T>(path,'PUT',body)}
 delete<T>(path:string,body?:unknown){return this.request<T>(path,'DELETE',body)}
}
