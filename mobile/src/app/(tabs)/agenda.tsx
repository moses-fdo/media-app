import React from 'react';
import {SectionList,View,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {api,useAuth} from '../../auth/context';
import {RequestPage} from '../../api/types';
import {layout,useTheme} from '../../theme';
import {Label,ErrorNote,Empty} from '../../components/ui';
import {RequestRow} from '../../features/requests/RequestRow';
import {dateLabel} from '../../features/requests/presentation';
import {useCachedQuery} from '../../features/requests/useCachedQuery';
export default function Agenda(){const {colors:c}=useTheme(),{me}=useAuth();const query=useCachedQuery<RequestPage>('agenda',async()=>{let items:RequestPage['items']=[],cursor:string|null=null;do{const page:RequestPage=await api.get('/requests?tab=agenda&limit=100'+(cursor?'&cursor='+cursor:''));items.push(...page.items);cursor=page.next_cursor}while(cursor);return {items,next_cursor:null,counts:{}}});const groups=new Map<string,RequestPage['items']>();for(const r of [...(query.data?.items||[])].sort((a,b)=>(a.event_start||'9999').localeCompare(b.event_start||'9999'))){const label=dateLabel(r.event_start,me?.timezone||'Asia/Kolkata');groups.set(label,[...(groups.get(label)||[]),r])}return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:c.bg}}><SectionList sections={Array.from(groups,([title,data])=>({title,data}))} keyExtractor={x=>x.id} contentContainerStyle={{paddingHorizontal:layout.gutter,paddingBottom:32,width:'100%',maxWidth:layout.contentWidth,alignSelf:'center'}} stickySectionHeadersEnabled={false} refreshing={query.isRefetching} onRefresh={()=>query.refetch()} ListHeaderComponent={<View style={{paddingVertical:14,gap:10}}><Label size={36} bold>Agenda</Label><Label muted>Your department’s upcoming events.</Label><ErrorNote error={query.error}/></View>} renderSectionHeader={({section})=><Label bold size={18} style={{paddingTop:24,paddingBottom:8}}>{section.title}</Label>} renderItem={({item})=><RequestRow item={item} onPress={()=>router.push('/requests/'+item.id)}/>} ListEmptyComponent={query.isLoading?<ActivityIndicator/>:<Empty title="No events yet" body="Events appear here as requests are identified."/>}/></SafeAreaView>}
