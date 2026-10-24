import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Mail,
  Users,
  Bell,
  Trash2,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  FileText,
  User,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth, queryClient } from '../../auth/context';
import { Mailbox } from '../../api/types';
import { layout, radius, spacing, useTheme } from '../../theme';
import { Label, Button, ErrorNote, AnimatedPressable, Card } from '../../components/ui';

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
    .map((m) => (m >= 1440 ? `${Math.round(m / 1440)}d` : `${Math.round(m / 60)}h`))
    .join(', ');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 14,
          paddingBottom: 60,
          gap: 24,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
      >
        <View style={{ paddingTop: 6 }}>
          <Label size={36} bold style={{ letterSpacing: -1.2 }}>
            Settings
          </Label>
          <Label muted size={14}>
            Workspace configuration, Gmail synchronization, and staff directory.
          </Label>
        </View>

        {/* User Card */}
        <Card style={{ padding: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={22} color={c.blue} />
              </View>
              <View>
                <Label size={19} bold>
                  {me?.name || 'Staff'}
                </Label>
                <Label muted size={13}>
                  {me?.email}
                </Label>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: isAdmin ? c.blueSoft : c.surfaceSubtle,
                borderWidth: 1,
                borderColor: isAdmin ? c.blue : c.line,
              }}
            >
              <Label size={12} bold style={{ color: isAdmin ? c.blue : c.muted }}>
                {isAdmin ? 'Administrator' : 'Staff'}
              </Label>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 4 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label size={13} muted>
              {me?.workspace_name || 'Media department'}
            </Label>
            <Label size={13} muted>
              {me?.timezone || 'Asia/Kolkata'}
            </Label>
          </View>

          {me?.demo && (
            <View
              style={{
                padding: 10,
                backgroundColor: c.amberSoft,
                borderRadius: radius.md,
                marginTop: 4,
                borderWidth: 1,
                borderColor: c.amber,
              }}
            >
              <Label size={12} bold style={{ color: c.amber }}>
                Demo Workspace · Synthetic Data Only
              </Label>
            </View>
          )}
        </Card>

        <ErrorNote error={error} />

        {/* Navigation Sections */}
        <View style={{ gap: 12 }}>
          <Label bold size={16} muted>
            Integrations & access
          </Label>

          {/* Mailbox Card */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Mailbox settings"
            onPress={() => router.push('/settings/mailbox')}
            activeScale={0.98}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: c.blueSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail size={20} color={c.blue} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold size={16}>
                Department Gmail Mailbox
              </Label>
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
          </AnimatedPressable>

          {/* Staff Card */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Staff management"
            onPress={() => router.push('/settings/staff')}
            activeScale={0.98}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: c.blueSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color={c.blue} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold size={16}>
                Staff Directory & Access
              </Label>
              <Label size={13} muted>
                {isAdmin
                  ? 'Manage staff allowlist and permissions'
                  : 'View authorized team members'}
              </Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </AnimatedPressable>

          {/* Reminders Card */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Reminder preferences"
            onPress={() => router.push('/settings/reminders')}
            activeScale={0.98}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: c.blueSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} color={c.blue} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold size={16}>
                Deadline Reminders
              </Label>
              <Label size={13} muted>
                Offsets: {offsetText} before setup
              </Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </AnimatedPressable>

          {/* Request Template Card */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Media request template"
            onPress={() => router.push('/settings/template')}
            activeScale={0.98}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: c.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.line,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: c.blueSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color={c.blue} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold size={16}>
                Standard Request Template
              </Label>
              <Label size={13} muted>
                Email format for automatic equipment & venue extraction
              </Label>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </AnimatedPressable>

          {/* Excluded Messages Card (Admin only) */}
          {isAdmin && (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Excluded email recovery"
              onPress={() => router.push('/settings/excluded')}
              activeScale={0.98}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: c.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: c.line,
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: c.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={20} color={c.blue} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Label bold size={16}>
                  Excluded Email Recovery
                </Label>
                <Label size={13} muted>
                  Inspect irrelevant emails and reprocess missed requests
                </Label>
              </View>
              <ChevronRight size={18} color={c.muted} />
            </AnimatedPressable>
          )}
        </View>

        {/* Appearance Section */}
        <View style={{ gap: 12 }}>
          <Label bold size={16} muted>
            Appearance
          </Label>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AnimatedPressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'light' }}
              onPress={() => setMode('light')}
              activeScale={0.96}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: radius.lg,
                backgroundColor: mode === 'light' ? c.blueSoft : c.surface,
                borderWidth: 1.5,
                borderColor: mode === 'light' ? c.blue : c.line,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sun size={22} color={mode === 'light' ? c.blue : c.muted} />
              <Label bold size={15} style={{ color: mode === 'light' ? c.blue : c.ink }}>
                Light
              </Label>
            </AnimatedPressable>

            <AnimatedPressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'dark' }}
              onPress={() => setMode('dark')}
              activeScale={0.96}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: radius.lg,
                backgroundColor: mode === 'dark' ? c.blueSoft : c.surface,
                borderWidth: 1.5,
                borderColor: mode === 'dark' ? c.blue : c.line,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Moon size={22} color={mode === 'dark' ? c.blue : c.muted} />
              <Label bold size={15} style={{ color: mode === 'dark' ? c.blue : c.ink }}>
                Dark
              </Label>
            </AnimatedPressable>
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
