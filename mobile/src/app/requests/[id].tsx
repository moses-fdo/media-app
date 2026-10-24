import React, { useState } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Mail, MapPin, Clock3, Pencil, Headphones, Video, Layers, CalendarDays } from 'lucide-react-native';
import { api, queryClient } from '../../auth/context';
import { MediaRequest } from '../../api/types';
import { layout, useTheme } from '../../theme';
import { Label, Button, ErrorNote } from '../../components/ui';
import { useCachedQuery } from '../../features/requests/useCachedQuery';
import { dateLabel, clock, statusLabel } from '../../features/requests/presentation';
import { RequestForm } from '../../features/requests/RequestForm';

export default function Detail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useTheme();
  const query = useCachedQuery<MediaRequest>('request:' + id, () => api.get('/requests/' + id));

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const r = query.data;

  async function patch(data: any) {
    if (!r) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.patch<MediaRequest>('/requests/' + id, {
        expected_version: r.version,
        ...data,
      });
      queryClient.setQueryData([undefined, 'request:' + id], result);
      await queryClient.invalidateQueries();
      await query.refetch();
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function act(data: any) {
    try {
      await patch(data);
    } catch {}
  }

  if (!r) {
    return (
      <View style={{ padding: 22 }}>
        {query.isLoading ? <ActivityIndicator color={c.blue} /> : <ErrorNote error={query.error} />}
      </View>
    );
  }

  if (editing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 50 }}>
          <RequestForm
            initial={r}
            timezone={r.timezone}
            onSave={async (data) => {
              await patch(data);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 12,
          paddingBottom: 28,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
      >
        {/* Header & Status */}
        <View style={{ gap: 10 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: r.status === 'completed' ? c.greenSoft : c.blueSoft,
            }}
          >
            <Label size={12} style={{ color: r.status === 'completed' ? c.green : c.blue }}>
              {statusLabel(r.status)}
            </Label>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Label size={30} bold style={{ flex: 1, lineHeight: 36, letterSpacing: -0.9 }}>
              {r.title}
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit request"
              onPress={() => setEditing(true)}
              style={{ padding: 10, minHeight: 44, justifyContent: 'center' }}
            >
              <Pencil size={20} color={c.blue} />
            </Pressable>
          </View>

          <Label muted size={15}>{r.organizer || 'Organizer to confirm'}</Label>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <MapPin size={18} color={c.muted} />
            <Label size={14} muted style={{ flex: 1 }}>{r.venue || 'Venue to confirm'}</Label>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <CalendarDays size={18} color={c.muted} />
            <Label size={14} muted style={{ flex: 1 }}>
              {dateLabel(r.event_start, r.timezone)}
              {r.event_start ? ' · ' + clock(r.event_start, r.timezone) : ''}
            </Label>
          </View>

          <View
            style={{
              backgroundColor: c.blueSoft,
              padding: 15,
              borderRadius: 12,
              marginTop: 6,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: c.blue,
            }}
          >
            <Clock3 color={c.blue} size={22} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12} style={{ color: c.blue }}>Setup deadline</Label>
              <Label bold size={16}>
                {r.setup_deadline
                  ? dateLabel(r.setup_deadline, r.timezone) + ' · ' + clock(r.setup_deadline, r.timezone)
                  : 'Needs confirmation'}
              </Label>
            </View>
          </View>

          {r.summary ? <Label style={{ marginTop: 8, lineHeight: 21 }}>{r.summary}</Label> : null}

          {query.offline && <Label style={{ color: c.amber }}>Offline · Changes will require a connection</Label>}
          <ErrorNote error={error} />

          {r.review_reasons.map((reason) => (
            <View key={reason} style={{ padding: 13, backgroundColor: c.amberSoft, borderRadius: 10 }}>
              <Label style={{ color: c.amber }}>{reason}</Label>
            </View>
          ))}
        </View>

        {/* Proposed Updates from new emails */}
        {r.proposed_updates.map((p) => (
          <View key={p.id} style={{ marginTop: 22, padding: 16, backgroundColor: c.amberSoft, borderRadius: 12, gap: 12 }}>
            <Label bold>New email changes</Label>
            {Object.entries(p.changes)
              .filter(([k]) => ['title', 'venue', 'event_start', 'setup_deadline', 'summary'].includes(k))
              .map(([k, v]) => (
                <View key={k}>
                  <Label size={12} muted>{k.replaceAll('_', ' ')}</Label>
                  <Label>{String((r as any)[k] || 'Unspecified')} → {String(v || 'Unspecified')}</Label>
                </View>
              ))}
            <Button
              title="Accept update"
              disabled={busy}
              onPress={async () => {
                try {
                  await api.post(`/requests/${id}/proposals/${p.id}/accept`, { expected_version: r.version });
                  await query.refetch();
                  await queryClient.invalidateQueries();
                } catch (e) {
                  setError(e);
                }
              }}
            />
            <Button
              title="Dismiss update"
              quiet
              onPress={async () => {
                try {
                  await api.post(`/requests/${id}/proposals/${p.id}/dismiss`, { expected_version: r.version });
                  await query.refetch();
                } catch (e) {
                  setError(e);
                }
              }}
            />
          </View>
        ))}

        {/* Clean Equipment List Section */}
        <View style={{ marginTop: 28, gap: 14 }}>
          <Label bold size={20}>Equipment List</Label>

          {['audio', 'video', 'other'].map((dept) => {
            const items = r.requirements.filter((x) => x.department === dept);
            if (!items.length) return null;
            return (
              <View
                key={dept}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 16,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  {dept === 'audio' ? <Headphones size={20} color={c.blue} /> : dept === 'video' ? <Video size={20} color={c.blue} /> : <Layers size={20} color={c.blue} />}
                  <Label bold size={16} style={{ color: c.ink }}>
                    {dept === 'audio' ? 'Audio Gear' : dept === 'video' ? 'Video Gear' : 'Other Equipment'}
                  </Label>
                </View>

                <View style={{ gap: 8 }}>
                  {items.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.blue }} />
                      {item.quantity ? (
                        <Label bold size={15} style={{ color: c.blue }}>
                          {item.quantity} ×
                        </Label>
                      ) : null}
                      <Label size={15} style={{ color: c.ink, flex: 1 }}>
                        {item.title}
                      </Label>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {!r.requirements.length && (
            <View style={{ padding: 16, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line }}>
              <Label muted size={14}>No equipment specified in this request.</Label>
            </View>
          )}
        </View>

        {/* Source Emails */}
        <View style={{ gap: 12, marginTop: 26 }}>
          {r.sources.map((s, i) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={'View source email' + (r.sources.length > 1 ? ' ' + (i + 1) : '')}
              onPress={() => router.push({ pathname: '/source', params: { id: s } })}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                backgroundColor: pressed ? c.input : 'transparent',
              })}
            >
              <Mail size={20} color={c.muted} />
              <Label style={{ flex: 1 }}>{'View source email' + (r.sources.length > 1 ? ' ' + (i + 1) : '')}</Label>
              <ChevronRight size={18} color={c.muted} />
            </Pressable>
          ))}
          <Button title="Dismiss as not a media request" quiet disabled={busy} onPress={() => act({ status: 'dismissed' })} />
        </View>
      </ScrollView>

      {/* Footer Action */}
      <View
        style={{
          paddingHorizontal: layout.gutter,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: c.line,
          backgroundColor: c.bg,
        }}
      >
        <View style={{ width: '100%', maxWidth: layout.contentWidth - layout.gutter * 2, alignSelf: 'center' }}>
          {r.status === 'needs_review' ? (
            <Button title="Confirm request" busy={busy} onPress={() => act({ status: 'confirmed' })} />
          ) : (
            <Button
              title={r.status === 'completed' ? 'Reopen request' : 'Mark request completed'}
              busy={busy}
              onPress={() => act({ status: r.status === 'completed' ? 'in_progress' : 'completed' })}
            />
          )}
        </View>
      </View>
    </View>
  );
}
