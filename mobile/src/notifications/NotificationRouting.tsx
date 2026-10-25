import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../auth/context';
import { useSetup } from '../setup/context';

export function NotificationRouting() {
  const { tokens, me } = useAuth();
  const setup = useSetup();
  useEffect(() => {
    if (!tokens || !me || !setup.ready || setup.required || Platform.OS === 'web') return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    import('expo-notifications').then(async notifications => {
      if (!active) return;
      const open = (response: import('expo-notifications').NotificationResponse | null) => {
        const id = response?.notification.request.content.data?.request_id;
        if (active && typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id)) {
          router.push({ pathname: '/requests/[id]', params: { id } });
          notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      };
      notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
      subscription = notifications.addNotificationResponseReceivedListener(open);
      open(await notifications.getLastNotificationResponseAsync());
    }).catch(() => {});
    return () => { active = false; subscription?.remove(); };
  }, [tokens, me?.id, setup.ready, setup.required]);
  return null;
}
