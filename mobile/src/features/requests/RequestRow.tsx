import { View } from 'react-native';
import { ChevronRight, Clock3, MapPin, CalendarDays } from 'lucide-react-native';
import { MediaRequest } from '../../api/types';
import { useTheme } from '../../theme';
import { Label, AnimatedPressable } from '../../components/ui';
import { clock, dateLabel, formatDeadline, statusLabel } from './presentation';

export function RequestRow({ item, onPress }: { item: MediaRequest; onPress: () => void }) {
  const { colors: c } = useTheme();
  const done = ['completed', 'cancelled', 'dismissed'].includes(item.status);
  const overdue = !done && !!item.setup_deadline && Date.parse(item.setup_deadline) < Date.now();
  const tone = item.status === 'completed' ? c.green : item.status === 'needs_review' ? c.amber : c.muted;
  const deadlineTone = overdue ? c.red : done ? c.muted : c.amber;
  const deadline = overdue ? 'Setup overdue · ' + clock(item.setup_deadline!, item.timezone) : formatDeadline(item.setup_deadline, item.timezone);
  const equipment = item.requirements?.length
    ? item.requirements.map(gear => gear.quantity == null ? gear.title : `${gear.quantity} × ${gear.title}`).join(', ')
    : item.requirements_summary || 'Equipment to confirm';
  const schedule = dateLabel(item.event_start, item.timezone) + (item.event_start ? ' · ' + clock(item.event_start, item.timezone) : '');
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${schedule}, ${statusLabel(item.status)}, ${deadline}`} onPress={onPress} activeScale={0.99} style={{ paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Label bold size={22} style={{ flex: 1, lineHeight: 29, letterSpacing: -0.4 }}>{item.title}</Label>
        <ChevronRight size={20} color={c.muted} strokeWidth={1.6} style={{ marginTop: 5 }} />
      </View>
      <View style={{ gap: 9, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}><CalendarDays size={17} color={c.ink} style={{ marginTop: 2 }} /><Label size={14} bold style={{ flex: 1 }}>{schedule}</Label></View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}><MapPin size={17} color={c.muted} style={{ marginTop: 2 }} /><Label size={14} muted style={{ flex: 1 }}>{item.venue || 'Venue to confirm'}</Label></View>
        <Label size={13} muted>{item.organizer || 'Organizer to confirm'}</Label>
        <Label size={14} muted numberOfLines={2} style={{ lineHeight: 21 }}>{equipment}</Label>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 7 }}><Clock3 size={15} color={deadlineTone} /><Label size={13} style={{ color: deadlineTone, flex: 1 }}>{deadline}</Label></View>
        <Label size={12} style={{ color: tone }}>{statusLabel(item.status)}</Label>
      </View>
      {!!item.proposed_updates?.length && <Label size={13} style={{ color: c.amber, marginTop: 8 }}>Email update to review</Label>}
    </AnimatedPressable>
  );
}
