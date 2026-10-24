import React from 'react';
import { SectionList, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Calendar, Clock } from 'lucide-react-native';
import { api, useAuth } from '../../auth/context';
import { RequestPage } from '../../api/types';
import { layout, radius, spacing, useTheme } from '../../theme';
import { Label, ErrorNote, Empty } from '../../components/ui';
import { RequestRow } from '../../features/requests/RequestRow';
import { dateLabel } from '../../features/requests/presentation';
import { useCachedQuery } from '../../features/requests/useCachedQuery';

export default function Agenda() {
  const { colors: c } = useTheme();
  const { me } = useAuth();

  const query = useCachedQuery<RequestPage>('agenda', async () => {
    let items: RequestPage['items'] = [];
    let cursor: string | null = null;
    do {
      const page: RequestPage = await api.get(
        '/requests?tab=agenda&limit=100' + (cursor ? '&cursor=' + cursor : '')
      );
      items.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor);
    return { items, next_cursor: null, counts: {} };
  });

  const groups = new Map<string, RequestPage['items']>();
  const sorted = [...(query.data?.items || [])].sort((a, b) =>
    (a.event_start || '9999').localeCompare(b.event_start || '9999')
  );

  for (const r of sorted) {
    const label = dateLabel(r.event_start, me?.timezone || 'Asia/Kolkata');
    groups.set(label, [...(groups.get(label) || []), r]);
  }

  const sections = Array.from(groups, ([title, data]) => ({ title, data }));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: 40,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
        stickySectionHeadersEnabled={false}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <View style={{ paddingTop: 14, paddingBottom: 10, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
                <Calendar size={16} color={c.blue} />
              </View>
              <Label size={17} bold style={{ letterSpacing: -0.2 }}>
                Schedule Timeline
              </Label>
            </View>

            <Label size={36} bold style={{ letterSpacing: -1.2 }}>
              Agenda
            </Label>
            <Label muted size={14}>
              Chronological schedule of confirmed and upcoming media desk coverage.
            </Label>
            <ErrorNote error={query.error} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingTop: 24,
              paddingBottom: 10,
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: c.surfaceSubtle,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Label bold size={13} style={{ color: c.ink }}>
                {section.title}
              </Label>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            <Label size={12} muted>
              {section.data.length} {section.data.length === 1 ? 'event' : 'events'}
            </Label>
          </View>
        )}
        renderItem={({ item }) => (
          <RequestRow
            item={item}
            onPress={() => router.push('/requests/' + item.id)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator style={{ margin: 50 }} color={c.blue} />
          ) : (
            <Empty
              title="No events scheduled"
              body="Upcoming confirmed requests will appear in your timeline automatically."
              action={{
                title: 'Go to Requests',
                onPress: () => router.push('/(tabs)'),
              }}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
