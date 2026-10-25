import { Pressable, View } from 'react-native';
import { BrandMark } from '../components/Brand';
import { Label } from '../components/ui';
import { useTheme } from '../theme';
import { clock, dateLabel } from '../features/requests/presentation';
import { WidgetSnapshot } from './model';

export function WidgetPreview({ snapshot, onOpen }: { snapshot: WidgetSnapshot; onOpen?: (id: string) => void }) {
  const { colors: c } = useTheme();
  const events = snapshot.events.slice(0, 3);
  return <View style={{ padding: 20, backgroundColor: c.bg, borderRadius: 16, gap: 6 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 10 }}>
      <Label size={18} bold accessibilityRole="header">Upcoming events</Label><BrandMark size={24} />
    </View>
    {events.map((event, index) => <Pressable key={event.id} accessibilityRole={onOpen ? "button" : undefined} accessibilityLabel={onOpen ? `Open ${event.title}` : event.title} disabled={!onOpen} onPress={() => onOpen?.(event.id)} style={({ pressed }) => ({ paddingVertical: 12, gap: 4, borderBottomWidth: index < events.length - 1 ? 1 : 0, borderBottomColor: c.line, opacity: pressed ? 0.65 : 1, minHeight: 64 })}>
      <Label size={12} style={{ color: c.blue }}>{dateLabel(new Date(event.startsAt).toISOString(), snapshot.timezone)} · {clock(new Date(event.startsAt).toISOString(), snapshot.timezone)}</Label>
      <Label size={index === 0 ? 22 : 17} bold numberOfLines={2}>{event.title}</Label>
      <Label size={13} muted numberOfLines={1}>{event.venue}</Label>
    </Pressable>)}
    {!events.length && <View style={{ gap: 6, paddingVertical: 28 }}><Label size={20} bold>Nothing coming up</Label><Label size={14} muted>Future events will appear here after the app syncs.</Label></View>}
    <Label size={12} muted style={{ paddingTop: 10 }}>{snapshot.updatedAt ? 'Updated ' + clock(new Date(snapshot.updatedAt).toISOString(), snapshot.timezone) : 'Saved events · Open the app to sync'}</Label>
  </View>;
}
