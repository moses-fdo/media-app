import { Linking } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { WidgetRouting, requestFromWidgetURL } from '../src/widgets/WidgetRouting';

let mockSetup = { ready: true, required: false };
jest.mock('../src/setup/context', () => ({ useSetup: () => mockSetup }));
let mockAuth: any = { ready: false, tokens: null, me: null };
jest.mock('../src/auth/context', () => ({ useAuth: () => mockAuth }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); mockSetup = { ready: true, required: false }; });

test('a cold-start widget request waits for session and profile restoration', async () => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('mediaops:///requests/event-1');
  const listener = jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockAuth = { ready: false, tokens: null, me: null };
  const view = await render(<WidgetRouting />);
  await waitFor(() => expect(listener).toHaveBeenCalled());
  expect(router.replace).not.toHaveBeenCalled();
  mockAuth = { ready: true, tokens: { access_token: 'fixture' }, me: null };
  await view.rerender(<WidgetRouting />);
  expect(router.replace).not.toHaveBeenCalled();
  mockAuth = { ...mockAuth, me: { id: 'staff-a', workspace_id: 'workspace-a' } };
  await view.rerender(<WidgetRouting />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/requests/[id]', params: { id: 'event-1' } }));
});

test('only app request links with safe identifiers become widget destinations', () => {
  expect(requestFromWidgetURL('mediaops:///requests/event-1')).toBe('event-1');
  expect(requestFromWidgetURL('mediaops://requests/event-1')).toBe('event-1');
  for (const url of ['https://example.com/requests/event-1', 'mediaops:///settings/staff', 'mediaops:///requests/../../settings', 'mediaops:///requests/event-1?redirect=other', 'invalid']) {
    expect(requestFromWidgetURL(url)).toBeNull();
  }
});


test('a widget destination is retained until intro setup finishes', async () => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('mediaops:///requests/event-2');
  jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  mockAuth = { ready: true, tokens: {}, me: { id: 'staff-a' } };
  mockSetup = { ready: true, required: true };
  const view = await render(<WidgetRouting />);
  expect(router.replace).not.toHaveBeenCalled();
  mockSetup = { ready: true, required: false };
  await view.rerender(<WidgetRouting />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/requests/[id]', params: { id: 'event-2' } }));
});
