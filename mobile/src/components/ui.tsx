import React, { useRef, useState, useEffect } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  TextInputProps,
  Animated,
  AccessibilityInfo,
  Modal,
  ScrollView,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { useTheme, radius, spacing } from '../theme';
import { AlertCircle, Inbox } from 'lucide-react-native';

export function Label({
  children,
  muted = false,
  size = 16,
  bold = false,
  style,
  ...props
}: any) {
  const { colors: c } = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.42),
          color: muted ? c.muted : c.ink,
          fontWeight: bold ? '700' : '400',
          letterSpacing: size >= 27 ? -0.7 : size <= 12 ? 0.2 : 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function AnimatedPressable({
  children,
  onPress,
  disabled = false,
  style,
  activeScale = 0.97,
  ...props
}: PressableProps & {
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  activeScale?: number;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => { if (reduced) { scale.stopAnimation(); scale.setValue(1); } }, [reduced, scale]);

  const handlePressIn = () => {
    if (disabled || reduced) return;
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    if (reduced) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {(state) => (
        <Animated.View
          style={[
            typeof style === 'function' ? style(state) : style,
            { transform: [{ scale }] },
          ]}
        >
          {typeof children === 'function' ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  quiet = false,
  busy = false,
  disabled = false,
  danger = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors: c } = useTheme();

  const bgColor = quiet
    ? c.surfaceSubtle
    : danger
    ? c.red
    : c.blue;

  const textColor = danger
    ? quiet
      ? c.red
      : c.onAccent
    : quiet
    ? c.ink
    : c.onAccent;

  const borderColor = quiet ? c.cardBorder : 'transparent';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-disabled={disabled || busy}
      aria-busy={busy}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      activeScale={0.98}
      style={[
        {
          minHeight: 48,
          borderRadius: radius.md,
          paddingHorizontal: spacing.xl,
          paddingVertical: 13,
          backgroundColor: bgColor,
          borderWidth: quiet ? 1 : 0,
          borderColor,
          opacity: disabled || busy ? 0.6 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: textColor,
              letterSpacing: 0.1,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

export const Field = React.forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps & { label: string; helper?: string; error?: string }>(function Field({
  label,
  helper,
  error,
  style,
  ...props
}, ref) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Label size={14} bold>
        {label}
      </Label>
      <TextInput
        ref={ref}
        aria-invalid={!!error}
        accessibilityHint={error || helper}
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
        style={[
          {
            minHeight: 48,
            backgroundColor: c.surface,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: c.ink,
            borderWidth: 1,
            borderColor: error ? c.red : focused ? c.blue : c.inputBorder,
          },
          props.multiline && {
            minHeight: 96,
            textAlignVertical: 'top',
          },
          style,
        ]}
      />
      {!!error && <Label size={13} style={{ color: c.red }} accessibilityLiveRegion="polite">{error}</Label>}
      {helper && !error && (
        <Label size={12} muted style={{ marginTop: 2 }}>
          {helper}
        </Label>
      )}
    </View>
  );
});

export function ErrorNote({ error }: { error: unknown }) {
  const { colors: c } = useTheme();
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        backgroundColor: c.redSoft,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.red,
      }}
    >
      <AlertCircle size={18} color={c.red} />
      <Label size={14} bold style={{ color: c.red, flex: 1 }}>
        {message}
      </Label>
    </View>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { title: string; onPress: () => void };
}) {
  const { colors: c } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 64,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Inbox size={28} color={c.blue} strokeWidth={1.8} />
      </View>
      <Label bold size={20} style={{ textAlign: 'center' }}>
        {title}
      </Label>
      <Label
        muted
        size={14}
        style={{ textAlign: 'center', maxWidth: 320, lineHeight: 20 }}
      >
        {body}
      </Label>
      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          quiet
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  );
}


export type DialogAction = { title: string; onPress: () => void; danger?: boolean };
export function ActionDialog({ title, message, actions, onCancel }: { title: string; message: string; actions: DialogAction[]; onCancel: () => void }) {
  const { colors: c } = useTheme();
  return <Modal transparent visible animationType="none" onRequestClose={onCancel}>
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: c.overlay }}>
      <View accessibilityViewIsModal aria-modal accessibilityRole="alert" style={{ width: '100%', maxWidth: 480, maxHeight: '90%', alignSelf: 'center', backgroundColor: c.surface, borderRadius: 16 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Label size={23} bold accessibilityRole="header">{title}</Label><Label size={15} muted>{message}</Label>
          <Button title="Keep editing" quiet onPress={onCancel} />
          {actions.map(action => <Button key={action.title} title={action.title} danger={action.danger} onPress={action.onPress} />)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
