import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  SectionList,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Search, RefreshCw, X, Sparkles, SlidersHorizontal } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../../auth/context';
import { RequestPage, Mailbox, MediaRequest } from '../../api/types';
import { layout, radius, spacing, useTheme } from '../../theme';
import { Label, Empty, ErrorNote, Button, AnimatedPressable, StatusBadge } from '../../components/ui';
import { RequestRow } from '../../features/requests/RequestRow';
import { groupRequests } from '../../features/requests/presentation';
import { useCachedQuery } from '../../features/requests/useCachedQuery';

export default function Requests() {
  const { colors: c } = useTheme();
  const { me } = useAuth();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [more, setMore] = useState<MediaRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [paging, setPaging] = useState(false);
  const [syncError, setSyncError] = useState<unknown>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Rotation animation for the sync button icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  const path = '/requests?tab=' + tab + '&q=' + encodeURIComponent(search);
  const query = useCachedQuery<RequestPage>(path, () => api.get(path));
  const mailbox = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => api.get<Mailbox>('/mailbox/status'),
    refetchInterval: 30000,
  });

  const activeSync = isSyncing || query.isRefetching;

  useEffect(() => {
    if (activeSync) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoop.current.start();
    } else {
      if (spinLoop.current) {
        spinLoop.current.stop();
        spinLoop.current = null;
      }
      spinAnim.setValue(0);
    }
    return () => {
      if (spinLoop.current) {
        spinLoop.current.stop();
      }
    };
  }, [activeSync, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sections = useMemo(
    () => groupRequests([...(query.data?.items || []), ...more], me?.timezone || 'Asia/Kolkata'),
    [query.data, more, me]
  );

  const tabs = [
    ['active', 'Active'],
    ['needs_review', 'Needs review'],
    ['completed', 'Completed'],
  ];

  async function refresh() {
    setMore([]);
    setCursor(null);
    setSyncError(null);
    try {
      if (!me?.demo && mailbox.data?.status !== 'disconnected') {
        await api.post('/mailbox/sync');
      }
    } catch (e) {
      setSyncError(e);
    }
    await Promise.all([query.refetch(), mailbox.refetch()]);
  }

  async function handleInstantRefresh() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function next() {
    const nextCursor = cursor || query.data?.next_cursor;
    if (!nextCursor || nextCursor === 'END' || paging) return;
    setPaging(true);
    try {
      const page = await api.get<RequestPage>(path + '&cursor=' + nextCursor);
      setMore((x) => [...x, ...page.items]);
      setCursor(page.next_cursor || 'END');
    } catch (e) {
      setSyncError(e);
    } finally {
      setPaging(false);
    }
  }

  function handleClearSearch() {
    setSearch('');
    setMore([]);
    setCursor(null);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(x) => x.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 110,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
        refreshing={query.isRefetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ paddingTop: 14 }}>
            {/* Top Operational Status Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: c.blueSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={16} color={c.blue} />
                </View>
                <Label size={17} bold style={{ letterSpacing: -0.2 }}>
                  Karunya Media Desk
                </Label>
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                onPress={() => router.push('/settings')}
                activeScale={0.94}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label bold size={15} style={{ color: c.blue }}>
                  {me?.name?.[0] || 'M'}
                </Label>
              </AnimatedPressable>
            </View>

            {/* Screen Headline & Action */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Label size={36} bold style={{ letterSpacing: -1.2 }}>
                  Requests
                </Label>
                {!!query.data?.counts?.[tab] && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radius.full,
                      backgroundColor: c.blueSoft,
                    }}
                  >
                    <Label bold size={13} style={{ color: c.blue }}>
                      {query.data.counts[tab]}
                    </Label>
                  </View>
                )}
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Add request"
                onPress={() => router.push('/requests/new')}
                activeScale={0.92}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: c.blue,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Plus color={c.onAccent} size={24} strokeWidth={2.4} />
              </AnimatedPressable>
            </View>

            {/* Connection / Mailbox Sub-banner */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: me?.demo
                    ? c.amber
                    : mailbox.data?.status === 'connected'
                    ? c.green
                    : c.muted,
                }}
              />
              <Label size={13} muted>
                {me?.demo
                  ? 'Demo workspace · Sample requests'
                  : mailbox.data?.status === 'connected'
                  ? 'Gmail connected · ' +
                    (mailbox.data.last_synced
                      ? 'Last sync ' +
                        new Date(mailbox.data.last_synced).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Waiting for first sync')
                  : mailbox.data?.status === 'syncing'
                  ? 'Checking for new requests…'
                  : 'Connect Gmail in Settings'}
              </Label>
            </View>

            {/* Modern Search Bar with Clear Button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: c.surface,
                paddingHorizontal: 14,
                borderRadius: radius.lg,
                borderWidth: 1.5,
                borderColor: c.line,
                minHeight: 48,
              }}
            >
              <Search color={c.muted} size={19} />
              <TextInput
                accessibilityLabel="Search requests"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setMore([]);
                  setCursor(null);
                }}
                placeholder="Search by event, organizer, or venue"
                placeholderTextColor={c.muted}
                style={{ flex: 1, minHeight: 46, fontSize: 15, color: c.ink }}
              />
              {search.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={handleClearSearch}
                  hitSlop={8}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: c.surfaceSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={14} color={c.muted} strokeWidth={2.5} />
                </Pressable>
              )}
            </View>

            {/* Fluid Segmented Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 14 }}
              style={{ marginTop: 4, borderBottomWidth: 1, borderBottomColor: c.line }}
            >
              {tabs.map(([id, label]) => {
                const isSelected = tab === id;
                const count = query.data?.counts?.[id];
                return (
                  <AnimatedPressable
                    key={id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setTab(id);
                      setMore([]);
                      setCursor(null);
                    }}
                    activeScale={0.96}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: radius.full,
                      backgroundColor: isSelected ? c.blue : c.surfaceSubtle,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <Label
                      size={14}
                      bold={isSelected}
                      style={{
                        color: isSelected ? c.onAccent : c.muted,
                      }}
                    >
                      {label}
                    </Label>
                    {typeof count === 'number' && (
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: radius.full,
                          backgroundColor: isSelected
                            ? 'rgba(255, 255, 255, 0.25)'
                            : c.line,
                        }}
                      >
                        <Label
                          bold
                          size={11}
                          style={{
                            color: isSelected ? c.onAccent : c.ink,
                          }}
                        >
                          {count}
                        </Label>
                      </View>
                    )}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {query.offline && (
              <Label style={{ paddingTop: 10, color: c.amber }}>
                Offline · Showing saved requests
              </Label>
            )}
            <ErrorNote error={syncError || (!query.offline ? query.error : null)} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 24,
              paddingBottom: 10,
            }}
          >
            <Label
              size={14}
              bold
              style={{
                color: section.title === 'Overdue' ? c.red : c.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {section.title}
            </Label>
            <Label size={12} muted>
              {section.data.length} {section.data.length === 1 ? 'event' : 'events'}
            </Label>
          </View>
        )}
        renderItem={({ item }) => (
          <RequestRow item={item} onPress={() => router.push('/requests/' + item.id)} />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator style={{ margin: 50 }} color={c.blue} />
          ) : (
            <Empty
              title={search ? 'No matching requests' : 'You’re all caught up'}
              body={
                search
                  ? 'Try searching for another event name, organizer, or venue.'
                  : 'New media requests will appear here automatically as soon as verified emails arrive.'
              }
              action={
                search
                  ? { title: 'Clear search', onPress: handleClearSearch }
                  : { title: 'Sync Mailbox now', onPress: handleInstantRefresh }
              }
            />
          )
        }
        ListFooterComponent={
          query.data?.next_cursor && cursor !== 'END' ? (
            <View style={{ marginTop: 12 }}>
              <Button
                title="Load more requests"
                quiet
                busy={paging}
                onPress={next}
              />
            </View>
          ) : undefined
        }
      />

      {/* Fluid Floating Sync Mailbox Action */}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Sync and refresh requests"
        onPress={handleInstantRefresh}
        disabled={activeSync}
        activeScale={0.94}
        style={{
          position: 'absolute',
          bottom: 24,
          right: layout.gutter,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderRadius: radius.full,
          backgroundColor: c.blue,
          shadowColor: c.blue,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
          opacity: activeSync ? 0.85 : 1,
          zIndex: 99,
        }}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={17} color={c.onAccent} strokeWidth={2.4} />
        </Animated.View>
        <Label bold size={14} style={{ color: c.onAccent }}>
          {activeSync ? 'Checking mailbox…' : 'Sync Mailbox'}
        </Label>
      </AnimatedPressable>
    </SafeAreaView>
  );
}
