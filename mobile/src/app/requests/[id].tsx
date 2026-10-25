import React, { useState, useRef } from 'react';
import {
  ScrollView,
  View,
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
  CalendarDays,
  AlertTriangle,
  User,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api, queryClient, useAuth } from '../../auth/context';
import { MediaRequest, Member } from '../../api/types';
import { layout, radius, useTheme } from '../../theme';
import { Label, Button, ErrorNote, AnimatedPressable } from '../../components/ui';
import { useCachedQuery } from '../../features/requests/useCachedQuery';
import { dateLabel, clock, statusLabel } from '../../features/requests/presentation';
import { RequestForm } from '../../features/requests/RequestForm';
import { ProposalChanges } from '../../features/requests/ProposalChanges';
import { EquipmentList } from '../../features/requests/EquipmentList';

export default function Detail() {
  const insets = useSafeAreaInsets();
  const editScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const editOffset = useRef(0);
  const { me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: c } = useTheme();
  const query = useCachedQuery<MediaRequest>('request:' + id, () => api.get('/requests/' + id));

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const r = query.data;
  const assigned = useQuery({ queryKey: ['staff'], queryFn: () => api.get<{ items: Member[] }>('/workspace/members'), enabled: !!r?.requirements.some(item => item.assignee_id) });

  async function patch(data: any) {
    if (!r) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.patch<MediaRequest>('/requests/' + id, {
        expected_version: r.version,
        ...data,
      });
      queryClient.setQueryData([me?.workspace_id, 'request:' + id], result);
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
          ref={editScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          onScroll={event => { editOffset.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
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
            onReload={async () => { await query.refetch({ throwOnError: true }); setError(null); setEditing(false); }}
            onInvalid={pageY => editScroll.current?.scrollTo({ y: Math.max(0, editOffset.current + pageY - 140), animated: false })}
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
            <Label size={14} style={{ color: tone }}>{statusLabel(r.status)}</Label>
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
                minHeight: 48,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: 'transparent',
              }}
            >
              <Pencil size={15} color={c.blue} />
              <Label bold size={13} style={{ color: c.blue }}>
                Edit
              </Label>
            </AnimatedPressable>
          </View>

          <Label size={34} bold style={{ lineHeight: 42, letterSpacing: -0.8, color: c.ink }}>
            {r.title}
          </Label>

          {/* Organizer Card */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
            }}
          >
            <User size={19} color={c.muted} />
            <View style={{ flex: 1 }}>
              <Label size={16}>
                {r.organizer || 'Organizer to confirm'}
              </Label>
            </View>
          </View>

          {/* Venue & Timing Card */}
          <View
            style={{
              paddingVertical: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <MapPin size={18} color={c.muted} />
              <Label size={16} style={{ flex: 1 }}>
                {r.venue || 'Venue to confirm'}
              </Label>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CalendarDays size={18} color={c.muted} />
              <Label size={16} style={{ flex: 1 }}>
                {dateLabel(r.event_start, r.timezone)}
                {r.event_start ? ' · ' + clock(r.event_start, r.timezone) : ''}
              </Label>
            </View>
          </View>

          {/* Setup Deadline Banner */}
          <View
            style={{
              backgroundColor: 'transparent',
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.line,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',

            }}
          >
            <Clock3 color={overdue ? c.red : c.amber} size={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label size={12} bold style={{ color: overdue ? c.red : c.amber }}>
                {overdue ? 'Setup overdue' : 'Setup deadline'}
              </Label>
              <Label bold size={16} style={{ color: overdue ? c.red : c.amber }}>
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
                paddingVertical: 14,
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


          {r.status === 'needs_review' && (
            <View
              style={{
                backgroundColor: c.amberSoft,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: c.amber,
                padding: 16,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color={c.amber} />
                <Label bold size={15} style={{ color: c.amber, flex: 1 }}>
                  Review & Confirmation Required
                </Label>
              </View>
              <Label size={13} style={{ color: c.ink, lineHeight: 18 }}>
                This request was extracted from an email matching the Karunya Media Desk template. Please verify the event logistics and equipment quantities before confirming.
              </Label>
              {r.review_reasons.map((reason) => (
                <View key={reason} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.amber }} />
                  <Label size={13} bold style={{ color: c.amber, flex: 1 }}>
                    {reason}
                  </Label>
                </View>
              ))}
            </View>
          )}

          {r.status !== 'needs_review' && r.review_reasons.map((reason) => (
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
            <ProposalChanges request={r} changes={p.changes} />
            {p.review_reasons?.map(reason => <Label key={reason} size={13} style={{ color: c.amber }}>{reason}</Label>)}
            {p.source_id && <Button title="Read update email" quiet onPress={() => router.push({ pathname: '/source', params: { id: p.source_id } })} />}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Accept update"
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);setError(null);
                    try {
                      await api.post(`/requests/${id}/proposals/${p.id}/accept`, {
                        expected_version: r.version,
                      });
                      await query.refetch();
                      await queryClient.invalidateQueries();
                    } catch (e) {
                      setError(e);
                    } finally { setBusy(false); }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Dismiss"
                  disabled={busy}
                  quiet
                  onPress={async () => {
                    setBusy(true);setError(null);
                    try {
                      await api.post(`/requests/${id}/proposals/${p.id}/dismiss`, {
                        expected_version: r.version,
                      });
                      await query.refetch();
                      await queryClient.invalidateQueries();
                    } catch (e) {
                      setError(e);
                    } finally { setBusy(false); }
                  }}
                />
              </View>
            </View>
          </View>
        ))}

        <EquipmentList requirements={r.requirements} />

        {r.requirements.some(item => item.assignee_id) && <View style={{ marginTop: 28, gap: 14 }}>
          <Label size={21} bold accessibilityRole="header">Assigned staff</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {Array.from(new Set(r.requirements.map(item => item.assignee_id).filter(Boolean))).map(memberId => {
              const name = assigned.data?.items.find(member => member.id === memberId)?.name || 'Team member';
              return <View key={memberId!} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Label size={12} style={{ color: c.blue }}>{name.split(' ').slice(0, 2).map(part => part[0]).join('')}</Label></View>
                <Label size={14}>{name}</Label>
              </View>;
            })}
          </View>
        </View>}

        {/* Source Emails & Actions */}
        <View style={{ gap: 12, marginTop: 28 }}>
          <Label bold size={21} accessibilityRole="header">Source emails</Label>
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
                paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line,
              }}
            >
              <Mail size={18} color={c.blue} />
              <Label style={{ flex: 1, fontSize: 15 }}>
                {'View source email' + (r.sources.length > 1 ? ' #' + (i + 1) : '')}
              </Label>
              <ChevronRight size={18} color={c.muted} />
            </AnimatedPressable>
          ))}

          {!done && <Button title="Cancel event" quiet danger disabled={busy} onPress={() => Alert.alert('Cancel event?', 'Future reminders will be cancelled. The request and source emails will stay available.', [{ text: 'Keep event', style: 'cancel' }, { text: 'Cancel event', style: 'destructive', onPress: () => act({ status: 'cancelled' }) }])} />}
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
          backgroundColor: c.bg,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: layout.contentWidth - layout.gutter * 2,
            alignSelf: 'center',
          }}
        >
          <ErrorNote error={error} />
          {!!r.proposed_updates.length && <Label muted size={13} style={{ marginBottom: 8 }}>Accept or dismiss pending email updates before continuing.</Label>}
          {['needs_review', 'new'].includes(r.status) ? (
            <Button
              title="Confirm request"
              disabled={!!r.proposed_updates.length}
              busy={busy}
              onPress={() => act({ status: 'confirmed' })}
            />
          ) : (
            <Button
              title={
                done
                  ? 'Reopen request'
                  : 'Mark request completed'
              }
              disabled={!!r.proposed_updates.length}
              busy={busy}
              onPress={() =>
                act({
                  status: done ? 'in_progress' : 'completed',
                })
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}
