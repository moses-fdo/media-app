import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api, useAuth, queryClient } from '../../auth/context';
import { Mailbox } from '../../api/types';
import { useTheme } from '../../theme';
import { Label, Button, ErrorNote } from '../../components/ui';

export default function MailboxSettings() {
  const { me, connectMailbox } = useAuth();
  const { colors: c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const query = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => api.get<Mailbox>('/mailbox/status'),
  });

  const m = query.data;
  const isAdmin = me?.role === 'admin';

  async function handleSync() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/mailbox/sync');
      await query.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleBackfill() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/mailbox/backfill?days=90');
      await query.refetch();
      Alert.alert('Backfill Queued', 'Syncing previous 90 days of incoming messages.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      await connectMailbox();
      await query.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Gmail Mailbox',
      'This will revoke Google OAuth access for this department mailbox. Incoming emails will no longer be synchronized. Stored requests remain intact.\n\nDo you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await api.post('/mailbox/disconnect');
              await queryClient.invalidateQueries();
              await query.refetch();
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 50, gap: 20 }}>
      <Label size={26} bold>Mailbox Connection</Label>
      <Label muted size={14}>
        The media department mailbox receives requests for equipment and AV assistance. Google OAuth tokens are encrypted server-side.
      </Label>

      {query.isLoading ? (
        <ActivityIndicator color={c.blue} />
      ) : (
        <View style={{ padding: 18, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label bold size={16}>Status</Label>
            <Label bold style={{ color: m?.status === 'connected' ? c.green : m?.status === 'syncing' ? c.blue : c.amber }}>
              {m?.status?.toUpperCase() || 'UNKNOWN'}
            </Label>
          </View>

          <View style={{ height: 1, backgroundColor: c.line }} />

          <Label size={14} muted>Authorized Account</Label>
          <Label bold size={15}>{m?.email || 'None connected'}</Label>

          <Label size={14} muted>Last Successful Sync</Label>
          <Label size={15}>{m?.last_synced ? new Date(m.last_synced).toLocaleString() : 'Never'}</Label>

          {m?.error ? (
            <View style={{ padding: 10, backgroundColor: c.amberSoft, borderRadius: 8 }}>
              <Label size={13} style={{ color: c.red }}>{m.error}</Label>
            </View>
          ) : null}
        </View>
      )}

      <ErrorNote error={error} />

      {isAdmin && (
        <View style={{ gap: 12, marginTop: 10 }}>
          {m?.status !== 'connected' ? (
            <Button
              title="Connect Gmail Account"
              busy={busy}
              onPress={handleConnect}
            />
          ) : (
            <>
              <Button
                title="Sync Mailbox Now"
                busy={busy}
                onPress={handleSync}
              />
              <Button
                title="Run 90-Day Backfill"
                quiet
                busy={busy}
                onPress={handleBackfill}
              />
              <Button
                title="Disconnect Mailbox"
                danger
                quiet
                busy={busy}
                onPress={handleDisconnect}
              />
            </>
          )}
        </View>
      )}

      <Button title="Back to Settings" quiet onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
    </ScrollView>
  );
}
