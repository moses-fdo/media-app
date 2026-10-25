import { useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { api, useAuth, queryClient } from '../../auth/context';
import { layout, useTheme } from '../../theme';
import { Label, Button, ErrorNote } from '../../components/ui';
import { registerForPushNotifications } from '../../notifications';

const OPTIONS = [
  { label: '2 days before setup', minutes: 2880 },
  { label: '1 day before setup (Default)', minutes: 1440 },
  { label: '4 hours before setup', minutes: 240 },
  { label: '2 hours before setup', minutes: 120 },
  { label: '1 hour before setup (Default)', minutes: 60 },
  { label: '30 minutes before setup', minutes: 30 },
];

export default function ReminderSettings() {
  const { me } = useAuth();
  const { colors: c } = useTheme();
  const [selected, setSelected] = useState<number[]>(me?.preferences?.offsets || [1440, 60]);
  const [busy, setBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function toggle(min: number) {
    setSaved(false);
    if (selected.includes(min)) {
      if (selected.length === 1) {
        Alert.alert('At Least One Reminder', 'Select at least one reminder offset.');
        return;
      }
      setSelected(selected.filter(x => x !== min));
    } else {
      setSelected([...selected, min].sort((a, b) => b - a));
    }
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await api.put('/reminder-preferences', { offsets: selected });
      await queryClient.invalidateQueries();
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    setPushStatus(null);
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushStatus('Push notifications registered successfully.');
      } else {
        setPushStatus('Notifications permission was not granted or device is a simulator.');
      }
    } catch (e) {
      setPushStatus(e instanceof Error ? e.message : 'Unable to enable notifications. Try again later.');
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: layout.gutter, paddingBottom: 50, gap: 20, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}>
      <Label size={26} bold>Deadline Reminders</Label>
      <Label muted size={14}>
        The system schedules alerts before each confirmed setup deadline. Completed and cancelled requests automatically cancel future reminders.
      </Label>

      <ErrorNote error={error} />

      <View style={{ gap: 10 }}>
        <Label bold size={16}>Alert Offsets</Label>
        {OPTIONS.map(opt => {
          const isChecked = selected.includes(opt.minutes);
          return (
            <Pressable
              key={opt.minutes}
              accessibilityRole="checkbox"
              accessibilityLabel={opt.label}
              aria-checked={isChecked}
              accessibilityState={{ checked: isChecked }}
              onPress={() => toggle(opt.minutes)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 18,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                gap: 12,
              }}
            >
              <Label bold={isChecked} style={{ flex: 1 }}>{opt.label}</Label>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isChecked ? c.blue : c.muted,
                  backgroundColor: isChecked ? c.blue : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isChecked && <Check size={14} color={c.onAccent} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {saved && <Label accessibilityLiveRegion="polite" style={{ color: c.green }}>Reminder preferences saved.</Label>}
      <Button title="Save reminders" busy={busy} onPress={handleSave} />

      <View style={{ height: 1, backgroundColor: c.line, marginVertical: 8 }} />

      <View style={{ gap: 10 }}>
        <Label bold size={16}>Device Notifications</Label>
        <Label size={13} muted>
          Receive setup reminders on this phone, including when the app is closed.
        </Label>
        {pushStatus && (
          <View style={{ padding: 12, backgroundColor: c.blueSoft, borderRadius: 8 }}>
            <Label size={13} accessibilityLiveRegion="polite" style={{ color: c.blue }}>{pushStatus}</Label>
          </View>
        )}
        <Button
          title="Enable Push Notifications"
          quiet
          busy={pushBusy}
          onPress={handleEnablePush}
        />
      </View>

      <Button title="Back to Settings" quiet onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
    </ScrollView>
  );
}
