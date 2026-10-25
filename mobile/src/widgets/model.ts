import { MediaRequest, RequestPage } from '../api/types';

export type WidgetEvent = { id: string; title: string; venue: string; startsAt: number };
export type WidgetSnapshot = {
  workspaceId: string;
  timezone: string;
  updatedAt: number;
  expiresAt: number;
  events: WidgetEvent[];
};

export function createWidgetSnapshot(items: MediaRequest[], workspaceId: string, timezone: string, now = Date.now()): WidgetSnapshot {
  const unique = new Map<string, WidgetEvent>();
  for (const item of items) {
    const startsAt = item.event_start ? Date.parse(item.event_start) : NaN;
    if (!Number.isFinite(startsAt) || startsAt < now || ['completed', 'cancelled', 'dismissed'].includes(item.status)) continue;
    unique.set(item.id, { id: item.id, title: item.title.slice(0, 200), venue: (item.venue || 'Venue to confirm').slice(0, 200), startsAt });
  }
  return { workspaceId, timezone, updatedAt: now, expiresAt: now + 86400000, events: [...unique.values()].sort((a, b) => a.startsAt - b.startsAt || a.id.localeCompare(b.id)).slice(0, 50) };
}

export async function loadWidgetEvents(get: (path: string) => Promise<RequestPage>): Promise<MediaRequest[]> {
  const items: MediaRequest[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await get('/requests?tab=agenda&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    items.push(...page.items);
    cursor = page.next_cursor;
    if (cursor && seen.has(cursor)) throw new Error('The event list changed. Open the app and refresh.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
