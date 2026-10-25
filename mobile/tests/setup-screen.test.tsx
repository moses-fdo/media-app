import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SetupScreen from '../src/setup/SetupScreen';
import { SetupProvider } from '../src/setup/context';
import { defaultSetup, SetupStep, setupStorageKey } from '../src/setup/model';
import { ThemeProvider } from '../src/theme';

let mockMe: any;
let mockMailbox: any;
const mockConnect = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPush = jest.fn();
jest.mock('../src/auth/context', () => ({
  useAuth: () => ({ me: mockMe, tokens: {}, connectMailbox: mockConnect }),
  api: { get: async (path: string) => path === '/mailbox/status' ? { ...mockMailbox } : ({ items: [], next_cursor: null, counts: { active: 0 } }), post: (...args: any[]) => mockPost(...args), put: (...args: any[]) => mockPut(...args) },
}));
jest.mock('../src/notifications', () => ({ registerForPushNotifications: () => mockPush() }));
jest.mock('../src/widgets/native', () => ({ widgetAvailable: true, requestWidgetPin: async () => false }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const key = setupStorageKey('workspace-a', 'staff-a');
async function show(step: SetupStep) {
  await AsyncStorage.setItem(key, JSON.stringify({ ...defaultSetup, step }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = await render(<QueryClientProvider client={client}><ThemeProvider><SetupProvider><SetupScreen /></SetupProvider></ThemeProvider></QueryClientProvider>);
  await screen.findByText(/Step \d of 5/);
  return view;
}
beforeEach(async () => {
  await AsyncStorage.clear(); jest.clearAllMocks();
  mockMe = { id: 'staff-a', workspace_id: 'workspace-a', name: 'Alex Rivera', role: 'admin', timezone: 'Asia/Kolkata', preferences: { offsets: [1440, 60] } };
  mockMailbox = { status: 'connected', email: 'media@example.edu', last_synced: '2026-10-25T04:00:00Z', queued: 0, failed: 0 };
  mockPost.mockResolvedValue({ status: 'queued' }); mockPut.mockResolvedValue({ ok: true }); mockConnect.mockResolvedValue(undefined); mockPush.mockResolvedValue('fixture-push');
});

test('a personal account can connect Gmail without a separate account role', async () => {
  mockMe.role = 'user'; mockMailbox = { status: 'disconnected', email: null, last_synced: null };
  await show('mailbox');
  expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeTruthy();
  expect(screen.queryByText(/administrator|department|shared mailbox/i)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Connect Gmail' }));
  expect(mockConnect).toHaveBeenCalledTimes(1);
});

test('first sync waits for a new timestamp and extraction rather than treating queued as success', async () => {
  await show('sync'); await screen.findByRole('button', { name: 'Start first sync' });
  await fireEvent.press(screen.getByRole('button', { name: 'Start first sync' }));
  await screen.findByText('Waiting for sync to start');
  expect(screen.queryByText('Sync complete')).toBeNull();
  mockMailbox = { ...mockMailbox, last_synced: '2026-10-25T04:05:00Z', queued: 2 };
  await fireEvent.press(screen.getByRole('button', { name: 'Check progress' }));
  await screen.findByText('Organizing 2 messages');
  mockMailbox = { ...mockMailbox, queued: 0 };
  await fireEvent.press(screen.getByRole('button', { name: 'Check progress' }));
  await screen.findByText('Sync complete');
  expect(screen.getByRole('button', { name: 'Continue to reminders' })).toBeTruthy();
});

test('a queue outage explains the failure and allows retry without declaring completion', async () => {
  mockPost.mockRejectedValueOnce(new Error('Background queue unavailable. Retry synchronization shortly.'));
  await show('sync'); await screen.findByRole('button', { name: 'Start first sync' });
  await fireEvent.press(screen.getByRole('button', { name: 'Start first sync' }));
  await screen.findByText('Background queue unavailable. Retry synchronization shortly.');
  expect(screen.queryByText('Sync complete')).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry sync' })).toBeTruthy();
});

test('reminders save real preferences and request notification permission only on explicit action', async () => {
  await show('reminders');
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: '1 hour before setup' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Enable notifications' }));
  await screen.findByText('Notifications are enabled for this phone.');
  await fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
  await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/reminder-preferences', { offsets: [60] }));
  await screen.findByText('Keep your next events close.');
});

test('continue later exits setup and persists completion without pretending Gmail is connected', async () => {
  mockMailbox = { status: 'disconnected' };
  await show('welcome');
  await fireEvent.press(screen.getByRole('button', { name: 'Do this later' }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(key))!).completed).toBe(true));
  expect(mockPost).not.toHaveBeenCalled(); expect(mockConnect).not.toHaveBeenCalled();
});
