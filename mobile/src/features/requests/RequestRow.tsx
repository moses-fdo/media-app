import React from 'react';
import { View } from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  User,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { MediaRequest } from '../../api/types';
import { useTheme, radius, spacing } from '../../theme';
import { Label, AnimatedPressable, StatusBadge } from '../../components/ui';
import { clock, formatDeadline, statusLabel } from './presentation';

export function RequestRow({
  item,
  onPress,
}: {
  item: MediaRequest;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const done = ['completed', 'cancelled', 'dismissed'].includes(item.status);
  const overdue =
    !done &&
    !!item.setup_deadline &&
    new Date(item.setup_deadline).getTime() < Date.now();

  const tone =
    item.status === 'completed'
      ? c.green
      : item.status === 'needs_review'
      ? c.amber
      : c.blue;

  const toneBg =
    item.status === 'completed'
      ? c.greenSoft
      : item.status === 'needs_review'
      ? c.amberSoft
      : c.blueSoft;

  const deadline = overdue
    ? 'Setup overdue · ' + clock(item.setup_deadline!, item.timezone)
    : formatDeadline(item.setup_deadline, item.timezone);

  const reqSummary =
    item.requirements_summary || item.summary || 'Requirements to confirm';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${statusLabel(item.status)}, ${deadline}`}
      onPress={onPress}
      activeScale={0.98}
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.line,
        padding: spacing.lg,
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        {/* Leading Category / Status Tile */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.md,
            backgroundColor: toneBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          {item.status === 'completed' ? (
            <CheckCircle2 size={22} color={c.green} strokeWidth={2} />
          ) : item.status === 'needs_review' ? (
            <AlertTriangle size={21} color={c.amber} strokeWidth={2} />
          ) : (
            <CalendarDays size={21} color={c.blue} strokeWidth={2} />
          )}
        </View>

        {/* Core Content Block */}
        <View style={{ flex: 1, gap: 7 }}>
          {/* Title & Status Pill */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Label
              bold
              size={17}
              style={{
                flex: 1,
                lineHeight: 22,
                color: c.ink,
              }}
            >
              {item.title}
            </Label>
            <StatusBadge
              label={statusLabel(item.status)}
              tone={tone}
              bgTone={toneBg}
            />
          </View>

          {/* Organizer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <User size={14} color={c.muted} />
            <Label size={13} muted style={{ flex: 1 }}>
              {item.organizer || 'Organizer to confirm'}
            </Label>
          </View>

          {/* Requirements Summary Tag */}
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: c.surfaceSubtle,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Sliders size={13} color={c.blue} />
            <Label
              size={13}
              style={{
                color: c.ink,
                fontWeight: '500',
              }}
            >
              {reqSummary}
            </Label>
          </View>

          {/* Venue & Event Start */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginTop: 1,
            }}
          >
            <MapPin size={14} color={c.muted} />
            <Label size={13} muted style={{ flex: 1 }}>
              {item.venue || 'Venue to confirm'}
              {item.event_start ? ' · ' + clock(item.event_start, item.timezone) : ''}
            </Label>
          </View>

          {/* Deadline / Countdown Badge */}
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 3,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: radius.full,
              backgroundColor: overdue
                ? c.redSoft
                : done
                ? c.surfaceSubtle
                : c.amberSoft,
              borderWidth: 1,
              borderColor: overdue
                ? c.red
                : done
                ? c.line
                : c.amber,
            }}
          >
            <Clock3
              size={13}
              color={overdue ? c.red : done ? c.muted : c.amber}
            />
            <Label
              bold={overdue}
              size={12}
              style={{
                color: overdue ? c.red : done ? c.muted : c.amber,
              }}
            >
              {deadline}
            </Label>
          </View>
        </View>

        {/* Trailing Accessory */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: c.surfaceSubtle,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <ChevronRight size={16} color={c.muted} strokeWidth={2} />
        </View>
      </View>
    </AnimatedPressable>
  );
}
