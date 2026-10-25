import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SetupProvider, useSetup } from '../src/setup/context';
import { defaultSetup, setupStorageKey } from '../src/setup/model';

let mockMe: any = { id: 'staff-a', workspace_id: 'workspace-a' };
jest.mock('../src/auth/context', () => ({ useAuth: () => ({ me: mockMe, tokens: mockMe ? {} : null }) }));

function Probe() {
  const setup = useSetup();
  return <><Text>{setup.ready ? setup.state.step + ':' + setup.required : 'loading'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="advance" onPress={() => setup.update({ step: 'sync' })}><Text>Advance</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="finish" onPress={() => setup.finish()}><Text>Finish</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="replay" onPress={() => setup.restart()}><Text>Replay</Text></Pressable>
  </>;
}
beforeEach(async () => { await AsyncStorage.clear(); mockMe = { id: 'staff-a', workspace_id: 'workspace-a' }; });

test('setup resumes, remembers completion per account and can replay', async () => {
  await AsyncStorage.setItem(setupStorageKey('workspace-a', 'staff-a'), JSON.stringify({ ...defaultSetup, step: 'mailbox' }));
  const view = await render(<SetupProvider><Probe /></SetupProvider>);
  await waitFor(() => expect(screen.getByText('mailbox:true')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'advance' }));
  await waitFor(() => expect(screen.getByText('sync:true')).toBeTruthy());
  await view.unmount();
  await render(<SetupProvider><Probe /></SetupProvider>);
  await waitFor(() => expect(screen.getByText('sync:true')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'finish' }));
  await waitFor(() => expect(screen.getByText('sync:false')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'replay' }));
  await waitFor(() => expect(screen.getByText('welcome:true')).toBeTruthy());
});

test('switching accounts never borrows another account completion state', async () => {
  await AsyncStorage.setItem(setupStorageKey('workspace-a', 'staff-a'), JSON.stringify({ ...defaultSetup, completed: true }));
  const view = await render(<SetupProvider><Probe /></SetupProvider>);
  await waitFor(() => expect(screen.getByText('welcome:false')).toBeTruthy());
  mockMe = { id: 'staff-b', workspace_id: 'workspace-b' };
  await view.rerender(<SetupProvider><Probe /></SetupProvider>);
  await waitFor(() => expect(screen.getByText('welcome:true')).toBeTruthy());
});
