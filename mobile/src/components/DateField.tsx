import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { DateTime } from 'luxon';
import { Label } from './ui';
import { useTheme } from '../theme';
export type DateFieldProps = { label: string; value: string; mode: 'date' | 'time'; onChange: (value: string) => void; error?: string; timezone: string };
// Native pickers use device-local components. Store the chosen wall-clock date/time,
// then RequestForm converts that value using the workspace zone, never the device zone.
export function pickerDate(value: string, mode: 'date' | 'time', timezone: string) {
  const now = DateTime.now().setZone(timezone);
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, 12);
  }
  const [hour, minute] = (value || '09:00').split(':').map(Number);
  return new Date(now.year, now.month - 1, now.day, hour, minute);
}
export function DateField({ label, value, mode, onChange, error, timezone }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const { colors: c, isDark } = useTheme();
  const display = value ? (mode === 'date' ? DateTime.fromISO(value).toLocaleString(DateTime.DATE_MED) : DateTime.fromFormat(value, 'HH:mm').toLocaleString(DateTime.TIME_SIMPLE)) : mode === 'date' ? 'Choose date' : 'Choose time';
  return <View style={{ gap: 6 }}>
    <Label size={14} bold>{label}</Label>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={`${error ? error + '. ' : ''}${display}. Opens ${mode} picker.`} aria-invalid={!!error} onPress={() => setOpen(true)} style={{ minHeight: 48, padding: 14, borderWidth: 1, borderColor: error ? c.red : c.inputBorder, borderRadius: 12, backgroundColor: c.surface }}><Label size={16}>{display}</Label></Pressable>
    {!!error && <Label size={13} style={{ color: c.red }} accessibilityLiveRegion="polite">{error}</Label>}
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label.toLowerCase()}`} onPress={() => onChange('')} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 }}><Label size={13} style={{ color: c.blue }}>Clear</Label></Pressable>}
    {open && <DateTimePicker value={pickerDate(value, mode, timezone)} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} accentColor={c.blue} themeVariant={isDark ? 'dark' : 'light'} onDismiss={() => setOpen(false)} onChange={(event, selected) => {
      if (Platform.OS !== 'ios') setOpen(false);
      if (event.type !== 'set' || !selected) return;
      onChange(mode === 'date' ? `${selected.getFullYear()}-${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}` : `${String(selected.getHours()).padStart(2,'0')}:${String(selected.getMinutes()).padStart(2,'0')}`);
    }} />}
    {open && Platform.OS === 'ios' && <Pressable accessibilityRole="button" accessibilityLabel={`Done choosing ${label.toLowerCase()}`} onPress={() => setOpen(false)} style={{ minHeight: 48, justifyContent: 'center' }}><Label style={{ color: c.blue }}>Done</Label></Pressable>}
  </View>;
}
