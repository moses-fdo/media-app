import React,{createContext,useContext,useEffect,useState} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import {QueryClient} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {Tokens,Me} from '../api/types';
import {clearWorkspaceCache} from './cache';
export const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:30000},mutations:{retry:false}}});
const key='media-ops-session';
const store={
  async get(){
    if(Platform.OS==='web'){
      try{return sessionStorage.getItem(key)||localStorage.getItem(key);}catch{return null;}
    }
    return SecureStore.getItemAsync(key);
  },
  async set(v:Tokens|null){
    if(Platform.OS==='web'){
      try{
        if(v){const s=JSON.stringify(v);sessionStorage.setItem(key,s);localStorage.setItem(key,s);}
        else{sessionStorage.removeItem(key);localStorage.removeItem(key);}
      }catch{}
    }else{
      v?await SecureStore.setItemAsync(key,JSON.stringify(v)):await SecureStore.deleteItemAsync(key);
    }
  }
};
const base=process.env.EXPO_PUBLIC_API_URL||'http://localhost:8000';
let onSession:((v:Tokens|null)=>void)|null=null;
export const api=new ApiClient(base,async v=>{await store.set(v);if(!v){queryClient.clear();await clearWorkspaceCache();}onSession?.(v)});
const Context=createContext<{ready:boolean;tokens:Tokens|null;me:Me|null;authError:string|null;login:(demo?:boolean)=>Promise<void>;logout:()=>Promise<void>;connectMailbox:()=>Promise<void>}>({ready:false,tokens:null,me:null,authError:null,login:async()=>{},logout:async()=>{},connectMailbox:async()=>{}});
WebBrowser.maybeCompleteAuthSession();

async function googleFlow(path:string){
  const isWeb=Platform.OS==='web';
  const redirect=isWeb?(window.location.origin+window.location.pathname):'mediaops://auth';
  const random=await Crypto.getRandomBytesAsync(48);
  const verifier=Array.from(random,b=>b.toString(16).padStart(2,'0')).join('');
  const challenge=(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,verifier,{encoding:Crypto.CryptoEncoding.BASE64})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

  if(isWeb){
    try{
      sessionStorage.setItem('oauth_verifier',verifier);
      localStorage.setItem('oauth_verifier',verifier);
      if(path.includes('mailbox')){
        sessionStorage.setItem('oauth_intent','mailbox');
        localStorage.setItem('oauth_intent','mailbox');
      }else{
        sessionStorage.removeItem('oauth_intent');
        localStorage.removeItem('oauth_intent');
      }
    }catch{}
    const {url}=await api.post<{url:string}>(path,{challenge,redirect_uri:redirect});
    window.location.assign(url);
    return new Promise(()=>{});
  }

  // Native flow (Android / iOS)
  const {url}=await api.post<{url:string}>(path,{challenge,redirect_uri:redirect});
  const result=await WebBrowser.openAuthSessionAsync(url,redirect);
  if(result.type!=='success')throw new Error('Sign-in was cancelled. You can try again.');
  const code=new URL(result.url).searchParams.get('code');
  if(!code)throw new Error('Sign-in code was missing. Try again.');
  await api.setSession(await api.post<Tokens>('/auth/exchange',{code,verifier}));
}

export function AuthProvider({children}:{children:React.ReactNode}){
  const [tokens,setTokens]=useState<Tokens|null>(null),[ready,setReady]=useState(false),[me,setMe]=useState<Me|null>(null),[authError,setAuthError]=useState<string|null>(null);

  useEffect(()=>{
    onSession=setTokens;
    let active=true;

    async function init(){
      if(Platform.OS==='web'&&typeof window!=='undefined'){
        const params=new URLSearchParams(window.location.search);
        const code=params.get('code');
        const errParam=params.get('error');
        const verifier=sessionStorage.getItem('oauth_verifier')||localStorage.getItem('oauth_verifier');
        const intent=sessionStorage.getItem('oauth_intent')||localStorage.getItem('oauth_intent');

        if(errParam){
          params.delete('error');
          const clean=params.toString()?`?${params.toString()}`:'';
          window.history.replaceState({},document.title,window.location.pathname+clean);
          if(active)setAuthError(errParam);
        }else if(code&&verifier){
          try{
            sessionStorage.removeItem('oauth_verifier');
            localStorage.removeItem('oauth_verifier');
            sessionStorage.removeItem('oauth_intent');
            localStorage.removeItem('oauth_intent');
          }catch{}

          params.delete('code');
          const clean=params.toString()?`?${params.toString()}`:'';
          window.history.replaceState({},document.title,window.location.pathname+clean);

          try{
            const newTokens=await api.post<Tokens>('/auth/exchange',{code,verifier});
            if(active){
              await api.setSession(newTokens);
              if(intent==='mailbox')await queryClient.invalidateQueries();
              return;
            }
          }catch(err:any){
            if(active)setAuthError(err?.message||'Authentication failed. Please try again.');
          }
        }
      }

      const raw=await store.get();
      if(raw&&active){
        try{
          api.tokens=JSON.parse(raw);
          setTokens(api.tokens);
        }catch{
          store.set(null);
        }
      }
    }

    init().finally(()=>{if(active)setReady(true);});
    return ()=>{active=false;onSession=null;};
  },[]);

  useEffect(()=>{
    if(tokens)api.get<Me>('/me').then(setMe).catch(()=>setMe(null));
    else setMe(null);
  },[tokens]);

  return <Context.Provider value={{ready,tokens,me,authError,login:async demo=>{if(demo)await api.setSession(await api.post<Tokens>('/auth/demo'));else await googleFlow('/auth/start')},logout:async()=>{try{const {unregisterCurrentDevice}=await import('../notifications');await unregisterCurrentDevice();await api.post('/auth/logout')}finally{await api.setSession(null)}},connectMailbox:async()=>{await googleFlow('/mailbox/connect');await queryClient.invalidateQueries()}}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
