import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api, getOAuthVerifier, clearOAuthVerifier, queryClient } from '../auth/context';
import { Tokens } from '../api/types';
import { useTheme } from '../theme';
import { Label, ErrorNote, Button } from '../components/ui';

export default function AuthCallback() {
  const { colors: c } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const [error, setError] = useState<string | null>(params.error || null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleExchange() {
      // Signal WebBrowser in case openAuthSessionAsync is waiting
      WebBrowser.maybeCompleteAuthSession();

      if (params.error) {
        if (mounted) {
          setError(params.error);
          setBusy(false);
        }
        return;
      }

      const code = params.code;
      if (!code) {
        if (mounted) {
          router.replace(api.tokens ? '/(tabs)' : '/sign-in');
        }
        return;
      }

      try {
        const { verifier, intent } = await getOAuthVerifier();
        if (verifier) {
          const tokens = await api.post<Tokens>('/auth/exchange', { code, verifier });
          await api.setSession(tokens);
          await clearOAuthVerifier();
          if (intent === 'mailbox') {
            await queryClient.invalidateQueries();
            if (mounted) router.replace('/settings/mailbox');
            return;
          }
        }
        if (!api.tokens) throw new Error('This sign-in attempt expired. Return to sign-in and try again.');
        if (mounted) {
          router.replace('/(tabs)');
        }
      } catch (err: any) {
        // If code was already exchanged by openAuthSessionAsync, check session
        if (api.tokens) {
          if (mounted) router.replace('/(tabs)');
          return;
        }
        if (mounted) {
          setError(err?.message || 'Authentication failed. Please try again.');
          setBusy(false);
        }
      }
    }

    handleExchange();
    return () => {
      mounted = false;
    };
  }, [params.code, params.error]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      {busy ? (
        <>
          <ActivityIndicator size="large" color={c.blue} />
          <Label size={16} bold style={{ textAlign: 'center' }}>
            Completing authentication…
          </Label>
        </>
      ) : error ? (
        <View style={{ gap: 16, width: '100%', maxWidth: 400 }}>
          <ErrorNote error={error} />
          <Button title="Back to Sign In" onPress={() => router.replace('/sign-in')} />
        </View>
      ) : null}
    </View>
  );
}
