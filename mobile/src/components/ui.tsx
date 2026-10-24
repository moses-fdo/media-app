import React, { useRef, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  Animated,
  ViewStyle,
  TextStyle,
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
          fontWeight: bold ? '600' : '400',
          letterSpacing: size >= 27 ? -0.7 : size <= 12 ? 0.2 : 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
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

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
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

export function Field({
  label,
  helper,
  style,
  ...props
}: TextInputProps & { label: string; helper?: string }) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Label size={14} bold>
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
        style={[
          {
            minHeight: 48,
            backgroundColor: c.input,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: c.ink,
            borderWidth: 1.5,
            borderColor: focused ? c.blue : c.line,
          },
          props.multiline && {
            minHeight: 96,
            textAlignVertical: 'top',
          },
          style,
        ]}
      />
      {helper && (
        <Label size={12} muted style={{ marginTop: 2 }}>
          {helper}
        </Label>
      )}
    </View>
  );
}

export function StatusBadge({
  label,
  tone,
  bgTone,
  showDot = true,
}: {
  label: string;
  tone: string;
  bgTone: string;
  showDot?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: bgTone,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.full,
      }}
    >
      {showDot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: tone,
          }}
        />
      )}
      <Label size={12} bold style={{ color: tone }}>
        {label}
      </Label>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors: c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

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

export const styles = StyleSheet.create({
  page: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pad: { paddingHorizontal: 20 },
  stack: { gap: 16 },
  section: { paddingVertical: 18 },
});
