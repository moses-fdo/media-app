import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { MediaRequest } from '../../api/types';
import { Label, Field, Button, ErrorNote, AnimatedPressable } from '../../components/ui';
import { useTheme, radius, spacing } from '../../theme';
import { localParts, parseLocalDate } from './form';

export function RequestForm({
  initial,
  timezone,
  onSave,
  onCancel,
}: {
  initial?: MediaRequest;
  timezone: string;
  onSave: (data: any) => Promise<void>;
  onCancel?: () => void;
}) {
  const { colors: c } = useTheme();
  const start = localParts(initial?.event_start || null, timezone);
  const setup = localParts(initial?.setup_deadline || null, timezone);

  const [title, setTitle] = useState(initial?.title || '');
  const [organizer, setOrganizer] = useState(initial?.organizer || '');
  const [venue, setVenue] = useState(initial?.venue || '');
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [setupDate, setSetupDate] = useState(setup.date);
  const [setupTime, setSetupTime] = useState(setup.time);
  const [summary, setSummary] = useState(initial?.summary || '');
  const [priority, setPriority] = useState(initial?.priority || 'medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const isDirty =
    title !== (initial?.title || '') ||
    organizer !== (initial?.organizer || '') ||
    venue !== (initial?.venue || '') ||
    date !== start.date ||
    time !== start.time ||
    setupDate !== setup.date ||
    setupTime !== setup.time ||
    summary !== (initial?.summary || '') ||
    priority !== (initial?.priority || 'medium');

  function handleCancel() {
    if (!onCancel) return;
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes in this request that will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard changes', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      if (!title.trim()) {
        throw new Error('Enter an event or request title.');
      }
      await onSave({
        title: title.trim(),
        organizer,
        venue,
        summary,
        timezone,
        priority,
        event_start: parseLocalDate(date, time, timezone),
        setup_deadline: parseLocalDate(setupDate, setupTime, timezone),
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Field
        label="Event or request title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Morning Assembly, Convocation, Workshop"
      />
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

      <Label size={13} muted>
        Times are in {timezone}. Leave unknown dates blank for staff review.
      </Label>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Event date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ width: 110 }}>
          <Field
            label="Starts at"
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Setup date"
            value={setupDate}
            onChangeText={setSetupDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ width: 110 }}>
          <Field
            label="Setup by"
            value={setupTime}
            onChangeText={setSetupTime}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
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
                accessibilityState={{ checked: isSelected }}
                onPress={() => setPriority(p)}
                activeScale={0.97}
                style={{
                  flex: 1,
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

      <Field
        label="Notes / summary"
        multiline
        value={summary}
        onChangeText={setSummary}
        placeholder="Equipment notes, mic counts, camera coverage details"
      />

      <ErrorNote error={error} />

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
