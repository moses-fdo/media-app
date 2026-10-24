import React from 'react';
import {ScrollView,View,Linking,ActivityIndicator} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {api,useAuth} from '../auth/context';
import {Label,Button,ErrorNote} from '../components/ui';
import {useTheme} from '../theme';
export default function Source(){const {me}=useAuth();const {id}=useLocalSearchParams<{id:string}>(),{colors:c}=useTheme();const q=useQuery({queryKey:['source',id],queryFn:()=>api.get<any>('/sources/'+id)});const m=q.data;return <ScrollView contentContainerStyle={{padding:22,gap:20,paddingBottom:50}}>{q.isLoading?<ActivityIndicator/>:<ErrorNote error={q.error}/>}{m&&<><Label size={23} bold>{m.subject}</Label><Label muted>{m.sender}</Label><Label muted size={13}>{new Date(m.received_at).toLocaleString()}</Label><View style={{height:1,backgroundColor:c.line}}/><Label selectable>{m.body}</Label>{m.attachments.map((a:any,i:number)=><View key={i} style={{padding:14,backgroundColor:c.input,borderRadius:10}}><Label bold>{a.name}</Label><Label size={13} muted>{a.status==='parsed'?'Text extracted':'Requires manual review'}</Label>{a.reason&&<Label size={13}>{a.reason}</Label>}</View>)}{me?.demo?<Label size={13} muted>This is a sample email. No real Gmail message is linked.</Label>:<Button title="Open original in Gmail" quiet onPress={()=>Linking.openURL(m.gmail_url)}/>}</>}</ScrollView>}
