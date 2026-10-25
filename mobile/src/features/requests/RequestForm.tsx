import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, TextInput, useWindowDimensions, AccessibilityInfo, findNodeHandle, AppState } from 'react-native';
import { MediaRequest, Requirement, Member } from '../../api/types';
import { Label, Field, Button, ErrorNote, AnimatedPressable, ActionDialog, DialogAction } from '../../components/ui';
import { useTheme, radius, spacing } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreventRemove } from 'expo-router';
import { ApiError } from '../../api/client';
import { draftEpoch, draftKey, parseDraft, writeDraft, FormDraft, SavedDraft } from './drafts';
import { DateField } from '../../components/DateField';
import { localParts, parseLocalDate } from './form';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../../auth/context';

type FormProps = {
  initial?: MediaRequest; timezone: string; onSave: (data: any) => Promise<void>;
  onCancel?: () => void; initialDate?: string; onInvalid?: (pageY: number) => void; onReload?: () => Promise<void>;
};
export function RequestForm(props: FormProps) {
  const { me } = useAuth();
  const key = me ? draftKey(me.workspace_id, me.id, props.initial?.id || 'new') : '';
  return <DraftForm key={key} {...props} storageKey={key} />;
}
function DraftForm({ storageKey, ...props }: FormProps & { storageKey: string }) {
  const [loaded, setLoaded] = useState(!storageKey);
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [choice, setChoice] = useState<'resume' | 'fresh' | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [epoch] = useState(draftEpoch);
  const { colors: c } = useTheme();
  useEffect(() => {
    let active = true;
    if (storageKey) AsyncStorage.getItem(storageKey).then(raw => { if (active) { setSaved(parseDraft(raw)); setLoaded(true); } }).catch(() => { if (active) { setLoadError(true); setLoaded(true); } });
    return () => { active = false; };
  }, [storageKey]);
  if (!loaded) return <Label accessibilityLiveRegion="polite">Checking for a saved draft…</Label>;
  if (saved && !choice) return <View style={{ gap: 16, paddingVertical: 24 }}>
    <Label size={24} bold>Continue your draft?</Label>
    <Label size={15} muted>{saved.fields.title || 'Untitled request'} · Saved on this device. Resuming keeps the request version you originally edited.</Label>
    <Button title="Resume draft" onPress={() => setChoice('resume')} />
    <Button title="Discard draft" quiet onPress={() => { writeDraft(storageKey, null, epoch).then(() => setChoice('fresh')).catch(() => setLoadError(true)); }} />
    {loadError && <Label style={{ color: c.red }}>Could not remove the draft. Try again.</Label>}
  </View>;
  return <RequestEditor {...props} initial={choice === 'resume' ? saved?.initial : props.initial} restored={choice === 'resume' ? saved?.fields : undefined} storageKey={storageKey} ownerEpoch={epoch} draftWarning={loadError} />;
}
function RequestEditor({ initial: initialInput, timezone, onSave, onCancel, initialDate, onInvalid, onReload, restored, storageKey, ownerEpoch, draftWarning }: FormProps & { restored?: FormDraft; storageKey: string; ownerEpoch: number; draftWarning: boolean }) {
  // Keep edits bound to the version the staff member actually saw, even when a
  // background refresh receives a newer email or another staff member's edit.
  const [initial] = useState(initialInput);
  const { colors: c } = useTheme();
  const { me } = useAuth();
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api.get<{ items: Member[] }>('/workspace/members'), enabled: !!me });
  type Draft = Omit<Requirement, 'quantity'> & { quantityText: string };
  const originalEquipment: Draft[] = (initial?.requirements || []).map(item => ({ ...item, quantityText: item.quantity == null ? '' : String(item.quantity) }));
  const [equipment, setEquipment] = useState<Draft[]>(restored?.equipment || originalEquipment);
  const [contact, setContact] = useState(restored?.contact ?? (initial?.contact || ''));
  const [assigning, setAssigning] = useState<string | null>(null);
  const sequence = useRef(0);
  function updateEquipment(id: string, changes: Partial<Draft>) {
    setEquipment(items => items.map(item => item.id === id ? { ...item, ...changes } : item));
  }
  const start = localParts(initial?.event_start || null, timezone);
  const setup = localParts(initial?.setup_deadline || null, timezone);

  const [title, setTitle] = useState(restored?.title ?? (initial?.title || ''));
  const [organizer, setOrganizer] = useState(restored?.organizer ?? (initial?.organizer || ''));
  const [venue, setVenue] = useState(restored?.venue ?? (initial?.venue || ''));
  const [date, setDate] = useState(restored?.date ?? (start.date || initialDate || ''));
  const [time, setTime] = useState(restored?.time ?? (start.time));
  const [setupDate, setSetupDate] = useState(restored?.setupDate ?? (setup.date));
  const [setupTime, setSetupTime] = useState(restored?.setupTime ?? (setup.time));
  const [summary, setSummary] = useState(restored?.summary ?? (initial?.summary || ''));
  const [priority, setPriority] = useState(restored?.priority ?? (initial?.priority || 'medium'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const titleRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const fields = useRef<Record<string, React.ComponentRef<typeof View> | null>>({});
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  function invalid(key: string, message: string): never {
    setFieldErrors({ [key]: message });
    const node = fields.current[key];
    node?.measure((_x, _y, _w, _h, _pageX, pageY) => onInvalid?.(pageY));
    if (key === 'title') titleRef.current?.focus();
    const handle = node && findNodeHandle(node);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    AccessibilityInfo.announceForAccessibility(message);
    throw new Error(message);
  }

  const isDirty =
    contact !== (initial?.contact || '') ||
    JSON.stringify(equipment) !== JSON.stringify(originalEquipment) ||
    title !== (initial?.title || '') ||
    organizer !== (initial?.organizer || '') ||
    venue !== (initial?.venue || '') ||
    date !== (start.date || initialDate || '') ||
    time !== start.time ||
    setupDate !== setup.date ||
    setupTime !== setup.time ||
    summary !== (initial?.summary || '') ||
    priority !== (initial?.priority || 'medium');

  const [draftStatus, setDraftStatus] = useState('');
  const [leaving, setLeaving] = useState(false);
  const skipDraft = useRef(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const draft: SavedDraft = { version: 1, savedAt: Date.now(), initial, fields: { title, organizer, venue, contact, date, time, setupDate, setupTime, summary, priority, equipment } };
  const latest = useRef(draft);
  latest.current = draft;
  const latestDirty = useRef(isDirty);
  latestDirty.current = isDirty;
  useEffect(() => {
    if (!storageKey || skipDraft.current) return;
    if (!isDirty) { writeDraft(storageKey, null, ownerEpoch).catch(() => {}); setDraftStatus(''); return; }
    let active = true;
    setDraftStatus('Saving draft…');
    const timer = setTimeout(() => {
      if (skipDraft.current) return;
      writeDraft(storageKey, latest.current, ownerEpoch).then(() => { if (active) setDraftStatus('Draft saved on this device'); }).catch(() => { if (active) setDraftStatus('Draft could not be saved. Keep this screen open and try again.'); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [title, organizer, venue, contact, date, time, setupDate, setupTime, summary, priority, equipment, storageKey, isDirty, ownerEpoch]);
  useEffect(() => () => {
    if (storageKey && latestDirty.current && !skipDraft.current) writeDraft(storageKey, latest.current, ownerEpoch).catch(() => {});
  }, [storageKey, ownerEpoch]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && storageKey && latestDirty.current && !skipDraft.current) writeDraft(storageKey, latest.current, ownerEpoch).catch(() => {});
    });
    return () => subscription.remove();
  }, [storageKey, ownerEpoch]);
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: DialogAction[] } | null>(null);
  async function leave(discard: boolean, next: () => void | Promise<void>) {
    setDialog(null);
    try {
      skipDraft.current = discard;
      if (storageKey) await writeDraft(storageKey, discard ? null : latest.current, ownerEpoch);
      setLeaving(true);
      disablePrevention();
      await next();
    } catch {
      skipDraft.current = false; setLeaving(false);
      setError(new Error('Could not finish this action. Your changes are still here; try again.'));
    }
  }
  function confirmLeave(next: () => void) {
    setDialog({ title: 'Leave this request?', message: 'Save a draft on this device to continue later, or discard your changes.', actions: [
      { title: 'Save draft and leave', onPress: () => leave(false, next) },
      { title: 'Discard changes', danger: true, onPress: () => leave(true, next) },
    ] });
  }
  const disablePrevention = usePreventRemove(!!me && isDirty && !busy && !leaving && !savedSuccessfully, ({ repeat }) => confirmLeave(repeat));
  function handleCancel() {
    if (!onCancel) return;
    if (isDirty) confirmLeave(onCancel); else onCancel();
  }

  async function save() {
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      if (!title.trim()) {
        invalid('title', 'Enter an event or request title.');
      }
      let eventStart: string | null = null;
      let setupDeadline: string | null = null;
      try { eventStart = parseLocalDate(date, time, timezone); } catch { invalid(date ? 'time' : 'date', 'Choose both an event date and start time, or clear both.'); }
      try { setupDeadline = parseLocalDate(setupDate, setupTime, timezone); } catch { invalid(setupDate ? 'setupTime' : 'setupDate', 'Choose both a setup date and time, or clear both.'); }
      if (eventStart && setupDeadline && Date.parse(setupDeadline) > Date.parse(eventStart)) invalid('setupTime', 'Setup must be at or before the event start.');
      const requirements = equipment.map(item => {
        if (!item.title.trim()) invalid(item.id + '-title', 'Enter a name for this equipment item.');
        const quantity = item.quantityText.trim() ? Number(item.quantityText) : null;
        if (quantity !== null && (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000)) invalid(item.id + '-quantity', 'Equipment quantities must be whole numbers between 1 and 100000.');
        const { quantityText, ...rest } = item;
        const previous = initial?.requirements.find(old => old.id === item.id);
        const changed = !!previous && (previous.title !== item.title.trim() || previous.quantity !== quantity || previous.department !== item.department || previous.notes !== item.notes);
        return { ...rest, title: item.title.trim(), quantity, status: changed ? 'pending' : item.status };
      });
      await onSave({
        expected_version: initial?.version,
        title: title.trim(),
        organizer,
        contact,
        requirements,
        venue,
        summary,
        timezone,
        priority,
        event_start: eventStart,
        setup_deadline: setupDeadline,
      });
      skipDraft.current = true;
      setSavedSuccessfully(true);
      if (storageKey) await writeDraft(storageKey, null, ownerEpoch).catch(() => {});
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Label size={20} bold accessibilityRole="header">Event details</Label>
      {draftWarning && <Label size={13} style={{ color: c.amber }}>Saved drafts could not be checked. Keep this screen open until you save.</Label>}
      <View ref={node => { fields.current.title = node; }}><Field
        ref={titleRef}
        error={fieldErrors.title}
        label="Event or request title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Morning Assembly, Convocation, Workshop"
      /></View>
      <Field
        label="Organizer / department"
        value={organizer}
        onChangeText={setOrganizer}
        placeholder="e.g. Department of AI, Registrar"
      />
      <Field
        label="Venue"
        value={venue}
        onChangeText={setVenue}
        placeholder="e.g. Main Auditorium, Elohim Hall"
      />

<Field label="Contact person / phone" value={contact} onChangeText={setContact} placeholder="Who should the team contact?" />

      <Label size={20} bold accessibilityRole="header" style={{ marginTop: 12 }}>Schedule</Label>
      <Label size={13} muted>
        Times are in {timezone}. Leave unknown dates blank for staff review.
      </Label>

      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 12 }}>
        <View ref={node => { fields.current.date = node; }} style={{ flex: 1 }}><DateField label="Event date" value={date} mode="date" onChange={setDate} timezone={timezone} error={fieldErrors.date} /></View>
        <View ref={node => { fields.current.time = node; }} style={{ flex: 1 }}><DateField label="Starts at" value={time} mode="time" onChange={setTime} timezone={timezone} error={fieldErrors.time} /></View>
      </View>
      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 12 }}>
        <View ref={node => { fields.current.setupDate = node; }} style={{ flex: 1 }}><DateField label="Setup date" value={setupDate} mode="date" onChange={setSetupDate} timezone={timezone} error={fieldErrors.setupDate} /></View>
        <View ref={node => { fields.current.setupTime = node; }} style={{ flex: 1 }}><DateField label="Setup by" value={setupTime} mode="time" onChange={setSetupTime} timezone={timezone} error={fieldErrors.setupTime} /></View>
      </View>

      <View style={{ gap: 8 }}>
        <Label bold size={14}>
          Priority
        </Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['low', 'medium', 'high'] as const).map((p) => {
            const isSelected = priority === p;
            return (
              <AnimatedPressable
                key={p}
                accessibilityRole="radio"
                accessibilityLabel={p[0].toUpperCase() + p.slice(1)}
                aria-checked={isSelected}
                accessibilityState={{ checked: isSelected }}
                onPress={() => setPriority(p)}
                activeScale={0.97}
                style={{
                  flex: 1,
                  minHeight: 48,
                  paddingVertical: 12,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? c.blueSoft : c.surfaceSubtle,
                  borderWidth: 1.5,
                  borderColor: isSelected ? c.blue : c.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label
                  bold={isSelected}
                  size={14}
                  style={{
                    color: isSelected ? c.blue : c.ink,
                  }}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </Label>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 16, marginTop: 12 }}>
        <Label size={20} bold accessibilityRole="header">Equipment & assignments</Label>
        <Label size={13} muted>List the equipment, quantities and any setup notes.</Label>
        {equipment.map((item, index) => <View key={item.id} style={{ gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 10 }}>
            <View ref={node => { fields.current[item.id + '-title'] = node; }} style={{ flex: 1 }}><Field error={fieldErrors[item.id + '-title']} label={`Equipment ${index + 1}`} value={item.title} onChangeText={value => updateEquipment(item.id, { title: value })} placeholder="Wireless microphone" /></View>
            <View ref={node => { fields.current[item.id + '-quantity'] = node; }} style={{ width: stacked ? '100%' : 100 }}><Field error={fieldErrors[item.id + '-quantity']} label="Quantity" accessibilityLabel={`Equipment ${index + 1} quantity`} value={item.quantityText} onChangeText={value => updateEquipment(item.id, { quantityText: value })} keyboardType="number-pad" placeholder="?" /></View>
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel={`Equipment ${index + 1} department`} style={{ flexDirection: 'row', gap: 6 }}>
            {(['audio','video','other'] as const).map(department => <Pressable key={department} accessibilityRole="radio" accessibilityLabel={`Equipment ${index + 1}: ${department}`} aria-checked={item.department === department} accessibilityState={{ checked: item.department === department }} onPress={() => updateEquipment(item.id, { department })} style={{ flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: item.department === department ? c.blueSoft : c.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}><Label size={13} style={{ color: item.department === department ? c.blue : c.muted }}>{department[0].toUpperCase() + department.slice(1)}</Label></Pressable>)}
          </View>
          <Field label={`Equipment ${index + 1} notes`} value={item.notes} onChangeText={value => updateEquipment(item.id, { notes: value })} placeholder="Location, cable or setup notes" />
          <Button title={staff.data?.items.find(member => member.id === item.assignee_id)?.name || (item.assignee_id ? 'Assigned team member' : 'Assign staff')} quiet onPress={() => setAssigning(assigning === item.id ? null : item.id)} />
          {assigning === item.id && <View style={{ gap: 4 }}>
            {[{ id: '', name: 'Unassigned' }, ...(staff.data?.items || [])].map(member => <Pressable key={member.id} accessibilityRole="radio" accessibilityLabel={`Assign equipment ${index + 1} to ${member.name}`} aria-checked={(item.assignee_id || '') === member.id} onPress={() => { updateEquipment(item.id, { assignee_id: member.id || null }); setAssigning(null); }} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }}><Label size={14} style={{ color: (item.assignee_id || '') === member.id ? c.blue : c.ink }}>{member.name}</Label></Pressable>)}
            <ErrorNote error={staff.error} />
          </View>}
          <Button title={`Remove equipment ${index + 1}`} quiet danger onPress={() => setEquipment(items => items.filter(other => other.id !== item.id))} />
        </View>)}
        <Button title="Add equipment" quiet disabled={equipment.length >= 100} onPress={() => { sequence.current += 1; setEquipment(items => [...items, { id: `draft-${Date.now()}-${sequence.current}`, title: '', quantityText: '1', department: 'audio', notes: '', assignee_id: null, status: 'pending', version: 1 }]); }} />
      </View>

      <Field
        label="Notes / summary"
        multiline
        value={summary}
        onChangeText={setSummary}
        placeholder="Equipment notes, mic counts, camera coverage details"
      />

      {!!draftStatus && <Label size={13} muted accessibilityLiveRegion="polite">{draftStatus}</Label>}
      <ErrorNote error={Object.keys(fieldErrors).length ? null : error} />

      {error instanceof ApiError && error.status === 409 && onReload && <Button title="Reload latest request" quiet onPress={() => setDialog({ title: 'Reload request?', message: 'Your unsaved changes and saved draft will be discarded so you can review the latest version.', actions: [{ title: 'Discard draft and reload', danger: true, onPress: () => leave(true, onReload) }] })} />}
      {dialog && <ActionDialog {...dialog} onCancel={() => setDialog(null)} />}
      <View style={{ gap: 10, marginTop: 4 }}>
        <Button
          title={initial ? 'Save changes' : 'Create request'}
          busy={busy}
          onPress={save}
        />
        {onCancel && (
          <Button
            title="Cancel"
            quiet
            onPress={handleCancel}
          />
        )}
      </View>
    </View>
  );
}
