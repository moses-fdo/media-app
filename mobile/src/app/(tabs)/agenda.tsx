import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock3, MapPin, CalendarDays, Plus, Building2 } from 'lucide-react-native';
import { DateTime } from 'luxon';
import { api, useAuth } from '../../auth/context';
import { RequestPage } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Brand } from '../../components/Brand';
import { Label, ErrorNote, Empty, Button } from '../../components/ui';
import { clock, formatDeadline, statusLabel } from '../../features/requests/presentation';
import { eventsByDay, monthDays } from '../../features/requests/calendar';
import { useCachedQuery } from '../../features/requests/useCachedQuery';

export default function Agenda() {
  const { colors: c } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const gridWidth = Math.max(Math.min(width - 40, 680), Math.ceil(38 * fontScale) * 7, 336);
  const dayHeight = Math.max(52, 44 * fontScale);
  const { me } = useAuth();
  const zone = me?.timezone || 'Asia/Kolkata';
  const today = DateTime.now().setZone(zone).toISODate()!;
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today);
  const query = useCachedQuery<RequestPage>('agenda', async () => {
    const items: RequestPage['items'] = [];
    let cursor: string | null = null;
    do {
      const page: RequestPage = await api.get('/requests?tab=agenda&limit=100' + (cursor ? '&cursor=' + cursor : ''));
      items.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor);
    return { items, next_cursor: null, counts: {} };
  });
  const grouped = useMemo(() => eventsByDay(query.data?.items || [], zone), [query.data, zone]);
  const events = grouped.get(selected) || [];
  const days = monthDays(month);
  const unscheduled = (query.data?.items || []).filter(item => !item.event_start).length;
  function moveMonth(direction: number) {
    const next = DateTime.fromISO(month).startOf('month').plus({ months: direction });
    const day = Math.min(DateTime.fromISO(selected).day, next.daysInMonth!);
    const nextSelected = next.set({ day }).toISODate()!;
    setMonth(nextSelected);
    setSelected(nextSelected);
  }
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={events}
        keyExtractor={item => item.id}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 18, paddingBottom: 40, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}
        ListHeaderComponent={<>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Brand />
            <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}><Label size={16}>{me?.name?.[0] || 'M'}</Label></View></Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 20, marginBottom: 18 }}>
            <Label size={36} bold accessibilityRole="header" style={{ letterSpacing: -1 }}>Agenda</Label>
            <Button title="Today" icon={<CalendarDays size={18} color={c.blue} />} quiet onPress={() => { setSelected(today); setMonth(today); }} style={{ minHeight: 48, paddingVertical: 9, backgroundColor: 'transparent', borderColor: c.blue, borderWidth: 1, borderRadius: 12 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={23} color={c.ink} /></Pressable>
            <Label bold size={22} accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>{DateTime.fromISO(month).toFormat('LLLL yyyy')}</Label>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={23} color={c.ink} /></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={gridWidth > width - 40} contentContainerStyle={{ width: gridWidth }}><View style={{ width: gridWidth }}>
          <View style={{ flexDirection: 'row', marginBottom: 5 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Label key={index} size={14} muted style={{ width: '14.285714%', textAlign: 'center', paddingVertical: 8 }}>{day}</Label>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map(day => {
              if (!day.inMonth) return <View key={day.key} style={{ width: '14.285714%', height: dayHeight }} />;
              const active = day.key === selected;
              const isToday = day.key === today;
              const count = grouped.get(day.key)?.length || 0;
              return <Pressable key={day.key} accessibilityRole="button" accessibilityLabel={`${DateTime.fromISO(day.key).toFormat('cccc, d LLLL yyyy')}, ${count} ${count === 1 ? 'event' : 'events'}${isToday ? ', today' : ''}`} aria-selected={active} accessibilityState={{ selected: active }} onPress={() => setSelected(day.key)} style={{ width: '14.285714%', height: dayHeight, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <View style={{ width: Math.max(40, 32 * fontScale), height: Math.max(40, 32 * fontScale), borderRadius: Math.max(20, 16 * fontScale), alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.blue : 'transparent', borderWidth: isToday && !active ? 1 : 0, borderColor: c.blue }}><Label size={16} bold={active || isToday} style={{ color: active ? c.onAccent : c.ink }}>{day.day}</Label></View>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: count ? c.blue : 'transparent' }} />
              </Pressable>;
            })}
          </View>
          </View></ScrollView>
          <View style={{ marginTop: 20, paddingTop: 22, paddingBottom: 8, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}><Label bold size={22} accessibilityRole="header">{DateTime.fromISO(selected).toFormat('cccc, d LLLL')}</Label><Label muted size={14} accessibilityLiveRegion="polite">{events.length} {events.length === 1 ? 'event' : 'events'}</Label></View>
          <ErrorNote error={query.error} />
          {query.offline && <Label size={13} style={{ color: c.amber }}>Offline · Showing saved events</Label>}
        </>}
        renderItem={({ item }) => {
          const [time, period] = clock(item.event_start!, zone).split(' ');
          const overdue = !['completed', 'cancelled'].includes(item.status) && !!item.setup_deadline && Date.parse(item.setup_deadline) < Date.now();
          return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${clock(item.event_start!, zone)}, ${statusLabel(item.status)}`} onPress={() => router.push('/requests/' + item.id)} style={({ pressed }) => ({ flexDirection: fontScale > 1.3 || width < 360 ? 'column' : 'row', gap: 12, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: c.line, opacity: pressed ? 0.65 : 1 })}>
            <View style={{ minWidth: 60, paddingTop: 1 }}><Label bold size={21} style={{ fontVariant: ['tabular-nums'] }}>{time}</Label><Label size={12} muted>{period}</Label></View>
            <View style={{ flex: 1, paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: c.blue, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}><Label size={20} bold style={{ flex: 1, lineHeight: 27 }}>{item.title}</Label><ChevronRight size={18} color={c.muted} style={{ marginTop: 4 }} /></View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><MapPin size={16} color={c.muted} /><Label muted size={14} style={{ flex: 1 }}>{item.venue || 'Venue to confirm'}</Label></View>
              {!!item.organizer && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Building2 size={16} color={c.muted} /><Label muted size={14} style={{ flex: 1 }}>{item.organizer}</Label></View>}
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Clock3 size={14} color={overdue ? c.red : c.amber} /><Label size={13} style={{ flex: 1, color: overdue ? c.red : c.amber }}>{overdue ? 'Setup overdue · ' + clock(item.setup_deadline!, zone) : formatDeadline(item.setup_deadline, zone)}</Label></View>
              {['needs_review', 'completed'].includes(item.status) && <Label size={12} style={{ color: item.status === 'completed' ? c.green : c.amber }}>{statusLabel(item.status)}</Label>}
            </View>
          </Pressable>;
        }}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator color={c.blue} style={{ padding: 32 }} /> : <Empty title="No events scheduled" body="Choose another date or add a request for this day." action={{ title: 'Add request', onPress: () => router.push({ pathname: '/requests/new', params: { date: selected } }) }} />}
        ListFooterComponent={<View style={{ gap: 12, paddingTop: 20, alignItems: 'flex-end' }}>
          <Button title="New request" icon={<Plus size={21} color={c.onAccent} />} onPress={() => router.push({ pathname: '/requests/new', params: { date: selected } })} style={{ borderRadius: 28, paddingHorizontal: 22 }} />
          {unscheduled ? <Pressable accessibilityRole="button" onPress={() => router.push('/')} accessibilityLabel={`Review ${unscheduled} requests without an event date`} style={{ minHeight: 48, paddingVertical: 24 }}><Label size={13} muted>{unscheduled} {unscheduled === 1 ? 'request needs' : 'requests need'} an event date. Review in Requests →</Label></Pressable> : null}</View>}
      />
    </SafeAreaView>
  );
}
