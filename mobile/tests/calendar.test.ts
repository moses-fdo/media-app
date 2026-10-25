import { eventsByDay, monthDays } from '../src/features/requests/calendar';
import { MediaRequest } from '../src/api/types';

test('November 2026 begins on Sunday in a Monday-first grid', () => {
  const days = monthDays('2026-11-15');
  expect(days[6]).toEqual({ key: '2026-11-01', day: 1, inMonth: true });
  expect(days.filter(day => day.inMonth)).toHaveLength(30);
  expect(days).toHaveLength(42);
});

test('calendar includes leap day and remains continuous across daylight saving', () => {
  expect(monthDays('2028-02-10').filter(day => day.inMonth)).toHaveLength(29);
  const days = monthDays('2026-03-15');
  expect(new Set(days.map(day => day.key)).size).toBe(days.length);
  expect(days.filter(day => day.inMonth)).toHaveLength(31);
});

test('events use the workspace date and sort by time across different offsets', () => {
  const events = [
    { id: 'later', event_start: '2026-11-15T05:00:00Z', status: 'new' },
    { id: 'earlier', event_start: '2026-11-14T20:00:00Z', status: 'confirmed' },
    { id: 'cancelled', event_start: '2026-11-15T05:00:00Z', status: 'cancelled' },
    { id: 'unscheduled', event_start: null, status: 'needs_review' },
  ] as MediaRequest[];
  const days = eventsByDay(events, 'Asia/Kolkata');
  expect(days.get('2026-11-15')?.map(event => event.id)).toEqual(['earlier', 'later']);
  expect(days.has('2026-11-14')).toBe(false);
});
