import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { api, useAuth, queryClient } from '../../auth/context';
import { useTheme } from '../../theme';
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
    enabled: me?.role === 'admin',
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

  if (me?.role !== 'admin') {
    return (
      <View style={{ padding: 22, gap: 16 }}>
        <Label size={20} bold>Access Denied</Label>
        <Label muted>Only administrators can inspect excluded email headers.</Label>
        <Button title="Back" quiet onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 50, gap: 20 }}>
      <Label size={26} bold>Excluded Email Recovery</Label>
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
                padding: 16,
                backgroundColor: c.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.line,
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
