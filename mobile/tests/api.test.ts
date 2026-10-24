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
