import React from 'react';
import {ScrollView,KeyboardAvoidingView,Platform} from 'react-native';
import {router} from 'expo-router';
import {api,useAuth,queryClient} from '../../auth/context';
import {MediaRequest} from '../../api/types';
import {RequestForm} from '../../features/requests/RequestForm';
export default function NewRequest(){const {me}=useAuth();return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:22,paddingBottom:50}}><RequestForm timezone={me?.timezone||'Asia/Kolkata'} onSave={async data=>{const r=await api.post<MediaRequest>('/requests',data);await queryClient.invalidateQueries();router.replace('/requests/'+r.id)}}/></ScrollView></KeyboardAvoidingView>}
