import {Stack} from 'expo-router';
import {NotificationRouting} from '../notifications/NotificationRouting';
import {WidgetSync} from '../widgets/WidgetSync';
import {WidgetRouting} from '../widgets/WidgetRouting';
import {SetupProvider,useSetup} from '../setup/context';
import {StatusBar} from 'expo-status-bar';
import {QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider,queryClient,useAuth} from '../auth/context';
import {ThemeProvider,useTheme} from '../theme';
import {Pressable,View,ActivityIndicator} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import {router} from 'expo-router';
import {Label} from '../components/ui';

function makeHeaderLeft(c:any,fallback:string,label:string){
  return (props:{canGoBack?:boolean})=>{
    if(props.canGoBack)return undefined;
    return <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${label}`} onPress={()=>router.replace(fallback as any)} style={{flexDirection:'row',alignItems:'center',gap:2,paddingRight:10,minHeight:48}}><ChevronLeft size={22} color={c.blue} strokeWidth={2.2}/><Label size={16} bold style={{color:c.blue}}>{label}</Label></Pressable>;
  };
}

function Routes(){
  const {colors:c,isDark}=useTheme();
  const {ready,tokens,me}=useAuth();
  const setup=useSetup();
  return (
    <>
      <StatusBar style={isDark?'light':'dark'}/>
      <Stack screenOptions={{headerStyle:{backgroundColor:c.bg},headerTintColor:c.blue,headerShadowVisible:false,contentStyle:{backgroundColor:c.bg},headerBackTitle:'Back'}}>
        <Stack.Protected guard={ready&&!!tokens&&!!me} redirectTo={tokens?'/workspace':'/sign-in'}>
        <Stack.Protected guard={!setup.ready||setup.required} redirectTo="/">
          <Stack.Screen name="setup" options={{headerShown:false}}/>
        </Stack.Protected>
        <Stack.Protected guard={setup.ready&&!setup.required} redirectTo="/setup">
        <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
        <Stack.Screen name="requests/[id]" options={{title:'',headerBackTitle:'Requests',headerLeft:makeHeaderLeft(c,'/','Requests')}}/>
        <Stack.Screen name="requests/new" options={{title:'Add request',presentation:'modal'}}/>
        <Stack.Screen name="source" options={{title:'Source email',headerLeft:makeHeaderLeft(c,'/','Back')}}/>
        <Stack.Screen name="settings/mailbox" options={{title:'Mailbox',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        <Stack.Screen name="settings/staff" options={{title:'Staff directory',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        <Stack.Screen name="settings/widget" options={{title:'Home-screen widget',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        <Stack.Screen name="settings/reminders" options={{title:'Reminders',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        <Stack.Screen name="settings/template" options={{title:'Request template',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        <Stack.Screen name="settings/excluded" options={{title:'Excluded recovery',headerLeft:makeHeaderLeft(c,'/settings','Settings')}}/>
        </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!tokens} redirectTo={me?'/':'/workspace'}>
          <Stack.Screen name="sign-in" options={{headerShown:false}}/>
        </Stack.Protected>
        <Stack.Protected guard={!!tokens&&!me} redirectTo={tokens?'/':'/sign-in'}>
          <Stack.Screen name="workspace" options={{headerShown:false}}/>
        </Stack.Protected>
        <Stack.Screen name="auth" options={{headerShown:false}}/>
      </Stack>
      {!ready&&<View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:c.bg,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={c.blue}/></View>}
    </>
  );
}
export default function Root(){return <SafeAreaProvider><ThemeProvider><QueryClientProvider client={queryClient}><AuthProvider><SetupProvider><Routes/><NotificationRouting/><WidgetSync/><WidgetRouting/></SetupProvider></AuthProvider></QueryClientProvider></ThemeProvider></SafeAreaProvider>}
