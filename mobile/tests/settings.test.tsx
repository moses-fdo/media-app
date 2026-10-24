import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Settings from '../src/app/(tabs)/settings';
import { ThemeProvider } from '../src/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

test('renders user profile, mailbox status, and admin controls for admin', async () => {
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
  expect(screen.getByText('Administrator')).toBeTruthy();
  expect(screen.getByText('alex@example.edu')).toBeTruthy();
  expect(screen.getByText('Excluded Email Recovery')).toBeTruthy();
  expect(screen.getByText('Delete Stored Workspace Data')).toBeTruthy();
});

test('hides admin controls for standard staff member', async () => {
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
  expect(screen.getByText('Staff')).toBeTruthy();
  expect(screen.queryByText('Excluded Email Recovery')).toBeNull();
  expect(screen.queryByText('Delete Stored Workspace Data')).toBeNull();
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

