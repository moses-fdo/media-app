import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../auth/context';
import { useSetup } from '../setup/context';

export function requestFromWidgetURL(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'mediaops:' || url.search || url.hash || url.username || url.password) return null;
    const path = url.hostname ? '/' + url.hostname + url.pathname : url.pathname;
    return /^\/requests\/([A-Za-z0-9_-]{1,128})\/?$/.exec(path)?.[1] || null;
  } catch { return null; }
}

// The protected navigator can redirect a cold-start URL before SecureStore and
// the staff profile finish loading. Retain the request until both are ready.
export function WidgetRouting() {
  const { ready, tokens, me } = useAuth();
  const setup = useSetup();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    let receivedLiveURL = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      receivedLiveURL = true;
      const id = requestFromWidgetURL(url);
      if (id) setPending(id);
    });
    Linking.getInitialURL().then(url => {
      if (active && !receivedLiveURL && url) setPending(requestFromWidgetURL(url));
    }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (ready && tokens && me && setup.ready && !setup.required && pending) {
      router.replace({ pathname: '/requests/[id]', params: { id: pending } });
      setPending(null);
    }
  }, [ready, !!tokens, me?.id, pending, setup.ready, setup.required]);
  return null;
}
