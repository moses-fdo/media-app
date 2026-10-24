import React,{useState} from 'react';
import {View,ScrollView,Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Redirect} from 'expo-router';
import {Check} from 'lucide-react-native';
import {useAuth} from '../auth/context';
import {layout,useTheme} from '../theme';
import {Label,Button,ErrorNote} from '../components/ui';
export default function SignIn(){
  const {tokens,login,authError}=useAuth(),{colors:c}=useTheme();
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  if(tokens)return <Redirect href="/"/>;

  async function enter(){
    setBusy(true);
    setError(null);
    try{
      await login()
    }catch(e){
      setError(e)
    }finally{
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:c.bg}}>
      <ScrollView contentContainerStyle={{padding:28,width:'100%',maxWidth:layout.contentWidth,alignSelf:'center',flexGrow:1,justifyContent:'center',gap:28}}>
        <View style={{width:72,height:72,borderRadius:16,backgroundColor:c.bg,alignItems:'center',justifyContent:'center'}}>
          <Image source={require('../../assets/images/media-ops-mark.png')} style={{width:72,height:72}} resizeMode="contain"/>
        </View>
        <View style={{gap:12}}>
          <Label size={32} bold>Karunya Media Desk</Label>
          <Label size={22}>Every request.{ '\n'}Nothing overlooked.</Label>
          <Label muted>Find the media requests that matter, without searching through hundreds of emails.</Label>
        </View>
        <View style={{gap:17,paddingVertical:20}}>
          {['Requests organized by event and deadline','Audio and video requirements in one place','Your team’s preparation, kept in sync'].map(s=>(
            <View key={s} style={{flexDirection:'row',gap:12}}>
              <Check size={20} color={c.green}/>
              <Label style={{flex:1}}>{s}</Label>
            </View>
          ))}
        </View>
        <ErrorNote error={error || authError}/>
        <Button title="Continue with Google" busy={busy} onPress={()=>enter()}/>
        <Label size={13} muted>Use your official @karunya.edu.in staff account. The department mailbox is connected separately with read-only permission.</Label>
      </ScrollView>
    </SafeAreaView>
  );
}

