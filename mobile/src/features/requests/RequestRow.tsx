import { View } from 'react-native';
import { ChevronRight, Clock3, MapPin, Landmark, Video, AlertCircle, Mail } from 'lucide-react-native';
import { MediaRequest } from '../../api/types';
import { useTheme } from '../../theme';
import { Label, AnimatedPressable } from '../../components/ui';
import { clock, dateLabel, formatDeadline, statusLabel, safeDate } from './presentation';

export function RequestRow({ item, onPress }: { item: MediaRequest; onPress: () => void }) {
  const { colors: c } = useTheme();
  const done = ['completed', 'cancelled', 'dismissed'].includes(item.status);
  const overdue = !done && !!item.setup_deadline && Date.parse(item.setup_deadline) < Date.now();
  const isReview = item.status === 'needs_review';
  const deadlineTone = overdue ? c.red : done ? c.muted : c.amber;
  const deadline = overdue ? 'Setup overdue · ' + clock(item.setup_deadline!, item.timezone) : formatDeadline(item.setup_deadline, item.timezone);
  const equipment = item.requirements?.length
    ? item.requirements.map(gear => gear.quantity == null ? gear.title : `${gear.quantity} × ${gear.title}`).join(', ')
    : item.requirements_summary || 'Equipment to confirm';

  const d = safeDate(item.event_start) || safeDate(item.setup_deadline);
  let dayStr = '—';
  let monthStr = 'TBD';
  if (d) {
    try {
      dayStr = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: item.timezone || 'Asia/Kolkata' }).format(d);
      monthStr = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: item.timezone || 'Asia/Kolkata' }).format(d).toUpperCase();
    } catch {
      dayStr = String(d.getDate());
      monthStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    }
  }

  const schedule = dateLabel(item.event_start, item.timezone) + (item.event_start ? ' · ' + clock(item.event_start, item.timezone) : '');
  const isHighlighted = !done && item.status !== 'needs_review';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${schedule}, ${statusLabel(item.status)}, ${deadline}`}
      onPress={onPress}
      activeScale={0.99}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 10,
      }}
    >
      <View style={{ width: 44, alignItems: 'center', paddingTop: 6 }}>
        <Label bold size={24} style={{ color: c.ink, letterSpacing: -0.5, lineHeight: 28 }}>
          {dayStr}
        </Label>
        <Label bold size={11} style={{ color: c.blue, letterSpacing: 0.5 }}>
          {monthStr}
        </Label>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: isHighlighted ? c.blueSoft : c.surfaceSubtle,
          borderRadius: 14,
          padding: 14,
          gap: 6,
          borderWidth: 1,
          borderColor: isHighlighted ? c.blueBorder : c.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Label bold size={17} style={{ flex: 1, color: c.ink, letterSpacing: -0.3, lineHeight: 22 }}>
            {item.title}
          </Label>
          <ChevronRight size={18} color={c.muted} strokeWidth={1.8} style={{ marginTop: 2 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 }}>
          <Clock3 size={14} color={c.muted} />
          <Label size={13} muted style={{ flex: 1 }}>{schedule}</Label>
        </View>

        {!!item.venue && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <MapPin size={14} color={c.muted} />
            <Label size={13} muted numberOfLines={1} style={{ flex: 1 }}>{item.venue}</Label>
          </View>
        )}

        {!!item.organizer && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Landmark size={14} color={c.muted} />
            <Label size={13} muted numberOfLines={1} style={{ flex: 1 }}>{item.organizer}</Label>
          </View>
        )}

        {!!equipment && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Video size={14} color={c.muted} />
            <Label size={13} muted numberOfLines={1} style={{ flex: 1 }}>{equipment}</Label>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 }}>
          <Clock3 size={14} color={deadlineTone} />
          <Label size={13} bold style={{ color: deadlineTone, flex: 1 }}>{deadline}</Label>
        </View>

        {isReview && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.amberSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
            <AlertCircle size={13} color={c.amber} />
            <Label size={12} bold style={{ color: c.amber }}>Needs Review</Label>
          </View>
        )}

        {!!item.proposed_updates?.length && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.blueSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 }}>
            <Mail size={13} color={c.blue} />
            <Label size={12} bold style={{ color: c.blue }}>Email update to review</Label>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

