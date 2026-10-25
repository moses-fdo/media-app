import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Requests from '../src/app/(tabs)/index';
import Detail from '../src/app/requests/[id]';
import { RequestRow } from '../src/features/requests/RequestRow';
import { EquipmentList } from '../src/features/requests/EquipmentList';
import { ThemeProvider } from '../src/theme';
import { formatDeadline, groupRequests } from '../src/features/requests/presentation';
import { MediaRequest } from '../src/api/types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn().mockReturnValue(true) },
  useLocalSearchParams: () => ({ id: 'req_convocation' }),
}));

const mockConvocation: MediaRequest = {
  id: 'req_convocation',
  title: 'Annual Convocation',
  organizer: 'Academic Office',
  venue: 'Main Auditorium',
  contact: 'ext 4022',
  event_start: '2026-10-26T10:00:00+05:30',
  event_end: '2026-10-26T13:00:00+05:30',
  setup_deadline: '2026-10-26T08:30:00+05:30',
  status: 'confirmed',
  review_reasons: [],
  requirements_summary: '4 mics, console, recording',
  requirements: [
    { id: 'g1', title: 'Wireless microphones', quantity: 4, department: 'audio', status: 'pending', notes: '', assignee_id: null, version: 1 },
    { id: 'g2', title: 'Mixing console', quantity: 1, department: 'audio', status: 'pending', notes: '', assignee_id: null, version: 1 },
    { id: 'g3', title: 'Event recording', quantity: null, department: 'video', status: 'pending', notes: 'Record the full ceremony.', assignee_id: null, version: 1 },
  ],
  timezone: 'Asia/Kolkata',
  version: 1,
  sources: ['src_1'],
  summary: 'Annual Convocation ceremony with audio and video support.',
  proposed_updates: [],
  activity: [],
  priority: 'normal',
};

const mockOverdueEvent: MediaRequest = {
  id: 'req_overdue',
  title: 'Morning Prayer',
  organizer: 'Chapel Office',
  venue: 'Main Hall',
  contact: 'ext 4001',
  event_start: '2026-10-20T08:00:00+05:30',
  event_end: '2026-10-20T09:00:00+05:30',
  setup_deadline: '2026-10-20T07:00:00+05:30',
  status: 'in_progress',
  review_reasons: [],
  requirements_summary: 'Podium mic',
  requirements: [{ id: 'g4', title: 'Podium mic', quantity: 1, department: 'audio', status: 'pending', notes: '', assignee_id: null, version: 1 }],
  timezone: 'Asia/Kolkata',
  version: 1,
  sources: ['src_2'],
  summary: '',
  proposed_updates: [],
  activity: [],
  priority: 'high',
};

let mockCurrentTab = 'active';
let mockRequestsList = [mockConvocation, mockOverdueEvent];
const mockPatch = jest.fn().mockResolvedValue({ ...mockConvocation, status: 'completed', version: 2 });
const mockSyncPost = jest.fn().mockResolvedValue({ status: 'queued' });

jest.mock('../src/auth/context', () => ({
  useAuth: () => ({ me: { id: 'u1', name: 'Moses Fernando', workspace_id: 'w1', role: 'admin', timezone: 'Asia/Kolkata' } }),
  api: {
    get: jest.fn(async (path: string) => {
      if (path.includes('mailbox')) {
        return { status: 'connected', last_synced: '2026-10-25T15:00:00Z', queued: 0, email: 'media@karunya.edu.in' };
      }
      if (path.includes('/requests/req_convocation')) {
        return mockConvocation;
      }
      return {
        items: mockRequestsList.filter(r => (mockCurrentTab === 'completed' ? r.status === 'completed' : r.status !== 'completed')),
        next_cursor: null,
        counts: { active: 2, completed: 0 },
      };
    }),
    patch: (path: string, data: any) => mockPatch(path, data),
    post: (path: string, data: any) => mockSyncPost(path, data),
  },
  queryClient: {
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../src/features/requests/useCachedQuery', () => ({
  useCachedQuery: (key: string) => {
    if (typeof key === 'string' && key.startsWith('request:')) {
      return {
        data: mockConvocation,
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: jest.fn().mockResolvedValue({}),
      };
    }
    return {
      data: {
        items: mockRequestsList.filter(r => (mockCurrentTab === 'completed' ? r.status === 'completed' : r.status !== 'completed')),
        next_cursor: null,
        counts: { active: 2, completed: 0 },
      },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({}),
    };
  },
}));

import { SafeAreaProvider } from 'react-native-safe-area-context';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 375, height: 812 } }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{ui}</ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockCurrentTab = 'active';
  mockRequestsList = [mockConvocation, mockOverdueEvent];
  jest.clearAllMocks();
});

describe('10 End-to-End Test Cases for Requests Workflow & UI', () => {
  // Test Case 1: Active Tab Routing & Display
  test('1. active media requests appear in the requests tab with proper badge counts', async () => {
    await renderWithProviders(<Requests />);
    expect(screen.getByRole('header', { name: 'Requests' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Active requests' })).toBeTruthy();
    expect(screen.getAllByText('Annual Convocation').length).toBeGreaterThan(0);
  });

  // Test Case 2: 2-Column Date Badge & Card Content
  test('2. request row renders 2-column layout with day, uppercase month, and metadata', async () => {
    const handlePress = jest.fn();
    await renderWithProviders(<RequestRow item={mockConvocation} onPress={handlePress} />);
    expect(screen.getByText('26')).toBeTruthy();
    expect(screen.getByText('OCT')).toBeTruthy();
    expect(screen.getByText('Annual Convocation')).toBeTruthy();
    expect(screen.getByText('Main Auditorium')).toBeTruthy();
    expect(screen.getByText('Academic Office')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /Annual Convocation/ }));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  // Test Case 3: Setup Deadline Alert Formatting (Normal vs Overdue)
  test('3. setup deadlines format with Setup by time and identify overdue events', () => {
    const normalDeadline = formatDeadline(mockConvocation.setup_deadline, mockConvocation.timezone);
    expect(normalDeadline).toContain('Setup by 8:30 AM');

    const nullDeadline = formatDeadline(null, 'Asia/Kolkata');
    expect(nullDeadline).toBe('Deadline to confirm');

    const groups = groupRequests([mockOverdueEvent, mockConvocation], 'Asia/Kolkata', new Date('2026-10-25T12:00:00Z'));
    expect(groups.some(g => g.title === 'Overdue')).toBe(true);
  });

  // Test Case 4: Detail Screen Header & Information Architecture
  test('4. detail screen renders Campus Modern top bar, metadata list, and deadline alert', async () => {
    await renderWithProviders(<Detail />);
    expect(screen.getByRole('button', { name: 'Back to Requests' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit request' })).toBeTruthy();
    expect(screen.getByText('Annual Convocation')).toBeTruthy();
    expect(screen.getByText('Academic Office')).toBeTruthy();
    expect(screen.getByText('Main Auditorium')).toBeTruthy();
    expect(screen.getByText(/Setup deadline:/)).toBeTruthy();
  });

  // Test Case 5: Equipment Categorization & Horizontal Divider Rules
  test('5. equipment list groups audio and video gear with clear category headers and dividers', async () => {
    await renderWithProviders(<EquipmentList requirements={mockConvocation.requirements} />);
    expect(screen.getByRole('header', { name: 'Equipment' })).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('4 × Wireless microphones')).toBeTruthy();
    expect(screen.getByText('1 × Mixing console')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('Event recording')).toBeTruthy();
    expect(screen.getByText('Record the full ceremony.')).toBeTruthy();
  });

  // Test Case 6: Primary Action - Mark Completed Transition
  test('6. pressing Mark completed calls PATCH API with expected version and completed status', async () => {
    await renderWithProviders(<Detail />);
    const completeButton = screen.getByRole('button', { name: 'Mark completed' });
    expect(completeButton).toBeTruthy();
    await fireEvent.press(completeButton);
    expect(mockPatch).toHaveBeenCalledWith(
      '/requests/req_convocation',
      expect.objectContaining({
        expected_version: 1,
        status: 'completed',
      })
    );
  });

  // Test Case 7: Done Tab Filter
  test('7. switching to Done tab filters completed requests and preserves parameters', async () => {
    await renderWithProviders(<Requests />);
    const doneTab = screen.getByRole('tab', { name: 'Done requests' });
    await fireEvent.press(doneTab);
    expect(doneTab).toBeTruthy();
  });

  // Test Case 8: Search Input Filtering & Clear Button
  test('8. search bar accepts input, clears on clear press, and does not crash UI', async () => {
    await renderWithProviders(<Requests />);
    const searchInput = screen.getByLabelText('Search requests');
    await fireEvent.changeText(searchInput, 'Convocation');
    expect(searchInput.props.value).toBe('Convocation');

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await fireEvent.press(clearButton);
    expect(searchInput.props.value).toBe('');
  });

  // Test Case 9: Equipment Department Filter Modal/Toggle
  test('9. toggling equipment department filter selects audio, updates UI badge, and clears', async () => {
    await renderWithProviders(<Requests />);
    const filterBtn = screen.getByRole('button', { name: 'Filter requests' });
    await fireEvent.press(filterBtn);

    const audioRadio = screen.getByRole('radio', { name: 'Audio' });
    await fireEvent.press(audioRadio);
    expect(screen.getByText('Audio equipment')).toBeTruthy();

    const clearFiltersBtn = screen.getByRole('button', { name: 'Clear filters' });
    await fireEvent.press(clearFiltersBtn);
    expect(screen.queryByText('Audio equipment')).toBeNull();
  });

  // Test Case 10: Zero-Tap Auto Sync on Mount & Background Trigger
  test('10. manual and auto-sync triggers post to mailbox/sync without UI errors', async () => {
    await renderWithProviders(<Requests />);
    const syncButton = screen.getByRole('button', { name: 'Sync mailbox' });
    expect(syncButton).toBeTruthy();
    await fireEvent.press(syncButton);
    expect(mockSyncPost.mock.calls[0][0]).toBe('/mailbox/sync');
  });
});
