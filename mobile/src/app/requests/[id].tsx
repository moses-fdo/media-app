import React, { useState, useRef } from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Mail,
  MapPin,
  Clock3,
  Pencil,
  AlertTriangle,
  ArrowLeft,
  Check,
  Landmark,
} from 'lucide-react-native';
import { api, queryClient, useAuth } from '../../auth/context';
import { MediaRequest } from '../../api/types';
import { layout, radius, useTheme } from '../../theme';
import { Label, Button, ErrorNote, AnimatedPressable } from '../../components/ui';
import { Brand } from '../../components/Brand';
import { useCachedQuery } from '../../features/requests/useCachedQuery';
import { dateLabel, clock } from '../../features/requests/presentation';
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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Top Header Bar matching Campus Modern mockup */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: layout.gutter,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Requests"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
        >
          <ArrowLeft size={24} color={c.ink} strokeWidth={2} />
        </Pressable>

        <Brand size={26} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit request"
          onPress={() => setEditing(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            minHeight: 44,
            paddingHorizontal: 8,
          }}
        >
          <Pencil size={16} color={c.blue} strokeWidth={2.2} />
          <Label bold size={15} style={{ color: c.blue }}>
            Edit
          </Label>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: 16,
          paddingBottom: 36,
          width: '100%',
          maxWidth: layout.contentWidth,
          alignSelf: 'center',
        }}
      >
        {/* Title */}
        <Label size={30} bold style={{ letterSpacing: -0.6, color: c.ink, lineHeight: 36 }}>
          {r.title}
        </Label>

        {/* Metadata List matching Campus Modern mockup */}
        <View style={{ gap: 10, marginTop: 14 }}>
          {/* Department / Organizer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Landmark size={18} color={c.ink} />
            <Label size={15} bold style={{ color: c.ink }}>
              {r.organizer || 'Academic Office'}
            </Label>
          </View>

          {/* Schedule */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Clock3 size={18} color={c.ink} />
            <Label size={15} style={{ color: c.ink }}>
              {dateLabel(r.event_start, r.timezone)}
              {r.event_start ? ' · ' + clock(r.event_start, r.timezone) : ''}
            </Label>
          </View>

          {/* Venue */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MapPin size={18} color={c.ink} />
            <Label size={15} style={{ color: c.ink }}>
              {r.venue || 'Main Auditorium'}
            </Label>
          </View>
        </View>

        {/* Setup Deadline Alert Banner matching Campus Modern mockup */}
        <View
          style={{
            backgroundColor: c.amberSoft,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 18,
          }}
        >
          <Clock3 size={20} color={c.amber} />
          <Label bold size={15} style={{ color: c.amberText, flex: 1 }}>
            {overdue
              ? 'Setup overdue: ' + clock(r.setup_deadline!, r.timezone)
              : r.setup_deadline
              ? 'Setup deadline: ' +
                (new Intl.DateTimeFormat('en-CA', { timeZone: r.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(r.setup_deadline)) ===
                new Intl.DateTimeFormat('en-CA', { timeZone: r.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
                  ? 'Today, ' + clock(r.setup_deadline, r.timezone)
                  : dateLabel(r.setup_deadline, r.timezone) + ', ' + clock(r.setup_deadline, r.timezone))
              : 'Setup deadline: Needs confirmation'}
          </Label>
        </View>

        {/* Divider Line */}
        <View style={{ height: 1, backgroundColor: c.line, marginTop: 22 }} />

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
              {(r.review_reasons || []).map((reason) => (
                <View key={reason} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.amber }} />
                  <Label size={13} bold style={{ color: c.amber, flex: 1 }}>
                    {reason}
                  </Label>
                </View>
              ))}
            </View>
          )}

          {r.status !== 'needs_review' && (r.review_reasons || []).map((reason) => (
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

        {/* Proposed Updates from new emails */}
        {(r.proposed_updates || []).map((p) => (
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

        <EquipmentList requirements={r.requirements || []} />

        {/* Source Emails & Actions */}
        <View style={{ gap: 12, marginTop: 24 }}>
          {(r.sources || []).length > 0 ? (
            (r.sources || []).map((s, i) => (
              <AnimatedPressable
                key={s}
                accessibilityRole="button"
                accessibilityLabel={
                  'View source email' + ((r.sources || []).length > 1 ? ' ' + (i + 1) : '')
                }
                onPress={() => router.push({ pathname: '/source', params: { id: s } })}
                activeScale={0.98}
                style={{
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.cardBorder,
                  backgroundColor: c.card,
                }}
              >
                <Mail size={18} color={c.ink} />
                <Label style={{ flex: 1, fontSize: 15, color: c.ink }}>
                  {'View source email' + ((r.sources || []).length > 1 ? ' #' + (i + 1) : '')}
                </Label>
                <ChevronRight size={18} color={c.muted} />
              </AnimatedPressable>
            ))
          ) : (
            <View
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.cardBorder,
                backgroundColor: c.card,
              }}
            >
              <Mail size={18} color={c.muted} />
              <Label muted style={{ flex: 1, fontSize: 15 }}>
                Manual entry (no source email)
              </Label>
            </View>
          )}

          {!done && (
            <Button
              title="Cancel event"
              quiet
              danger
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Cancel event?',
                  'Future reminders will be cancelled. The request and source emails will stay available.',
                  [
                    { text: 'Keep event', style: 'cancel' },
                    { text: 'Cancel event', style: 'destructive', onPress: () => act({ status: 'cancelled' }) },
                  ]
                )
              }
            />
          )}
          <Button
            title="Dismiss as not a media request"
            quiet
            disabled={busy}
            danger
            onPress={handleDismiss}
            style={{ marginTop: 4 }}
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
          {!!r.proposed_updates?.length && (
            <Label muted size={13} style={{ marginBottom: 8 }}>
              Accept or dismiss pending email updates before continuing.
            </Label>
          )}
          <Button
            title={
              ['needs_review', 'new'].includes(r.status)
                ? 'Confirm request'
                : done
                ? 'Reopen request'
                : 'Mark completed'
            }
            icon={!done && !['needs_review', 'new'].includes(r.status) ? <Check size={20} color={c.onAccent} strokeWidth={2.5} /> : undefined}
            disabled={!!r.proposed_updates?.length}
            busy={busy}
            onPress={() =>
              act({
                status: ['needs_review', 'new'].includes(r.status)
                  ? 'confirmed'
                  : done
                  ? 'in_progress'
                  : 'completed',
              })
            }
            style={{ minHeight: 52, borderRadius: 14 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
