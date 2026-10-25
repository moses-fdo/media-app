import React, { useRef } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, useAuth, queryClient } from '../../auth/context';
import { MediaRequest } from '../../api/types';
import { RequestForm } from '../../features/requests/RequestForm';
import { layout, useTheme } from '../../theme';
import { Label } from '../../components/ui';
export default function NewRequest() {
  const { me } = useAuth();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const { colors: c } = useTheme();
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView ref={scroll} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: layout.gutter, paddingBottom: 50, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
      <View style={{ gap: 8, marginBottom: 28 }}><Label size={32} bold>New request</Label><Label muted size={14}>Plan the event. We’ll keep the details together.</Label></View>
      <RequestForm onInvalid={pageY => scroll.current?.scrollTo({ y: Math.max(0, offset.current + pageY - 140), animated: false })} initialDate={date} timezone={me?.timezone || 'Asia/Kolkata'} onSave={async data => { const request = await api.post<MediaRequest>('/requests', data); await queryClient.invalidateQueries(); router.replace('/requests/' + request.id); }} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
