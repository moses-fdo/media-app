import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../auth/context';

const tokenKey = 'media-ops-device-token';

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Setup reminders', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Configure the Expo project before enabling notifications.');
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.post('/devices', { token });
  await AsyncStorage.setItem(tokenKey, token);
  return token;
}

export async function unregisterPushNotification(token: string): Promise<void> {
  await api.delete('/devices', { token });
  await AsyncStorage.removeItem(tokenKey);
}

export async function unregisterCurrentDevice(): Promise<void> {
  const token = await AsyncStorage.getItem(tokenKey);
  if (token) {
    // A network failure must not prevent local sign-out.
    try { await unregisterPushNotification(token); } catch {}
  }
}
