import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Settings from '../src/app/(tabs)/settings';
import { ThemeProvider } from '../src/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

let mockMe: any = {
  id: 'u1',
  name: 'Alex Rivera',
  email: 'alex@example.edu',
  role: 'admin',
  workspace_id: 'w1',
  workspace_name: 'Media Ops',
  timezone: 'Asia/Kolkata',
  demo: false,
  preferences: { offsets: [1440, 60] },
};

const mockLogout = jest.fn();
const mockRestart = jest.fn().mockResolvedValue(undefined);
jest.mock('../src/setup/context', () => ({ useSetup: () => ({ restart: mockRestart }) }));

jest.mock('../src/auth/context', () => {
  const actual = jest.requireActual('../src/auth/context');
  return {
    ...actual,
    useAuth: () => ({
      me: mockMe,
      logout: mockLogout,
      tokens: { access_token: 'test', refresh_token: 'ref' },
      ready: true,
    }),
    api: {
      get: jest.fn().mockImplementation((url: string) => {
        if (url === '/mailbox/status') {
          return Promise.resolve({
            status: 'connected',
            email: 'media@example.edu',
            last_synced: '2026-10-23T10:00:00Z',
            demo: false,
          });
        }
        return Promise.resolve({});
      }),
      post: jest.fn().mockResolvedValue({ ok: true }),
    },
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

test('shows only personal account settings', async () => {
  mockMe = {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'alex@example.edu',
    role: 'admin',
    workspace_name: 'Media Ops',
    timezone: 'Asia/Kolkata',
    demo: false,
    preferences: { offsets: [1440, 60] },
  };

  await renderWithClient(<Settings />);

  expect(screen.getByText('Alex Rivera')).toBeTruthy();
  expect(screen.queryByText(/Administrator|Staff|Media Ops/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Staff' })).toBeNull();
  expect(screen.getByText('alex@example.edu')).toBeTruthy();
  expect(screen.getByText('Excluded emails')).toBeTruthy();
  expect(screen.getByText('Delete imported data')).toBeTruthy();
});

test('personal Gmail controls do not depend on a legacy role', async () => {
  mockMe = {
    id: 'u2',
    name: 'Jordan Lee',
    email: 'jordan@example.edu',
    role: 'staff',
    workspace_name: 'Media Ops',
    timezone: 'Asia/Kolkata',
    demo: false,
    preferences: { offsets: [1440, 60] },
  };

  await renderWithClient(<Settings />);

  expect(screen.getByText('Jordan Lee')).toBeTruthy();
  expect(screen.queryByText(/Media Ops · Staff/)).toBeNull();
  expect(screen.getByText('Excluded emails')).toBeTruthy();
  expect(screen.getByText('Delete imported data')).toBeTruthy();
});

test('triggers logout on sign out tap', async () => {
  await renderWithClient(<Settings />);
  const signOutBtn = screen.getByRole('button', { name: /Sign Out/ });
  fireEvent.press(signOutBtn);
  expect(mockLogout).toHaveBeenCalled();
});

test('navigates to template screen when template card is pressed', async () => {
  const { router } = require('expo-router');
  await renderWithClient(<Settings />);
  const templateBtn = screen.getByRole('button', { name: /Media request template/i });
  expect(templateBtn).toBeTruthy();
  fireEvent.press(templateBtn);
  expect(router.push).toHaveBeenCalledWith('/settings/template');
});

test('renders template settings screen with copy and share options', async () => {
  const TemplateSettings = require('../src/app/settings/template').default;
  const { getByText } = await renderWithClient(<TemplateSettings />);
  expect(getByText('Automated Request Extraction')).toBeTruthy();
  expect(getByText('Standard Template (Fill-in)')).toBeTruthy();
  expect(getByText('Field Reference & Supported Formats')).toBeTruthy();
});

test('copy template writes the actual template to the clipboard', async () => {
  const { default: TemplateSettings, BLANK_MEDIA_REQUEST_TEMPLATE } = require('../src/app/settings/template');
  const Clipboard = require('expo-clipboard');
  await renderWithClient(<TemplateSettings />);
  await fireEvent.press(screen.getByRole('button', { name: 'Copy blank template' }));
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(BLANK_MEDIA_REQUEST_TEMPLATE);
  expect(screen.getByText('Copied!')).toBeTruthy();
});



test('setup can be replayed from Settings', async () => {
  await renderWithClient(<Settings />);
  await fireEvent.press(screen.getByRole('button', { name: 'Replay setup' }));
  expect(mockRestart).toHaveBeenCalled();
});
