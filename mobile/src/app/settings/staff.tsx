import { useState } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trash2, Plus } from 'lucide-react-native';
import { api, useAuth } from '../../auth/context';
import { Member } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, Button, Field, ErrorNote } from '../../components/ui';

export default function StaffSettings() {
  const { me } = useAuth();
  const { colors: c } = useTheme();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const query = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<{ items: Member[] }>('/workspace/members'),
  });

  const isAdmin = me?.role === 'admin';

  async function handleAddStaff() {
    if (!email.trim()) {
      setError(new Error('Please enter a valid email address'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/workspace/members', {
        email: email.trim().toLowerCase(),
        name: name.trim() || 'Staff',
        role,
      });
      setEmail('');
      setName('');
      setAdding(false);
      await query.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(member: Member) {
    if (member.id === me?.id) {
      Alert.alert('Cannot Remove', 'You cannot revoke your own access.');
      return;
    }
    Alert.alert(
      'Remove Staff Access',
      `Revoke access for ${member.name} (${member.email})? They will immediately lose access to the media workspace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await api.delete(`/workspace/members/${member.id}`);
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
    <ScrollView contentContainerStyle={{ padding: layout.gutter, paddingBottom: 50, gap: 20, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label size={26} bold>Staff Directory</Label>
        {isAdmin && !adding && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add staff member"
            onPress={() => setAdding(true)}
            style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={22} color={c.onAccent} />
          </Pressable>
        )}
      </View>

      <Label muted size={14}>
        Only authorized Google identities listed here can access this media department workspace.
      </Label>

      <ErrorNote error={error} />

      {adding && (
        <View style={{ padding: 18, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line, gap: 14 }}>
          <Label bold size={18}>Add Team Member</Label>
          <Field label="Google Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Full Name" value={name} onChangeText={setName} />

          <Label bold size={14}>Role</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['staff', 'admin'] as const).map(r => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityLabel={r === 'admin' ? 'Administrator' : 'Staff'}
                aria-checked={role === r}
                accessibilityState={{ checked: role === r }}
                onPress={() => setRole(r)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: role === r ? c.blueSoft : c.input,
                  alignItems: 'center',
                }}
              >
                <Label bold={role === r} style={{ color: role === r ? c.blue : c.ink }}>
                  {r === 'admin' ? 'Administrator' : 'Staff'}
                </Label>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Button title="Save Staff" busy={busy} onPress={handleAddStaff} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" quiet onPress={() => setAdding(false)} />
            </View>
          </View>
        </View>
      )}

      {query.isLoading ? (
        <ActivityIndicator color={c.blue} />
      ) : (
        <View style={{ gap: 10 }}>
          {query.data?.items.map(m => (
            <View
              key={m.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: c.line,
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Label bold>{m.name} {m.id === me?.id ? '(You)' : ''}</Label>
                <Label size={13} muted>{m.email}</Label>
                <Label size={12} style={{ color: m.role === 'admin' ? c.blue : c.muted }}>
                  {m.role === 'admin' ? 'Administrator' : 'Staff'}
                </Label>
              </View>

              {isAdmin && m.id !== me?.id && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${m.name}`}
                  onPress={() => handleRemove(m)}
                  style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={18} color={c.red} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Button title="Back to Settings" quiet onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
    </ScrollView>
  );
}
