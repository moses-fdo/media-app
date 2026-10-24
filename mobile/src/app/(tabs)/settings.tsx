import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Users, Bell, Trash2, LogOut, Moon, Sun, ChevronRight, AlertTriangle, ShieldCheck, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth, queryClient } from '../../auth/context';
import { Mailbox } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, Button, ErrorNote } from '../../components/ui';

export default function Settings() {
  const { me, logout } = useAuth();
  const { colors: c, mode, setMode } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [purging, setPurging] = useState(false);

  const mailbox = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => api.get<Mailbox>('/mailbox/status'),
  });

  const isAdmin = me?.role === 'admin';

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      router.replace('/sign-in');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handlePurgeData() {
    Alert.alert(
      'Delete Stored Workspace Data',
      'This will delete stored requests, proposed updates and reminders in this workspace. Actual emails in Gmail are never deleted.\n\nAre you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Stored Data',
          style: 'destructive',
          onPress: async () => {
            setPurging(true);
            setError(null);
            try {
              await api.post('/workspace/data/purge');
              await queryClient.invalidateQueries();
              Alert.alert('Data Deleted', 'All stored requests and reminders have been removed.');
            } catch (e) {
              setError(e);
            } finally {
              setPurging(false);
            }
          },
        },
      ]
    );
  }

  const offsetText = (me?.preferences?.offsets || [1440, 60])
    .map(m => (m >= 1440 ? `${Math.round(m / 1440)}d` : `${Math.round(m / 60)}h`))
    .join(', ');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 50, gap: 24, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
        <View style={{ paddingTop: 18 }}>
          <Label size={36} bold>Settings</Label>
        </View>

        {/* User Card */}
        <View style={{ padding: 18, backgroundColor: c.surface, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label size={20} bold>{me?.name || 'Staff'}</Label>
            <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: isAdmin ? c.blueSoft : c.input }}>
              <Label size={12} bold style={{ color: isAdmin ? c.blue : c.muted }}>{isAdmin ? 'Administrator' : 'Staff'}</Label>
            </View>
          </View>
          <Label muted size={14}>{me?.email}</Label>
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label size={13} muted>{me?.workspace_name || 'Media department'}</Label>
            <Label size={13} muted>{me?.timezone || 'Asia/Kolkata'}</Label>
          </View>
          {me?.demo && (
            <View style={{ padding: 8, backgroundColor: c.amberSoft, borderRadius: 8, marginTop: 4 }}>
              <Label size={12} style={{ color: c.amber }}>Demo Workspace · Synthetic Data Only</Label>
            </View>
          )}
        </View>

        <ErrorNote error={error} />

        {/* Navigation Sections */}
        <View style={{ gap: 12 }}>
          <Label bold size={16} muted>Integrations & access</Label>

          {/* Mailbox Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mailbox settings"
            onPress={() => router.push('/settings/mailbox')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Mail size={22} color={c.blue} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold>Department Gmail Mailbox</Label>
              <Label size={13} muted>
                {mailbox.data?.status === 'connected'
                  ? `Connected · ${mailbox.data.email || 'Gmail'}`
                  : mailbox.data?.status === 'syncing'
                  ? 'Syncing messages…'
                  : mailbox.data?.status === 'reconnect_required'
                  ? 'Reconnect required'
                  : 'Not connected'}
              </Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressable>

          {/* Staff Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Staff management"
            onPress={() => router.push('/settings/staff')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Users size={22} color={c.blue} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold>Staff Directory & Access</Label>
              <Label size={13} muted>{isAdmin ? 'Manage staff allowlist and permissions' : 'View authorized team members'}</Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressable>

          {/* Reminders Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reminder preferences"
            onPress={() => router.push('/settings/reminders')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Bell size={22} color={c.blue} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold>Deadline Reminders</Label>
              <Label size={13} muted>Offsets: {offsetText} before setup</Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressable>

          {/* Request Template Card */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Media request template"
            onPress={() => router.push('/settings/template')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <FileText size={22} color={c.blue} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold>Standard Request Template</Label>
              <Label size={13} muted>Email format for automatic equipment & venue extraction</Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressable>

          {/* Excluded Messages Card (Admin only) */}
          {isAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Excluded email recovery"
              onPress={() => router.push('/settings/excluded')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: c.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.line,
                gap: 14,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <ShieldCheck size={22} color={c.blue} />
              <View style={{ flex: 1, gap: 3 }}>
                <Label bold>Excluded Email Recovery</Label>
                <Label size={13} muted>Inspect irrelevant emails and reprocess missed requests</Label>
              </View>
              <ChevronRight size={18} color={c.muted} />
            </Pressable>
          )}
        </View>

        {/* Appearance Section */}
        <View style={{ gap: 12 }}>
          <Label bold size={16} muted>Appearance</Label>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'light' }}
              onPress={() => setMode('light')}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                backgroundColor: mode === 'light' ? c.blueSoft : c.surface,
                borderWidth: 1,
                borderColor: mode === 'light' ? c.blue : c.line,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sun size={20} color={mode === 'light' ? c.blue : c.muted} />
              <Label bold size={14} style={{ color: mode === 'light' ? c.blue : c.ink }}>Light</Label>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'dark' }}
              onPress={() => setMode('dark')}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                backgroundColor: mode === 'dark' ? c.blueSoft : c.surface,
                borderWidth: 1,
                borderColor: mode === 'dark' ? c.blue : c.line,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Moon size={20} color={mode === 'dark' ? c.blue : c.muted} />
              <Label bold size={14} style={{ color: mode === 'dark' ? c.blue : c.ink }}>Dark</Label>
            </Pressable>
          </View>
        </View>

        {/* Danger Zone & Logout */}
        <View style={{ gap: 14, marginTop: 10 }}>
          {isAdmin && (
            <Button
              title="Delete Stored Workspace Data"
              danger
              quiet
              busy={purging}
              onPress={handlePurgeData}
            />
          )}

          <Button
            title="Sign Out"
            quiet
            busy={busy}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
