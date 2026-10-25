import { useState } from 'react';
import { View, ScrollView, Alert, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Users, Bell, Trash2, LogOut, Moon, ChevronRight, ShieldCheck, FileText, Globe, LayoutGrid, CircleHelp } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth, queryClient } from '../../auth/context';
import { Mailbox } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, ErrorNote } from '../../components/ui';
import { Brand } from '../../components/Brand';
import { useSetup } from '../../setup/context';

export default function Settings() {
  const { me, logout } = useAuth();
  const setup = useSetup();
  const { colors: c, mode, setMode } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [purging, setPurging] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const mailbox = useQuery({ queryKey: ['mailbox'], queryFn: () => api.get<Mailbox>('/mailbox/status') });
  const isAdmin = me?.role === 'admin';
  async function handleLogout() {
    setBusy(true);
    try { await logout(); router.replace('/sign-in'); } catch (e) { setError(e); } finally { setBusy(false); }
  }
  function handlePurgeData() {
    Alert.alert('Delete Stored Workspace Data', 'This will delete stored requests, proposed updates and reminders in this workspace. Actual emails in Gmail are never deleted.\n\nAre you sure you want to proceed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All Stored Data', style: 'destructive', onPress: async () => {
        setPurging(true); setError(null);
        try { await api.post('/workspace/data/purge'); await queryClient.invalidateQueries(); Alert.alert('Data Deleted', 'All stored requests and reminders have been removed.'); }
        catch (e) { setError(e); } finally { setPurging(false); }
      } },
    ]);
  }
  const offsetText = (me?.preferences?.offsets || [1440, 60]).map(minutes => minutes >= 1440 ? `${minutes / 1440}d` : minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`).join(', ') + ' before';
  function heading(title: string) { return <Label size={14} bold accessibilityRole="header" style={{ paddingTop: 28, paddingBottom: 10 }}>{title[0] + title.slice(1).toLowerCase()}</Label>; }
  function row(title: string, Icon: typeof Mail, onPress?: () => void, options: { detail?: string; value?: string; danger?: boolean; label?: string; loading?: boolean } = {}) {
    const color = options.danger ? c.red : c.ink;
    const content = <><Icon size={22} color={color} strokeWidth={1.6} /><View style={{ flex: 1, gap: 3 }}><Label size={16} style={{ color }}>{title}</Label>{options.detail && <Label size={13} muted>{options.detail}</Label>}</View>{options.value && <Label size={13} muted style={{ maxWidth: '40%', textAlign: 'right' }}>{options.value}</Label>}{options.loading ? <ActivityIndicator size="small" color={c.blue} /> : onPress ? <ChevronRight size={17} color={c.muted} /> : null}</>;
    const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 68, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.line };
    return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={options.label || title} disabled={options.loading} onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}>{content}</Pressable> : <View style={style}>{content}</View>;
  }
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}><ScrollView contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 18, paddingBottom: 40, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
    <Brand />
    <Label size={36} bold accessibilityRole="header" style={{ letterSpacing: -1, marginTop: 28, marginBottom: 24 }}>Settings</Label>
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', paddingBottom: 26, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}><Label size={25} style={{ color: c.onAccent }}>{me?.name?.[0] || 'M'}</Label></View>
      <View style={{ flex: 1, gap: 2 }}><Label size={21} bold>{me?.name || 'Media Desk'}</Label><Label size={13} muted>{me?.email}</Label><Label size={12} muted>{me?.workspace_name} · {isAdmin ? 'Administrator' : 'Staff'}</Label></View>
    </View>
    <ErrorNote error={error || mailbox.error} />
    {heading('WORKSPACE')}
    {row('Mailbox', Mail, () => router.push('/settings/mailbox'), { detail: me?.demo ? 'Demo mailbox · Sample data' : mailbox.data?.status === 'connected' ? 'Gmail connected' : 'Connect your department mailbox' })}
    {row('Staff', Users, () => router.push('/settings/staff'), { detail: 'Manage your team' })}
    {row('Request template', FileText, () => router.push('/settings/template'), { label: 'Media request template' })}
    {isAdmin && row('Excluded Email Recovery', ShieldCheck, () => router.push('/settings/excluded'))}
    {heading('PREFERENCES')}
    {Platform.OS !== 'ios' && row('Home-screen widget', LayoutGrid, () => router.push('/settings/widget'), { detail: Platform.OS === 'web' ? 'Preview upcoming events for Android' : 'Your next events, without opening the app' })}
    {row('Reminders', Bell, () => router.push('/settings/reminders'), { value: offsetText })}
    {row('Appearance', Moon, () => setAppearanceOpen(!appearanceOpen), { value: mode[0].toUpperCase() + mode.slice(1) })}
    {appearanceOpen && <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8, paddingVertical: 12 }}>{['light', 'dark', 'system'].map(option => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option[0].toUpperCase() + option.slice(1)} aria-checked={mode === option} accessibilityState={{ checked: mode === option }} onPress={() => setMode(option)} style={{ flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: mode === option ? c.blueSoft : c.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}><Label size={14} bold={mode === option} style={{ color: mode === option ? c.blue : c.muted }}>{option[0].toUpperCase() + option.slice(1)}</Label></Pressable>)}</View>}
    {row('Time zone', Globe, undefined, { value: me?.timezone || 'Asia/Kolkata' })}
    {row('Replay setup', CircleHelp, async () => { setBusy(true); setError(null); try { await setup.restart(); router.replace('/setup'); } catch (failure) { setError(failure); } finally { setBusy(false); } }, { detail: 'Gmail connection, first sync, reminders and widget', loading: busy })}
    {heading('ACCOUNT')}
    {row('Sign Out', LogOut, handleLogout, { danger: true, loading: busy })}
    {isAdmin && row('Delete Stored Workspace Data', Trash2, handlePurgeData, { danger: true, loading: purging })}
  </ScrollView></SafeAreaView>;
}
