import { MediaRequest } from '../src/api/types';
import { createWidgetSnapshot, loadWidgetEvents } from '../src/widgets/model';

const now = Date.parse('2026-10-25T04:30:00Z');
const event = (id: string, start: string | null, status = 'confirmed') => ({ id, title: `Event ${id}`, venue: 'Main Hall', event_start: start, status } as MediaRequest);

test('widget orders actual future starts and excludes terminal, invalid and undated requests', () => {
  const snapshot = createWidgetSnapshot([
    event('later', '2026-10-26T12:00:00+05:30'),
    event('done', '2026-10-25T12:00:00+05:30', 'completed'),
    event('cancelled', '2026-10-25T12:00:00+05:30', 'cancelled'),
    event('dismissed', '2026-10-25T12:00:00+05:30', 'dismissed'),
    event('past', '2026-10-25T01:00:00Z'), event('unknown', null), event('invalid', 'not-a-date'),
    event('next', '2026-10-25T10:30:00+05:30'),
  ], 'workspace-a', 'Asia/Kolkata', now);
  expect(snapshot.events.map(item => item.id)).toEqual(['next', 'later']);
  expect(snapshot.events[0]).toMatchObject({ title: 'Event next', venue: 'Main Hall', startsAt: Date.parse('2026-10-25T05:00:00Z') });
  expect(snapshot.updatedAt).toBe(now);
  expect(snapshot.expiresAt).toBe(now + 86400000);
});

test('widget snapshot contains minimal fields only, deduplicates events, and bounds storage', () => {
  const items = Array.from({length: 60}, (_, i) => ({ ...event(String(i), new Date(now + (i + 1) * 60000).toISOString()), contact: 'private', sources: ['gmail-id'] }));
  const snapshot = createWidgetSnapshot([...items, items[0]], 'workspace-a', 'Asia/Kolkata', now);
  expect(snapshot.events).toHaveLength(50);
  expect(Object.keys(snapshot.events[0]).sort()).toEqual(['id', 'startsAt', 'title', 'venue']);
  expect(JSON.stringify(snapshot)).not.toContain('private');
});

test('widget fetches every agenda page before choosing upcoming events', async () => {
  const get = jest.fn().mockResolvedValueOnce({ items: [event('far', '2026-12-01T10:00:00Z')], next_cursor: 'a b' })
    .mockResolvedValueOnce({ items: [event('near', '2026-10-25T10:30:00+05:30')], next_cursor: null });
  const items = await loadWidgetEvents(get);
  expect(get.mock.calls[1][0]).toContain('cursor=a%20b');
  expect(createWidgetSnapshot(items, 'w', 'Asia/Kolkata', now).events[0].id).toBe('near');
});

test('a repeated pagination cursor fails instead of publishing an incomplete or endless feed', async () => {
  const get = jest.fn().mockResolvedValue({ items: [], next_cursor: 'repeated' });
  await expect(loadWidgetEvents(get)).rejects.toThrow(/refresh/i);
});
