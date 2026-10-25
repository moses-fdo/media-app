import { DateTime } from 'luxon';
import { MediaRequest } from '../../api/types';

export function dayInZone(value: string, zone: string) {
  return DateTime.fromISO(value, { zone }).toISODate();
}

export function monthDays(month: string) {
  const start = DateTime.fromISO(month).startOf('month');
  const offset = start.weekday - 1;
  const count = Math.ceil((offset + start.daysInMonth!) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = start.minus({ days: offset }).plus({ days: index });
    return { key: date.toISODate()!, day: date.day, inMonth: date.month === start.month };
  });
}

export function eventsByDay(items: MediaRequest[], zone: string) {
  const days = new Map<string, MediaRequest[]>();
  for (const event of items) {
    if (!event.event_start || ['cancelled', 'dismissed'].includes(event.status)) continue;
    const day = dayInZone(event.event_start, zone);
    if (!day) continue;
    days.set(day, [...(days.get(day) || []), event]);
  }
  for (const events of days.values()) events.sort((a, b) => Date.parse(a.event_start!) - Date.parse(b.event_start!));
  return days;
}
