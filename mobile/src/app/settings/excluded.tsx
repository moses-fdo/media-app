import { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { api, useAuth, queryClient } from '../../auth/context';
import { layout, useTheme } from '../../theme';
import { Label, Button, ErrorNote, Empty } from '../../components/ui';

interface ExcludedMessage {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
}

export default function ExcludedSettings() {
  const { me } = useAuth();
  const { colors: c } = useTheme();
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const query = useQuery({
    queryKey: ['excluded'],
    queryFn: () => api.get<{ items: ExcludedMessage[] }>('/mailbox/excluded'),
    enabled: !!me,
  });

  async function handleReprocess(item: ExcludedMessage) {
    setReprocessing(item.id);
    setError(null);
    try {
      await api.post(`/mailbox/excluded/${item.id}/reprocess`);
      await query.refetch();
      await queryClient.invalidateQueries();
      Alert.alert(
        'Reprocessing Queued',
        `"${item.subject || 'Selected message'}" has been queued for re-classification.`
      );
    } catch (e) {
      setError(e);
    } finally {
      setReprocessing(null);
    }
  }


  return (
    <ScrollView contentContainerStyle={{ padding: layout.gutter, paddingBottom: 50, gap: 20, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
      <Label size={26} bold>Excluded emails</Label>
      <Label muted size={14}>
        Emails classified as irrelevant or general announcements are not shown on the Requests screen. If an email contained a valid media request, you can reprocess it here.
      </Label>

      <ErrorNote error={error} />

      {query.isLoading ? (
        <ActivityIndicator color={c.blue} />
      ) : !query.data?.items.length ? (
        <Empty
          title="No Excluded Messages"
          body="There are no excluded or irrelevant messages in recent mailbox syncs."
        />
      ) : (
        <View style={{ gap: 12 }}>
          {query.data.items.map(item => (
            <View
              key={item.id}
              style={{
                paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.line,
                gap: 8,
              }}
            >
              <Label bold size={16}>{item.subject || '(No subject)'}</Label>
              <Label muted size={13}>{item.sender}</Label>
              <Label muted size={12}>{new Date(item.received_at).toLocaleString()}</Label>
              <Button
                title="Reprocess as Media Request"
                quiet
                busy={reprocessing === item.id}
                onPress={() => handleReprocess(item)}
              />
            </View>
          ))}
        </View>
      )}

      <Button title="Back to Settings" quiet onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
    </ScrollView>
  );
}
