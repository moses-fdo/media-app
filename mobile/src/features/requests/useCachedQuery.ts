import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/context';

export function useCachedQuery<T>(key: string, load: () => Promise<T>) {
  const { me, tokens } = useAuth();
  const storageKey = 'media-cache:' + me?.workspace_id + ':' + key;
  const [cached, setCached] = useState<{ key: string; data: T }>();
  const enabled = !!tokens && !!me;
  const query = useQuery({ queryKey: [me?.workspace_id, key], queryFn: load, enabled, refetchInterval: 30000 });
  useEffect(() => {
    let active = true;
    setCached(undefined);
    if (enabled) AsyncStorage.getItem(storageKey).then(raw => {
      if (!raw || !active) return;
      const value = JSON.parse(raw);
      if (value.savedAt && Date.now() - value.savedAt < 86400000) setCached({ key: storageKey, data: value.data });
    }).catch(() => {});
    return () => { active = false; };
  }, [storageKey, enabled]);
  useEffect(() => {
    if (enabled && query.data) AsyncStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), data: query.data })).catch(() => {});
  }, [query.data, storageKey, enabled]);
  const data = enabled ? query.data || (cached?.key === storageKey ? cached.data : undefined) : undefined;
  return { ...query, data, offline: !!query.error && !!data };
}
