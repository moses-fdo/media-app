import React, { useState, useMemo } from 'react';
import { View, TextInput, Pressable, SectionList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Search, RefreshCw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../../auth/context';
import { RequestPage, Mailbox, MediaRequest } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, Empty, ErrorNote, Button } from '../../components/ui';
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

  const path = '/requests?tab=' + tab + '&q=' + encodeURIComponent(search);
  const query = useCachedQuery<RequestPage>(path, () => api.get(path));
  const mailbox = useQuery({
    queryKey: ['mailbox'],
    queryFn: () => api.get<Mailbox>('/mailbox/status'),
    refetchInterval: 30000,
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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(x) => x.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 85,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
        refreshing={query.isRefetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Label size={18} bold>Karunya Media Desk</Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                onPress={() => router.push('/settings')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.input,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label bold>{me?.name?.[0] || 'M'}</Label>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <Label size={36} bold style={{ letterSpacing: -1.1, flexShrink: 1 }}>Requests</Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add request"
                onPress={() => router.push('/requests/new')}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: c.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus color={c.onAccent} size={26} strokeWidth={1.8} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, marginBottom: 22 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: me?.demo ? c.amber : mailbox.data?.status === 'connected' ? c.green : c.muted,
                }}
              />
              <Label size={12} muted>
                {me?.demo
                  ? 'Demo workspace · Sample requests'
                  : mailbox.data?.status === 'connected'
                  ? 'Gmail connected · ' +
                    (mailbox.data.last_synced
                      ? 'Last sync ' + new Date(mailbox.data.last_synced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Waiting for first sync')
                  : mailbox.data?.status === 'syncing'
                  ? 'Checking for new requests…'
                  : 'Connect Gmail in Settings'}
              </Label>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: c.input,
                paddingHorizontal: 13,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Search color={c.muted} size={20} />
              <TextInput
                accessibilityLabel="Search requests"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setMore([]);
                  setCursor(null);
                }}
                placeholder="Search requests"
                placeholderTextColor={c.muted}
                style={{ flex: 1, minHeight: 48, fontSize: 16, color: c.ink }}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {tabs.map(([id, label]) => (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === id }}
                  onPress={() => {
                    setTab(id);
                    setMore([]);
                    setCursor(null);
                  }}
                  style={{
                    minHeight: 52,
                    paddingHorizontal: 8,
                    marginRight: 9,
                    borderBottomWidth: 2,
                    borderBottomColor: tab === id ? c.blue : 'transparent',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Label size={14} bold={tab === id} style={{ color: tab === id ? c.blue : c.muted }}>
                      {label}
                    </Label>
                    {!!query.data?.counts[id] && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: tab === id ? c.blueSoft : c.input }}>
                        <Label size={12} style={{ color: tab === id ? c.blue : c.muted }}>
                          {query.data.counts[id]}
                        </Label>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {query.offline && <Label style={{ paddingTop: 12, color: c.amber }}>Offline · Showing saved requests</Label>}
            <ErrorNote error={syncError || (!query.offline ? query.error : null)} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: 24, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Label size={14} bold style={{ color: section.title === 'Overdue' ? c.red : c.muted }}>
              {section.title}
            </Label>
          </View>
        )}
        renderItem={({ item }) => <RequestRow item={item} onPress={() => router.push('/requests/' + item.id)} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator style={{ margin: 50 }} color={c.blue} />
          ) : (
            <Empty
              title={search ? 'No matching requests' : 'You’re all caught up'}
              body={search ? 'Try an event name, organizer or venue.' : 'New media requests will appear here after Gmail is connected and synchronized.'}
            />
          )
        }
        ListFooterComponent={
          query.data?.next_cursor && cursor !== 'END' ? (
            <Button title="Load more requests" quiet busy={paging} onPress={next} />
          ) : undefined
        }
      />

      {/* Floating Refresh Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync and refresh requests"
        onPress={handleInstantRefresh}
        disabled={isSyncing || query.isRefetching}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24,
          right: layout.gutter,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 24,
          backgroundColor: c.blue,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
          opacity: pressed ? 0.8 : (isSyncing || query.isRefetching) ? 0.75 : 1,
          zIndex: 99,
        })}
      >
        {isSyncing || query.isRefetching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <RefreshCw size={17} color="#fff" strokeWidth={2.2} />
        )}
        <Label bold size={13} style={{ color: '#fff' }}>
          {isSyncing || query.isRefetching ? 'Checking emails…' : 'Sync Mailbox'}
        </Label>
      </Pressable>
    </SafeAreaView>
  );
}
