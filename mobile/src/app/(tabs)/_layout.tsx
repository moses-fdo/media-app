import React from 'react';
import {Tabs,Redirect} from 'expo-router';
import {ActivityIndicator,View} from 'react-native';
import {List,CalendarDays,Settings} from 'lucide-react-native';
import {useAuth} from '../../auth/context';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
export default function TabsLayout(){const insets=useSafeAreaInsets();const {ready,tokens}=useAuth(),{colors:c}=useTheme();if(!ready)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/></View>;if(!tokens)return <Redirect href="/sign-in"/>;return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:c.blue,tabBarInactiveTintColor:c.muted,tabBarStyle:{height:64+insets.bottom,backgroundColor:c.surface,borderTopColor:c.line},tabBarLabelStyle:{fontSize:12,fontWeight:'500'},tabBarItemStyle:{paddingTop:8,paddingBottom:6}}}><Tabs.Screen name="index" options={{title:'Requests',tabBarIcon:({color,size})=><List color={color} size={size}/>}}/><Tabs.Screen name="agenda" options={{title:'Agenda',tabBarIcon:({color,size})=><CalendarDays color={color} size={size}/>}}/><Tabs.Screen name="settings" options={{title:'Settings',tabBarIcon:({color,size})=><Settings color={color} size={size}/>}}/></Tabs>}
