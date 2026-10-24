import React from 'react';
import { View, Pressable } from 'react-native';
import { CalendarDays, ChevronRight, Clock3, MapPin } from 'lucide-react-native';
import { MediaRequest } from '../../api/types';
import { useTheme } from '../../theme';
import { Label } from '../../components/ui';
import { clock, formatDeadline, statusLabel } from './presentation';

export function RequestRow({ item, onPress }: { item: MediaRequest; onPress: () => void }) {
  const { colors: c } = useTheme();
  const done = ['completed', 'cancelled', 'dismissed'].includes(item.status);
  const overdue = !done && !!item.setup_deadline && new Date(item.setup_deadline).getTime() < Date.now();
  const tone = item.status === 'completed' ? c.green : item.status === 'needs_review' ? c.amber : c.blue;
  const toneBg = item.status === 'completed' ? c.greenSoft : item.status === 'needs_review' ? c.amberSoft : c.blueSoft;
  const deadline = overdue ? 'Setup overdue · ' + clock(item.setup_deadline!, item.timezone) : formatDeadline(item.setup_deadline, item.timezone);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${statusLabel(item.status)}, ${deadline}`} onPress={onPress}
      style={({ pressed }) => ({ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: pressed ? c.input : 'transparent' })}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 36, height: 38, borderRadius: 9, backgroundColor: c.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
          <CalendarDays size={21} color={c.blue} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
            <Label bold size={17} style={{ flexGrow: 1, flexShrink: 1 }}>{item.title}</Label>
            <View style={{ backgroundColor: toneBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
              <Label size={12} style={{ color: tone }}>{statusLabel(item.status)}</Label>
            </View>
          </View>
          <Label muted size={14}>{item.organizer || 'Organizer to confirm'}</Label>
          <Label size={14} muted>{item.requirements_summary || item.summary || 'Requirements to confirm'}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
            <MapPin size={15} color={c.muted} style={{ marginTop: 2 }} />
            <Label size={13} muted style={{ flex: 1 }}>{item.venue || 'Venue to confirm'}{item.event_start ? ' · ' + clock(item.event_start, item.timezone) : ''}</Label>
          </View>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: overdue ? c.redSoft : done ? c.input : c.amberSoft }}>
            <Clock3 size={14} color={overdue ? c.red : done ? c.muted : c.amber} />
            <Label size={12} style={{ flexShrink: 1, color: overdue ? c.red : done ? c.muted : c.amber }}>{deadline}</Label>
          </View>
        </View>
        <ChevronRight size={16} color={c.muted} style={{ marginTop: 8 }} />
      </View>
    </Pressable>
  );
}
