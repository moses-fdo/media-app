import {ApiClient} from '../src/api/client';
test('refreshes once for concurrent expired requests and persists replacement session',async()=>{
 let refreshes=0; const saved:any[]=[];
 const transport=jest.fn(async(url:string,options:any)=>{
   if(url.endsWith('/auth/refresh')){refreshes++;return new Response(JSON.stringify({access_token:'new',refresh_token:'next'}),{status:200});}
   return new Response(JSON.stringify(options.headers.Authorization==='Bearer new'?{ok:true}:{error:{message:'expired'}}),{status:options.headers.Authorization==='Bearer new'?200:401});
 });
 const api=new ApiClient('https://api.example',async v=>{saved.push(v)},transport as any);
 api.tokens={access_token:'old',refresh_token:'refresh'};
 expect(await Promise.all([api.get('/me'),api.get('/me')])).toEqual([{ok:true},{ok:true}]);
 expect(refreshes).toBe(1);expect(saved.at(-1).refresh_token).toBe('next');
});
test('failed refresh clears session instead of pretending save succeeded',async()=>{
 const saved:any[]=[];const api=new ApiClient('https://api.example',async v=>{saved.push(v)},async()=>new Response('{}',{status:401}));api.tokens={access_token:'old',refresh_token:'old'};
 await expect(api.get('/me')).rejects.toThrow('Sign in');expect(saved.at(-1)).toBe(null);
});

test('non-JSON proxy errors produce a useful error',async()=>{
 const api=new ApiClient('https://api.example',async()=>{},async()=>new Response('<html>Bad gateway</html>',{status:502}));
 await expect(api.get('/me')).rejects.toThrow('unexpected response');
});

test('network failures are actionable and retain the signed-in session',async()=>{
 const save=jest.fn();const api=new ApiClient('https://api.example',save,async()=>{throw new TypeError('Failed to fetch')});
 api.tokens={access_token:'existing',refresh_token:'existing'};
 await expect(api.get('/me')).rejects.toThrow('Check your connection');
 expect(save).not.toHaveBeenCalled();
});

test('Google sign-in startup survives a cold server taking longer than the ordinary request timeout',async()=>{
 jest.useFakeTimers();
 try {
  const transport=jest.fn((_url:RequestInfo|URL,options?:RequestInit)=>new Promise<Response>((resolve,reject)=>{
   const timer=setTimeout(()=>resolve(new Response(JSON.stringify({url:'https://accounts.google.com/test'}))),30000);
   options?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('aborted'));});
  }));
  const api=new ApiClient('https://api.example',async()=>{},transport);
  const result=expect(api.post('/auth/start',{challenge:'fixture',redirect_uri:'mediaops://auth'})).resolves.toEqual({url:'https://accounts.google.com/test'});
  await jest.advanceTimersByTimeAsync(30000);await result;
  expect(transport).toHaveBeenCalledTimes(1);
 } finally {jest.useRealTimers();}
});
test('ordinary writes still time out once without being automatically repeated',async()=>{
 jest.useFakeTimers();
 try {
  const transport=jest.fn((_url:RequestInfo|URL,options?:RequestInit)=>new Promise<Response>((_resolve,reject)=>{options?.signal?.addEventListener('abort',()=>reject(new Error('aborted')));}));
  const api=new ApiClient('https://api.example',async()=>{},transport);
  const result=expect(api.post('/requests',{title:'Event'})).rejects.toThrow('timed out');
  await jest.advanceTimersByTimeAsync(20000);await result;
  expect(transport).toHaveBeenCalledTimes(1);
 } finally {jest.useRealTimers();}
});
