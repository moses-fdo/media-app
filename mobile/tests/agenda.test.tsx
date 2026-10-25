import { render, screen, fireEvent } from '@testing-library/react-native';
import { Settings } from 'luxon';
import Agenda from '../src/app/(tabs)/agenda';
import { ThemeProvider } from '../src/theme';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../src/auth/context', () => ({ useAuth: () => ({ me: { timezone: 'Asia/Kolkata' } }), api: {} }));
jest.mock('../src/features/requests/useCachedQuery', () => ({
  useCachedQuery: () => ({ data: { items: [
    { id: 'one', title: 'Convocation', status: 'confirmed', event_start: '2026-11-15T04:30:00Z', setup_deadline: '2026-11-15T03:00:00Z', venue: 'Main Auditorium' },
    { id: 'two', title: 'Guest lecture', status: 'new', event_start: '2026-11-16T08:30:00Z', setup_deadline: null, venue: 'Seminar Hall' },
  ] }, isLoading: false, isRefetching: false, refetch: jest.fn() }),
}));

const originalNow = Settings.now;
beforeEach(() => { Settings.now = () => Date.parse('2026-11-15T06:00:00Z'); });
afterEach(() => { Settings.now = originalNow; });

test('selecting a date updates the events below, and Today restores the current day', async () => {
  await render(<ThemeProvider><Agenda /></ThemeProvider>);
  expect(screen.getByText('Convocation')).toBeTruthy();
  expect(screen.queryByText('Guest lecture')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /Monday, 16 November 2026/ }));
  expect(screen.getByText('Guest lecture')).toBeTruthy();
  expect(screen.queryByText('Convocation')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
  expect(screen.getByText('Convocation')).toBeTruthy();
});

test('month navigation changes the grid and offers a date-prefilled request on an empty day', async () => {
  const { router } = require('expo-router');
  await render(<ThemeProvider><Agenda /></ThemeProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByText('December 2026')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /Wednesday, 16 December 2026/ }));
  expect(screen.getByText('No events scheduled')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Add request' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/requests/new', params: { date: '2026-12-16' } });
});

test('new requests use the selected agenda date even when events exist', async () => {
  const { router } = require('expo-router');
  await render(<ThemeProvider><Agenda /></ThemeProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'New request' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/requests/new', params: { date: '2026-11-15' } });
});
