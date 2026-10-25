import { useState, useMemo, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, SectionList, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Search, RefreshCw, X, SlidersHorizontal, AlertTriangle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../../auth/context';
import { RequestPage, Mailbox, MediaRequest } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, Empty, ErrorNote, Button, useReducedMotion } from '../../components/ui';
import { Brand } from '../../components/Brand';
import { RequestRow } from '../../features/requests/RequestRow';
import { groupRequests } from '../../features/requests/presentation';
import { createWidgetSnapshot, loadWidgetEvents } from '../../widgets/model';
import { clock, dateLabel } from '../../features/requests/presentation';
import { useCachedQuery } from '../../features/requests/useCachedQuery';

export default function Requests() {
  const { colors: c } = useTheme();
  const { me } = useAuth();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [more, setMore] = useState<MediaRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);
  const [syncError, setSyncError] = useState<unknown>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const reducedMotion = useReducedMotion();
  const [syncNotice, setSyncNotice] = useState('');
  const syncRequestedAt = useRef(0);
  const [requestedAfter, setRequestedAfter] = useState<string | null | undefined>(undefined);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const path = '/requests?tab=' + tab + '&q=' + encodeURIComponent(search) + (department ? '&department=' + department : '');
  const pathRef = useRef(path);
  pathRef.current = path;
  const query = useCachedQuery<RequestPage>(path, () => api.get(path));
  const mailbox = useQuery({ queryKey: [me?.workspace_id, 'mailbox'], queryFn: () => api.get<Mailbox>('/mailbox/status'), refetchInterval: requestedAfter === undefined ? 30000 : 3000 });
  const focus = useQuery({ queryKey: [me?.workspace_id, 'agenda'], enabled: !!me, queryFn: async () => ({ items: await loadWidgetEvents(path => api.get(path)), next_cursor: null, counts: {} }), refetchInterval: 30000 });
  const nextEvent = focus.data ? createWidgetSnapshot(focus.data.items, me?.workspace_id || '', me?.timezone || 'Asia/Kolkata').events[0] : undefined;
  const mailboxIssue = !!mailbox.error || ['error', 'reconnect_required', 'disconnected'].includes(mailbox.data?.status || '');
  useEffect(() => {
    if (requestedAfter === undefined) return;
    if (mailbox.data?.status === 'connected' && mailbox.data.last_synced && mailbox.data.last_synced !== requestedAfter && mailbox.data.queued === 0) {
      setRequestedAfter(undefined);
      setSyncNotice('Gmail and request processing are up to date.');
      query.refetch(); focus.refetch();
    } else if (mailbox.dataUpdatedAt > syncRequestedAt.current && ['error', 'reconnect_required'].includes(mailbox.data?.status || '')) {
      setRequestedAfter(undefined); setSyncNotice('Sync needs attention. Review the Gmail connection and retry.');
    }
  }, [requestedAfter, mailbox.data]);
  useEffect(() => {
    if (requestedAfter !== undefined || !syncNotice) return;
    const timer = setTimeout(() => setSyncNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [requestedAfter, syncNotice]);
  const activeSync = isSyncing || query.isRefetching;
  useEffect(() => {
    if (!activeSync || reducedMotion) { spinAnim.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [activeSync, spinAnim, reducedMotion]);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const visibleItems = useMemo(() => {
    const raw = [...(query.data?.items || []), ...more];
    return raw.filter(item => {
      if (item.status === 'dismissed') return false;
      if (item.status === 'cancelled') return tab === 'completed';
      if (item.status === 'needs_review') {
        const hasTag = /^\[media\s*request\]/i.test((item.title || '').replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '').trim());
        const hasGear = item.requirements && item.requirements.length > 0;
        const hasVenue = !!item.venue && item.venue.trim().length > 0;
        const isManual = !item.sources || item.sources.length === 0;
        if (!isManual && !hasTag && !hasGear) return false;
        if (!isManual && !hasGear && !hasVenue) return false;
      }
      return true;
    });
  }, [query.data, more, tab]);
  const sections = useMemo(() => groupRequests(visibleItems, me?.timezone || 'Asia/Kolkata'), [visibleItems, me]);
  function resetPage() { setMore([]); setCursor(null); }
  async function refresh() {
    if (isSyncing) return;
    setIsSyncing(true);
    resetPage();
    setSyncError(null);
    try {
      if (!me?.demo && ['connected','error'].includes(mailbox.data?.status || '')) {
        try { syncRequestedAt.current = Date.now(); await api.post('/mailbox/sync'); setRequestedAfter(mailbox.data?.last_synced || null); setSyncNotice('Sync requested. New requests will appear as processing finishes.'); }
        catch (error) { setSyncError(error); }
      }
      await Promise.all([query.refetch(), mailbox.refetch(), focus.refetch()]);
    } catch (error) { setSyncError(error); }
    finally { setIsSyncing(false); }
  }
  async function next() {
    const nextCursor = cursor || query.data?.next_cursor;
    if (!nextCursor || nextCursor === 'END' || paging) return;
    const requestedPath = path;
    setPaging(true);
    try {
      const page = await api.get<RequestPage>(path + '&cursor=' + nextCursor);
      if (pathRef.current === requestedPath) { setMore(items => [...items, ...page.items]); setCursor(page.next_cursor || 'END'); }
    } catch (error) { setSyncError(error); }
    finally { setPaging(false); }
  }
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: 18, paddingBottom: 40, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}
        refreshing={activeSync}
        onRefresh={refresh}
        ListHeaderComponent={<View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Brand />
            <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}><Label size={16}>{me?.name?.[0] || 'M'}</Label></View></Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
            <Label size={36} bold accessibilityRole="header" style={{ letterSpacing: -1 }}>Requests</Label>
            <Button title="New" icon={<Plus color={c.onAccent} size={20} />} onPress={() => router.push('/requests/new')} style={{ minHeight: 48, paddingHorizontal: 14, paddingVertical: 9 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 12 }}>
            <Label size={13} muted style={{ flex: 1 }} accessibilityLiveRegion="polite">{mailbox.isLoading ? 'Checking Gmail connection…' : mailbox.error ? 'Connection status unavailable' : mailbox.data?.status === 'syncing' ? 'Checking incoming mail…' : mailbox.data?.status === 'error' ? 'Gmail sync needs attention' : mailbox.data?.status === 'reconnect_required' ? 'Gmail access has expired' : mailbox.data?.status === 'disconnected' ? 'Gmail is not connected' : mailbox.data?.last_synced ? 'Last synced ' + new Date(mailbox.data.last_synced).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: me?.timezone || 'Asia/Kolkata' }) : 'Gmail connected · First sync pending'}</Label>
            <Pressable accessibilityRole="button" accessibilityLabel="Sync mailbox" accessibilityState={{ busy: activeSync, disabled: activeSync }} disabled={activeSync} onPress={refresh} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Animated.View style={{ transform: [{ rotate: spin }] }}><RefreshCw size={21} color={c.muted} strokeWidth={1.7} /></Animated.View></Pressable>
          </View>
          {mailboxIssue && <View style={{ padding: 14, backgroundColor: c.amberSoft, borderRadius: 12, gap: 10, marginBottom: 16 }}><Label size={14} style={{ color: c.amber }}>{mailbox.error ? 'Your saved requests are still available. Check your connection and retry.' : me?.role === 'admin' ? 'Review the Gmail connection to keep requests up to date.' : 'Ask your administrator to check the shared Gmail connection.'}</Label><Button title="Review Gmail connection" quiet onPress={() => router.push('/settings/mailbox')} /></View>}
          {!!syncNotice && <Label size={13} muted accessibilityLiveRegion="polite" style={{ marginBottom: 16 }}>{syncNotice}</Label>}
          {!search && !department && tab === 'active' && <View style={{ gap: 12, paddingBottom: 24 }}>
            {nextEvent && <Pressable accessibilityRole="button" accessibilityLabel={`Next event: ${nextEvent.title}`} onPress={() => router.push('/requests/' + nextEvent.id)} style={{ paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, gap: 6 }}><Label size={13} style={{ color: c.blue }}>Next event{focus.isError ? ' · Saved information' : ''}</Label><Label size={23} bold>{nextEvent.title}</Label><Label size={14}>{dateLabel(new Date(nextEvent.startsAt).toISOString(), me?.timezone || 'Asia/Kolkata')} · {clock(new Date(nextEvent.startsAt).toISOString(), me?.timezone || 'Asia/Kolkata')}</Label><Label size={14} muted>{nextEvent.venue}</Label></Pressable>}
            {!!query.data?.counts?.needs_review && <Button title={`Review ${query.data.counts.needs_review} ${query.data.counts.needs_review === 1 ? 'request' : 'requests'}`} quiet onPress={() => { setTab('needs_review'); resetPage(); }} />}
          </View>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceSubtle, borderRadius: 10, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12 }}>
              <Search size={18} color={c.muted} />
              <TextInput accessibilityLabel="Search requests" value={search} onChangeText={value => { setSearch(value); resetPage(); }} placeholder="Search requests" placeholderTextColor={c.muted} style={{ flex: 1, minWidth: 0, minHeight: 48, fontSize: 15, color: c.ink }} />
              {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setSearch(''); resetPage(); }} style={{ minHeight: 48, width: 48, alignItems: 'center', justifyContent: 'center' }}><X size={17} color={c.muted} /></Pressable>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Filter requests" aria-expanded={filtersOpen} accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(!filtersOpen)} style={{ width: 48, height: 48, borderWidth: 1, borderColor: department ? c.blue : c.line, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: department ? c.blueSoft : 'transparent' }}><SlidersHorizontal size={20} color={department ? c.blue : c.muted} /></Pressable>
          </View>
          {(!!search || !!department) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 8 }}><Label size={13} style={{ flex: 1, color: c.blue }}>{department ? department[0].toUpperCase() + department.slice(1) + ' equipment' : 'All equipment'}{search ? ` · “${search}”` : ''}</Label><Button title="Clear filters" quiet onPress={() => { setSearch(''); setDepartment(''); resetPage(); }} /></View>}
          {filtersOpen && <View style={{ paddingTop: 14, gap: 8 }}><Label size={12} muted>Equipment department</Label><View accessibilityRole="radiogroup" accessibilityLabel="Equipment department" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['', 'All'], ['audio', 'Audio'], ['video', 'Video'], ['other', 'Other']].map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} aria-checked={department === key} accessibilityState={{ checked: department === key }} onPress={() => { setDepartment(key); resetPage(); }} style={{ flex: 1, minWidth: 64, minHeight: 48, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: department === key ? c.blueSoft : c.surfaceSubtle }}><Label size={13} bold={department === key} style={{ color: department === key ? c.blue : c.muted }}>{label}</Label></Pressable>)}</View></View>}
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line, marginTop: 18 }}>
            {[['active', 'Active'], ['needs_review', 'Review'], ['completed', 'Done']].map(([key, label]) => {
              const countVal = key === 'needs_review' && tab === 'needs_review' ? visibleItems.length : (query.data?.counts?.[key] ?? '');
              return (
                <Pressable key={key} accessibilityRole="tab" accessibilityLabel={`${label} requests`} aria-selected={tab === key} accessibilityState={{ selected: tab === key }} onPress={() => { setTab(key); resetPage(); }} style={{ flex: 1, minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? c.blue : 'transparent' }}>
                  <Label bold={tab === key} size={15} style={{ color: tab === key ? c.blue : c.muted }}>{label}</Label>
                  <Label size={13} style={{ color: tab === key ? c.blue : c.muted }}>{countVal}</Label>
                </Pressable>
              );
            })}
          </View>
          {tab === 'needs_review' && (
            <View style={{ marginTop: 14, padding: 14, backgroundColor: c.amberSoft, borderRadius: 10, borderWidth: 1, borderColor: c.amber, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} color={c.amber} />
                <Label size={14} bold style={{ color: c.amber }}>Strict Media Request Review</Label>
              </View>
              <Label size={12} style={{ color: c.ink, lineHeight: 18 }}>
                Only requests matching the standard media request template appear here. Verify schedule, venue, and equipment before confirming.
              </Label>
            </View>
          )}
          <ErrorNote error={query.error || syncError} />
          {(!!query.error || !!syncError) && <Button title="Retry loading requests" quiet busy={activeSync} onPress={refresh} style={{ marginTop: 12 }} />}
          {query.offline && <Label size={13} style={{ color: c.amber, marginTop: 12 }}>Offline · Showing saved requests</Label>}
        </View>}
        renderSectionHeader={({ section }) => <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}><Label bold size={15} accessibilityRole="header" style={{ color: section.title === 'Overdue' ? c.red : c.ink }}>{section.title}</Label><Label muted size={12}>{section.data.length} {section.data.length === 1 ? 'event' : 'events'}</Label></View>}
        renderItem={({ item }) => <RequestRow item={item} onPress={() => router.push('/requests/' + item.id)} />}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator style={{ margin: 48 }} color={c.blue} /> : <Empty title={search || department ? 'No matching requests' : tab === 'needs_review' ? 'You’re all caught up' : tab === 'completed' ? 'No completed requests yet' : 'No active requests'} body={search || department ? 'Clear the filters to see all requests, or try another search.' : tab === 'needs_review' ? 'No media requests currently need review. General circulars and non-media emails are automatically excluded.' : tab === 'completed' ? 'Events you complete or cancel will appear here.' : mailboxIssue ? 'Connect your department Gmail to import requests, or add an event yourself.' : 'Incoming Gmail requests will appear after sync. You can also add an event yourself.'} action={search || department ? { title: 'Show all requests', onPress: () => { setSearch(''); setDepartment(''); resetPage(); } } : tab === 'needs_review' ? { title: 'View Request Template', onPress: () => router.push('/settings/template') } : tab === 'active' ? { title: 'Add request', onPress: () => router.push('/requests/new') } : undefined} />}
        ListFooterComponent={cursor !== 'END' && (cursor || query.data?.next_cursor) ? <Button title="Load more requests" quiet busy={paging} onPress={next} style={{ marginTop: 20 }} /> : undefined}
      />
    </SafeAreaView>
  );
}
