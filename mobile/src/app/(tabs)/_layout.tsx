import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { List, CalendarDays, Settings } from 'lucide-react-native';
import { useAuth } from '../../auth/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { ready, tokens } = useAuth();
  const { colors: c } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  if (!tokens) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.blue,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          height: 64 + insets.bottom,
          backgroundColor: c.surface,
          borderTopColor: c.line,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color, size }) => <List color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
