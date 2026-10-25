import { View, ActivityIndicator } from 'react-native';
import { useAuth, queryClient } from '../auth/context';
import { useTheme } from '../theme';
import { Label, Button, ErrorNote } from '../components/ui';

export default function WorkspaceGate() {
  const { profileLoading, authError, logout } = useAuth();
  const { colors: c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 16 }}>
    {profileLoading ? <><ActivityIndicator color={c.blue}/><Label muted style={{ textAlign: 'center' }}>Loading your account…</Label></> : <>
      <ErrorNote error={authError || 'Unable to load your account. Check your connection.'}/>
      <Button title="Retry connection" onPress={() => queryClient.invalidateQueries({ queryKey: ['me'] })}/>
      <Button title="Sign out" quiet onPress={() => logout()}/>
    </>}
  </View>;
}
