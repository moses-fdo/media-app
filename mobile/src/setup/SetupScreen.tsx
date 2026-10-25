import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, CalendarDays, Bell, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { api, useAuth } from '../auth/context';
import { Mailbox, RequestPage } from '../api/types';
import { Brand } from '../components/Brand';
import { Label, Button, ErrorNote } from '../components/ui';
import { useTheme } from '../theme';
import { registerForPushNotifications } from '../notifications';
import { WidgetPreview } from '../widgets/WidgetPreview';
import { createWidgetSnapshot, loadWidgetEvents } from '../widgets/model';
import { requestWidgetPin, widgetAvailable } from '../widgets/native';
import { useSetup } from './context';
import { mailboxConnected, setupSteps, SetupStep, syncProgress } from './model';

export default function SetupScreen() {
  const { me, connectMailbox, authError } = useAuth();
  const setup = useSetup();
  const { state } = setup;
  const { colors: c } = useTheme();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [pushStatus, setPushStatus] = useState('');
  const [selected, setSelected] = useState<number[]>(me?.preferences?.offsets || [1440, 60]);
  const step = state.step;
  const index = setupSteps.indexOf(step);
  const isAdmin = me?.role === 'admin';
  const mailbox = useQuery({ queryKey: [me?.workspace_id, 'setup-mailbox'], queryFn: () => api.get<Mailbox>('/mailbox/status'), enabled: !!me && ['mailbox', 'sync'].includes(step), refetchInterval: ['mailbox', 'sync'].includes(step) ? 2000 : false });
  const progress = syncProgress(mailbox.data, state);
  const connected = mailboxConnected(mailbox.data);
  // Reading dataUpdatedAt ensures the queue-wait copy can advance on a poll even
  // when the server's response is otherwise unchanged.
  const checkedAt = mailbox.dataUpdatedAt;
  const takingLong = state.syncRequested && !!state.syncStartedAt && checkedAt - state.syncStartedAt > 120000;
  const active = ['reading', 'processing'].includes(progress) || (state.syncRequested && progress === 'waiting');
  const finished = ['complete', 'existing', 'attention', 'synced'].includes(progress);
  const requests = useQuery({ queryKey: [me?.workspace_id, 'setup-requests'], queryFn: () => api.get<RequestPage>('/requests?tab=active&limit=1'), enabled: step === 'sync' && progress === 'complete' });
  const upcoming = useQuery({ queryKey: [me?.workspace_id, 'setup-widget-preview'], queryFn: () => loadWidgetEvents(path => api.get(path)), enabled: step === 'widget' });
  const snapshot = useMemo(() => ({ ...createWidgetSnapshot(upcoming.data || [], me?.workspace_id || '', me?.timezone || 'Asia/Kolkata'), updatedAt: upcoming.dataUpdatedAt || 0 }), [upcoming.data, upcoming.dataUpdatedAt, me?.workspace_id, me?.timezone]);

  useEffect(() => { setError(null); setNotice(''); }, [step]);

  async function perform(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(null); setNotice('');
    try { await action(); } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  const go = (next: SetupStep) => perform(() => setup.update({ step: next }));

  async function connect() {
    await setup.update({ step: 'mailbox' });
    await connectMailbox();
    const result = await mailbox.refetch();
    setNotice(mailboxConnected(result.data) ? 'Gmail is connected. Continue to your first sync.' : 'Connection was not completed. Try again, or set up Gmail later.');
  }

  async function startSync() {
    if (!mailbox.data || mailbox.error) throw new Error('Check the mailbox connection before starting sync.');
    await setup.update({ syncRequested: true, syncBaseline: mailbox.data.last_synced || null, syncStartedAt: Date.now() });
    try { await api.post('/mailbox/sync'); }
    catch (failure) { await setup.update({ syncRequested: false, syncStartedAt: null }); throw failure; }
    await mailbox.refetch();
  }

  const headings = {
    welcome: `Welcome${me?.name ? ', ' + me.name.split(' ')[0] : ''}.`,
    mailbox: 'One inbox. A shared view.',
    sync: 'Bring your requests together.',
    reminders: 'A little notice goes a long way.',
    widget: 'Keep your next events close.',
  };
  const descriptions = {
    welcome: 'Connect your department inbox, bring in media requests, and choose how you stay ahead of each event.',
    mailbox: isAdmin ? 'Connect the Gmail account that receives your department’s media requests. Your staff sign-in stays separate.' : 'Your administrator connects the shared department mailbox. You can use its requests without connecting your own inbox.',
    sync: 'We’ll read incoming mail and organize media requests into your workspace. Gmail messages stay in your inbox.',
    reminders: 'Choose when you want a reminder before a confirmed setup deadline. Phone notifications are optional.',
    widget: 'See the next three events on your Android home screen. Tap an event to open its request.',
  };
  const progressTitles: Record<string, string> = {
    unknown: 'Checking your mailbox', idle: 'Ready for your first sync', waiting: 'Waiting for sync to start', reading: 'Reading your mailbox',
    processing: `Organizing ${mailbox.data?.queued || 0} messages`, complete: 'Sync complete', existing: 'Your mailbox has synced before',
    synced: 'Mailbox synced', attention: 'Synced with items needing attention', error: 'Sync needs another try', reconnect: 'Reconnect Gmail to continue', disconnected: 'Gmail is not connected yet',
  };

  if (!setup.ready) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={c.blue} /><Label muted>Loading your setup…</Label></View>;

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Brand />
        <Pressable accessibilityRole="button" accessibilityLabel="Do this later" disabled={busy} onPress={() => perform(() => setup.finish())} style={{ minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' }}><Label size={13} muted>Do this later</Label></Pressable>
      </View>
      <View style={{ gap: 10, marginTop: 36, marginBottom: 28 }}>
        <Label size={32} bold accessibilityRole="header" style={{ lineHeight: 39 }}>{headings[step]}</Label>
        <Label size={16} muted>{descriptions[step]}</Label>
      </View>
      <View style={{ flex: 1, gap: 18 }}>
        <ErrorNote error={error || setup.error || authError} />

        {step === 'welcome' && <View>
          {[
            [Mail, 'Connect once for the team', 'A shared mailbox keeps everyone working from the same requests.'],
            [CalendarDays, 'Find the event details', 'Dates, venues and equipment stay together in Requests and Agenda.'],
            [Bell, 'Stay ahead of setup', 'Optional reminders and a home-screen widget keep upcoming events in view.'],
          ].map(([Icon, title, body]) => { const Symbol = Icon as typeof Mail; return <View key={String(title)} style={{ flexDirection: 'row', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.line }}><Symbol size={22} color={c.blue} /><View style={{ flex: 1, gap: 4 }}><Label size={16} bold>{String(title)}</Label><Label size={14} muted>{String(body)}</Label></View></View>; })}
        </View>}

        {['mailbox', 'sync'].includes(step) && <>
          {mailbox.isLoading ? <ActivityIndicator color={c.blue} /> : <View style={{ paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, gap: 6 }}>
            <Label size={13} muted>Department mailbox</Label>
            <Label size={17} bold>{mailbox.data?.email || 'No mailbox connected'}</Label>
            <Label size={14} style={{ color: mailbox.data?.status === 'error' || !connected ? c.amber : mailbox.data?.status === 'syncing' ? c.blue : c.green }}>{mailbox.data?.status === 'error' ? 'Sync needs attention' : mailbox.data?.status === 'syncing' ? 'Sync in progress' : connected ? 'Connected to your workspace' : 'Connection needed'}</Label>
          </View>}
          <ErrorNote error={mailbox.error} />
          {mailbox.error && <Button title="Check connection" quiet disabled={busy} onPress={() => perform(() => mailbox.refetch({ throwOnError: true }))} />}
        </>}

        {step === 'mailbox' && <>
          <Label size={14} muted>Gmail access is read-only. Media Desk reads request emails; it does not send or delete mail.</Label>
          {!isAdmin && !connected && <Label size={14}>Ask your administrator to connect the department mailbox. You can continue setting up reminders now.</Label>}
          {!connected && isAdmin && <Button title="Connect department Gmail" busy={busy} disabled={mailbox.isLoading || !!mailbox.error} onPress={() => perform(connect)} />}
          {!connected && !isAdmin && !mailbox.error && <Button title="Check connection" quiet busy={busy} onPress={() => perform(() => mailbox.refetch({ throwOnError: true }))} />}
          {connected && <Button title="Continue to first sync" busy={busy} onPress={() => go('sync')} />}
          <Button title="Set up Gmail later" quiet disabled={busy} onPress={() => go('reminders')} />
        </>}

        {step === 'sync' && <>
          <Label size={13} muted>New connections check the last 30 days. Older mail can be imported later in Mailbox settings.</Label>
          <View accessibilityLiveRegion="polite" style={{ gap: 10, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {active ? <ActivityIndicator color={c.blue} /> : progress === 'complete' ? <CheckCircle2 size={24} color={c.green} /> : <RefreshCw size={22} color={c.muted} />}
              <Label size={20} bold style={{ flex: 1 }}>{progressTitles[progress]}</Label>
            </View>
            <Label size={14} muted>{progress === 'waiting' ? 'Your sync is queued. This screen will update when the worker starts.' : progress === 'reading' ? 'Checking incoming mail for media requests. This can take a little time.' : progress === 'processing' ? 'Mail has arrived. We’re turning the remaining messages into requests.' : progress === 'complete' ? (requests.data ? `${requests.data.counts.active || 0} active ${(requests.data.counts.active || 0) === 1 ? 'request is' : 'requests are'} available. New requests will appear as mail arrives.` : 'Your mailbox and request processing are up to date.') : progress === 'attention' ? `${mailbox.data?.failed || 0} messages could not be processed. You can retry sync now or review this later in Mailbox settings.` : progress === 'synced' ? 'Gmail has synced. Request processing may still be finishing in the background.' : progress === 'existing' ? 'You can use the existing shared sync, or check for newer mail now.' : progress === 'reconnect' ? 'Your administrator needs to renew Gmail access before syncing.' : progress === 'error' ? 'The last sync did not finish. Retry, or check the Gmail connection.' : 'Start a sync to bring incoming media requests into this workspace.'}</Label>
            {takingLong && active && <Label size={14} style={{ color: c.amber }}>This is taking longer than usual. You can retry or continue setup later; queued work can finish in the background.</Label>}
          </View>
          {connected && (!active || takingLong) && progress !== 'complete' && <Button title={error || state.syncRequested || ['error', 'attention'].includes(progress) ? 'Retry sync' : 'Start first sync'} busy={busy} disabled={mailbox.isLoading || !!mailbox.error} onPress={() => perform(startSync)} />}
          {active && <Button title="Check progress" quiet disabled={busy || mailbox.isFetching} onPress={() => perform(() => mailbox.refetch({ throwOnError: true }))} />}
          {!connected && <Button title={isAdmin ? 'Connect Gmail' : 'Check shared connection'} quiet onPress={() => go('mailbox')} />}
          {finished && <Button title="Continue to reminders" busy={busy} onPress={() => perform(async () => { await setup.update({ step: 'reminders' }); await client.invalidateQueries(); })} />}
          <Button title="Sync later" quiet disabled={busy} onPress={() => go('reminders')} />
        </>}

        {step === 'reminders' && <>
          <View accessibilityRole="radiogroup" accessibilityLabel="Reminder timing">
            {[
              { label: '1 day and 1 hour before setup', offsets: [1440, 60] },
              { label: '1 hour before setup', offsets: [60] },
              { label: '30 minutes before setup', offsets: [30] },
              ...(![[1440, 60], [60], [30]].some(value => JSON.stringify(value) === JSON.stringify(me?.preferences?.offsets || [1440, 60])) ? [{ label: 'Keep current reminder timing', offsets: me!.preferences.offsets }] : []),
            ].map(option => {
              const checked = JSON.stringify(selected) === JSON.stringify(option.offsets);
              return <Pressable key={option.label} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked }} aria-checked={checked} onPress={() => setSelected(option.offsets)} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: checked ? 6 : 1, borderColor: checked ? c.blue : c.muted }} /><Label size={15} style={{ flex: 1 }}>{option.label}</Label></Pressable>;
            })}
          </View>
          <Button title="Enable notifications" quiet busy={busy} disabled={Platform.OS === 'web'} onPress={() => perform(async () => { const token = await registerForPushNotifications(); setPushStatus(token ? 'Notifications are enabled for this phone.' : 'Notifications were not enabled. You can try again on a physical phone or continue without them.'); })} />
          {Platform.OS === 'web' && <Label size={13} muted>Enable phone notifications from the Android app.</Label>}
          {!!pushStatus && <Label size={14} accessibilityLiveRegion="polite">{pushStatus}</Label>}
          <Button title="Save and continue" busy={busy} onPress={() => perform(async () => { await api.put('/reminder-preferences', { offsets: selected }); await client.invalidateQueries({ queryKey: ['me'] }); await setup.update({ step: 'widget' }); })} />
          <Button title="Keep current reminders" quiet disabled={busy} onPress={() => go('widget')} />
        </>}

        {step === 'widget' && <>
          <ErrorNote error={upcoming.error} />
          {upcoming.isLoading ? <ActivityIndicator color={c.blue} /> : upcoming.data && <WidgetPreview snapshot={snapshot} />}
          <Label size={14} muted>Touch and hold an empty space on your home screen, choose Widgets, then select Karunya · Upcoming events. The widget updates when the app syncs.</Label>
          <Button title="Add to home screen" quiet busy={busy} disabled={!widgetAvailable} onPress={() => perform(async () => { const requested = await requestWidgetPin(); setNotice(requested ? 'Confirm placement in your home-screen prompt.' : 'Use your home screen’s Widgets menu to add Karunya · Upcoming events.'); })} />
          {!widgetAvailable && <Label size={13} muted>Adding the widget requires the next native Android app update. You can finish setup now.</Label>}
          <Button title="Open Requests" busy={busy} onPress={() => perform(() => setup.finish())} />
        </>}
        {!!notice && <Label size={14} accessibilityLiveRegion="polite">{notice}</Label>}
      </View>
      <View style={{ gap: 12, paddingTop: 28 }}>
        {step === 'welcome' && <Button title="Set up my workspace" busy={busy} onPress={() => go('mailbox')} />}
        {index > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={() => go(setupSteps[index - 1])} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 }}><Label size={14} style={{ color: c.blue }}>Back</Label></Pressable>}
        <Label size={12} muted style={{ textAlign: 'center', marginTop: 8 }}>Step {index + 1} of 5 · Replay setup anytime in Settings</Label>
        <View accessibilityRole="progressbar" accessibilityLabel="Setup progress" accessibilityValue={{ min: 1, max: 5, now: index + 1 }} style={{ flexDirection: 'row', gap: 6 }}>{setupSteps.map((value, position) => <View key={value} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: position <= index ? c.blue : c.line }} />)}</View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
