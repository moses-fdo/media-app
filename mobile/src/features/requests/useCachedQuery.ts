import {useEffect,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '../../auth/context';
export function useCachedQuery<T>(key:string,load:()=>Promise<T>){
 const {me,tokens}=useAuth();const storageKey='media-cache:'+me?.workspace_id+':'+key;const [cached,setCached]=useState<T>();
 const query=useQuery({queryKey:[me?.workspace_id,key],queryFn:load,enabled:!!tokens&&!!me});
 useEffect(()=>{setCached(undefined);if(me)AsyncStorage.getItem(storageKey).then(v=>{if(v)setCached(JSON.parse(v))}).catch(()=>{})},[storageKey]);
 useEffect(()=>{if(query.data)AsyncStorage.setItem(storageKey,JSON.stringify(query.data)).catch(()=>{})},[query.data,storageKey]);
 return {...query,data:query.data||cached,offline:!!query.error&&!!cached};
}
