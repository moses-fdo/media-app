import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Mail,
  MapPin,
  Clock3,
  Pencil,
  Headphones,
  Video,
  Layers,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  User,
} from 'lucide-react-native';
import { api, queryClient } from '../../auth/context';
import { MediaRequest } from '../../api/types';
import { layout, radius, spacing, useTheme } from '../../theme';
import { Label, Button, ErrorNote, AnimatedPressable, StatusBadge } from '../../components/ui';
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

  function handleDismiss() {
    Alert.alert(
      'Dismiss Request?',
      'Are you sure this is not a valid media request? It will be archived and removed from the active queue.',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Dismiss as Not Media',
          style: 'destructive',
          onPress: () => act({ status: 'dismissed' }),
        },
      ]
    );
  }

  if (!r) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: c.bg,
          padding: 22,
        }}
      >
        {query.isLoading ? (
          <ActivityIndicator size="large" color={c.blue} />
        ) : (
          <ErrorNote error={query.error} />
        )}
      </View>
    );
  }

  if (editing) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: layout.gutter,
            paddingTop: 20,
            paddingBottom: 60,
            width: '100%',
            maxWidth: layout.contentWidth,
            alignSelf: 'center',
          }}
        >
          <View style={{ marginBottom: 18 }}>
            <Label size={26} bold>
              Edit Request
            </Label>
            <Label muted size={14}>
              Update logistics, schedule, or equipment requirements.
            </Label>
          </View>
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

  const done = ['completed', 'cancelled', 'dismissed'].includes(r.status);
  const overdue =
    !done &&
    !!r.setup_deadline &&
    new Date(r.setup_deadline).getTime() < Date.now();

  const tone =
    r.status === 'completed'
      ? c.green
      : r.status === 'needs_review'
      ? c.amber
      : c.blue;

  const toneBg =
    r.status === 'completed'
      ? c.greenSoft
      : r.status === 'needs_review'
      ? c.amberSoft
      : c.blueSoft;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 14,
          paddingBottom: 36,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
      >
        {/* Header & Status */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <StatusBadge
              label={statusLabel(r.status)}
              tone={tone}
              bgTone={toneBg}
            />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Edit request"
              onPress={() => setEditing(true)}
              activeScale={0.92}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: c.surfaceSubtle,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Pencil size={15} color={c.blue} />
              <Label bold size={13} style={{ color: c.blue }}>
                Edit
              </Label>
            </AnimatedPressable>
          </View>

          <Label size={30} bold style={{ lineHeight: 36, letterSpacing: -0.9, color: c.ink }}>
            {r.title}
          </Label>

          {/* Organizer Card */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: c.surface,
              padding: 12,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <User size={18} color={c.blue} />
            <View style={{ flex: 1 }}>
              <Label size={12} muted>
                Requested by
              </Label>
              <Label bold size={15}>
                {r.organizer || 'Organizer to confirm'}
              </Label>
            </View>
          </View>

          {/* Venue & Timing Card */}
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.line,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <MapPin size={18} color={c.muted} />
              <Label size={15} bold style={{ flex: 1 }}>
                {r.venue || 'Venue to confirm'}
              </Label>
            </View>

            <View style={{ height: 1, backgroundColor: c.line }} />

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CalendarDays size={18} color={c.muted} />
              <Label size={14} muted style={{ flex: 1 }}>
                {dateLabel(r.event_start, r.timezone)}
                {r.event_start ? ' · ' + clock(r.event_start, r.timezone) : ''}
              </Label>
            </View>
          </View>

          {/* Setup Deadline Banner */}
          <View
            style={{
              backgroundColor: overdue ? c.redSoft : c.blueSoft,
              padding: 16,
              borderRadius: radius.lg,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: overdue ? c.red : c.blue,
            }}
          >
            <Clock3 color={overdue ? c.red : c.blue} size={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12} bold style={{ color: overdue ? c.red : c.blue }}>
                {overdue ? 'SETUP OVERDUE' : 'SETUP DEADLINE'}
              </Label>
              <Label bold size={16} style={{ color: overdue ? c.red : c.ink }}>
                {r.setup_deadline
                  ? dateLabel(r.setup_deadline, r.timezone) +
                    ' · ' +
                    clock(r.setup_deadline, r.timezone)
                  : 'Needs confirmation'}
              </Label>
            </View>
          </View>

          {r.summary ? (
            <View
              style={{
                backgroundColor: c.surface,
                padding: 14,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Label size={12} muted style={{ marginBottom: 4 }}>
                Event Summary
              </Label>
              <Label style={{ lineHeight: 22 }}>{r.summary}</Label>
            </View>
          ) : null}

          {query.offline && (
            <Label style={{ color: c.amber }}>
              Offline · Changes will require an active internet connection
            </Label>
          )}
          <ErrorNote error={error} />

          {r.review_reasons.map((reason) => (
            <View
              key={reason}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 13,
                backgroundColor: c.amberSoft,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.amber,
              }}
            >
              <AlertTriangle size={18} color={c.amber} />
              <Label size={14} bold style={{ color: c.amber, flex: 1 }}>
                {reason}
              </Label>
            </View>
          ))}
        </View>

        {/* Proposed Updates from new emails */}
        {r.proposed_updates.map((p) => (
          <View
            key={p.id}
            style={{
              marginTop: 22,
              padding: 16,
              backgroundColor: c.amberSoft,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: c.amber,
              gap: 12,
            }}
          >
            <Label bold size={16} style={{ color: c.amber }}>
              New updates received from email
            </Label>
            {Object.entries(p.changes)
              .filter(([k]) =>
                ['title', 'venue', 'event_start', 'setup_deadline', 'summary'].includes(k)
              )
              .map(([k, v]) => (
                <View key={k}>
                  <Label size={12} muted>
                    {k.replaceAll('_', ' ')}
                  </Label>
                  <Label bold>
                    {String((r as any)[k] || 'Unspecified')} → {String(v || 'Unspecified')}
                  </Label>
                </View>
              ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Accept update"
                  disabled={busy}
                  onPress={async () => {
                    try {
                      await api.post(`/requests/${id}/proposals/${p.id}/accept`, {
                        expected_version: r.version,
                      });
                      await query.refetch();
                      await queryClient.invalidateQueries();
                    } catch (e) {
                      setError(e);
                    }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Dismiss"
                  quiet
                  onPress={async () => {
                    try {
                      await api.post(`/requests/${id}/proposals/${p.id}/dismiss`, {
                        expected_version: r.version,
                      });
                      await query.refetch();
                      await queryClient.invalidateQueries();
                    } catch (e) {
                      setError(e);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Clean Equipment List Section */}
        <View style={{ marginTop: 28, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label bold size={20}>
              Equipment Checklist
            </Label>
            <Label size={13} muted>
              {r.requirements.length} {r.requirements.length === 1 ? 'item' : 'items'}
            </Label>
          </View>

          {['audio', 'video', 'other'].map((dept) => {
            const items = r.requirements.filter((x) => x.department === dept);
            if (!items.length) return null;
            return (
              <View
                key={dept}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 16,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: c.line,
                  }}
                >
                  {dept === 'audio' ? (
                    <Headphones size={20} color={c.blue} />
                  ) : dept === 'video' ? (
                    <Video size={20} color={c.blue} />
                  ) : (
                    <Layers size={20} color={c.blue} />
                  )}
                  <Label bold size={16} style={{ color: c.ink }}>
                    {dept === 'audio'
                      ? 'Audio Gear'
                      : dept === 'video'
                      ? 'Video Gear'
                      : 'Other Equipment'}
                  </Label>
                </View>

                <View style={{ gap: 8 }}>
                  {items.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: c.blue,
                        }}
                      />
                      {item.quantity ? (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: radius.sm,
                            backgroundColor: c.blueSoft,
                          }}
                        >
                          <Label bold size={13} style={{ color: c.blue }}>
                            {item.quantity}×
                          </Label>
                        </View>
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
            <View
              style={{
                padding: 18,
                backgroundColor: c.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Label muted size={14}>
                No equipment items specified yet. Tap Edit to add items.
              </Label>
            </View>
          )}
        </View>

        {/* Source Emails & Actions */}
        <View style={{ gap: 12, marginTop: 28 }}>
          <Label bold size={18}>
            Source Context
          </Label>
          {r.sources.map((s, i) => (
            <AnimatedPressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={
                'View source email' + (r.sources.length > 1 ? ' ' + (i + 1) : '')
              }
              onPress={() => router.push({ pathname: '/source', params: { id: s } })}
              activeScale={0.98}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: c.surface,
                paddingHorizontal: 16,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              <Mail size={18} color={c.blue} />
              <Label style={{ flex: 1, fontSize: 15 }}>
                {'View source email' + (r.sources.length > 1 ? ' #' + (i + 1) : '')}
              </Label>
              <ChevronRight size={18} color={c.muted} />
            </AnimatedPressable>
          ))}

          <Button
            title="Dismiss as not a media request"
            quiet
            disabled={busy}
            danger
            onPress={handleDismiss}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>

      {/* Fixed Footer Primary Action */}
      <View
        style={{
          paddingHorizontal: layout.gutter,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: c.line,
          backgroundColor: c.surface,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: layout.contentWidth - layout.gutter * 2,
            alignSelf: 'center',
          }}
        >
          {r.status === 'needs_review' ? (
            <Button
              title="Confirm request"
              busy={busy}
              onPress={() => act({ status: 'confirmed' })}
            />
          ) : (
            <Button
              title={
                r.status === 'completed'
                  ? 'Reopen request'
                  : 'Mark request completed'
              }
              busy={busy}
              onPress={() =>
                act({
                  status: r.status === 'completed' ? 'in_progress' : 'completed',
                })
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
