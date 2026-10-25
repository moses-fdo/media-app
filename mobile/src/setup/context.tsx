import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../auth/context';
import { defaultSetup, parseSetup, SetupState, setupStorageKey } from './model';

type SetupContext = {
  ready: boolean; required: boolean; state: SetupState; error: unknown;
  update: (changes: Partial<SetupState>) => Promise<void>;
  finish: () => Promise<void>; restart: () => Promise<void>;
};
const Context = createContext<SetupContext | null>(null);

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const { tokens, me } = useAuth();
  const key = tokens && me ? setupStorageKey(me.workspace_id, me.id) : null;
  const [loaded, setLoaded] = useState<{ key: string; state: SetupState } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const current = useRef<typeof loaded>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    current.current = null; setLoaded(null); setError(null);
    if (key) AsyncStorage.getItem(key).then(raw => {
      if (!active) return;
      const next = { key, state: !raw && me?.account_mode === 'personal' ? { ...defaultSetup, completed: true } : parseSetup(raw) };
      current.current = next; setLoaded(next);
    }).catch(() => {
      if (!active) return;
      const next = { key, state: { ...defaultSetup } };
      current.current = next; setLoaded(next); setError(new Error('Unable to read saved setup. You can continue for now.'));
    });
    return () => { active = false; current.current = null; };
  }, [key, me?.account_mode]);

  const update = useCallback((changes: Partial<SetupState>) => {
    const task = writes.current.catch(() => {}).then(async () => {
      if (!key || current.current?.key !== key) throw new Error('Your account changed. Please reopen setup.');
      const next = { key, state: { ...current.current.state, ...changes } };
      await AsyncStorage.setItem(key, JSON.stringify(next.state));
      if (current.current?.key === key) { current.current = next; setLoaded(next); setError(null); }
    });
    writes.current = task;
    return task;
  }, [key]);

  async function finish() {
    try { await update({ completed: true }); }
    catch (failure) {
      // Storage trouble must not trap a signed-in user in optional onboarding.
      if (key && current.current?.key === key) {
        const next = { key, state: { ...current.current.state, completed: true } };
        current.current = next; setLoaded(next); setError(failure);
      }
    }
  }

  const ready = !key || loaded?.key === key;
  const state = loaded?.key === key ? loaded.state : defaultSetup;
  return <Context.Provider value={{ ready, required: !!key && ready && !state.completed, state, error, update, finish, restart: () => update({ ...defaultSetup }) }}>{children}</Context.Provider>;
}

export function useSetup() {
  const value = useContext(Context);
  if (!value) throw new Error('SetupProvider is missing.');
  return value;
}
