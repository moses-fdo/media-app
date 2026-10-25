import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth, api } from '../../auth/context';
import { RequestPage } from '../../api/types';
import { Label, Button, ErrorNote } from '../../components/ui';
import { layout, useTheme } from '../../theme';
import { useCachedQuery } from '../../features/requests/useCachedQuery';
import { createWidgetSnapshot, loadWidgetEvents } from '../../widgets/model';
import { WidgetPreview } from '../../widgets/WidgetPreview';
import { requestWidgetPin, widgetAvailable } from '../../widgets/native';

export default function WidgetSettings() {
  const { me } = useAuth();
  const { colors: c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>(null);
  const query = useCachedQuery<RequestPage>('agenda', async () => ({ items: await loadWidgetEvents(path => api.get(path)), next_cursor: null, counts: {} }));
  const snapshot = useMemo(() => ({ ...createWidgetSnapshot(query.data?.items || [], me?.workspace_id || '', me?.timezone || 'Asia/Kolkata'), updatedAt: query.dataUpdatedAt || 0 }), [query.data, query.dataUpdatedAt, me?.workspace_id, me?.timezone]);

  async function addWidget() {
    setBusy(true); setError(null); setMessage('');
    try {
      const requested = await requestWidgetPin();
      setMessage(requested ? 'Confirm placement in your home-screen prompt.' : 'Use the Widgets menu on your home screen to add Karunya · Upcoming events.');
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }

  return <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: layout.gutter, paddingBottom: 48, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', gap: 24 }}>
    <View style={{ gap: 8 }}><Label size={30} bold accessibilityRole="header">Your next events, at a glance.</Label><Label size={16} muted>Keep the next three events on your Android home screen. Tap an event to open its request.</Label></View>
    <ErrorNote error={query.error || error} />
    {query.isLoading ? <ActivityIndicator color={c.blue} style={{ padding: 32 }} /> : <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.surfaceSubtle }}><WidgetPreview snapshot={snapshot} onOpen={id => router.push({ pathname: '/requests/[id]', params: { id } })} /></View>}
    {query.offline && <Label size={13} style={{ color: c.amber }}>Offline · This preview uses saved events.</Label>}
    <View style={{ gap: 12 }}>
      <Button title="Add to home screen" busy={busy} disabled={!widgetAvailable} onPress={addWidget} />
      {!widgetAvailable && <Label size={13} muted>The widget becomes available with the next native Android app update.</Label>}
      {!!message && <Label size={14} accessibilityLiveRegion="polite">{message}</Label>}
    </View>
    <View style={{ gap: 10 }}><Label size={20} bold accessibilityRole="header">Add it from your home screen</Label><Label size={15}>Touch and hold an empty space, choose Widgets, then select Karunya · Upcoming events.</Label></View>
    <View style={{ gap: 8 }}><Label size={20} bold accessibilityRole="header">Always know when it last synced</Label><Label size={15} muted>Events update while Media Desk is open. Android periodically redraws the saved list as event times pass. Open the app to fetch changes; saved details hide after 24 hours.</Label><Label size={13} muted>Event times use {me?.timezone || 'Asia/Kolkata'}. Signing out clears the widget.</Label></View>
  </ScrollView>;
}
