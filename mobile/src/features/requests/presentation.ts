import { MediaRequest } from '../../api/types';

export function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return isNaN(d.getTime()) ? null : d;
}

export function dateKey(value: string | Date, zone: string = 'Asia/Kolkata'): string {
  const d = safeDate(value);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

export function clock(value: string | null | undefined, zone: string = 'Asia/Kolkata'): string {
  const d = safeDate(value);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

export function formatDeadline(value: string | null | undefined, zone: string = 'Asia/Kolkata'): string {
  if (!value) return 'Deadline to confirm';
  const c = clock(value, zone);
  return c ? 'Setup by ' + c : 'Deadline to confirm';
}

export function dateLabel(value: string | null | undefined, zone: string = 'Asia/Kolkata'): string {
  const d = safeDate(value);
  if (!d) return 'Date to confirm';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return d.toDateString();
  }
}

export function groupRequests(items: MediaRequest[], zone: string = 'Asia/Kolkata', now = new Date()) {
  const today = dateKey(now, zone);
  const tomorrow = dateKey(new Date(now.getTime() + 86400000), zone);
  const groups = new Map<string, MediaRequest[]>();
  const sorted = [...items].sort((a, b) => {
    const timeA = a.setup_deadline ? new Date(a.setup_deadline).getTime() : a.event_start ? new Date(a.event_start).getTime() : Infinity;
    const timeB = b.setup_deadline ? new Date(b.setup_deadline).getTime() : b.event_start ? new Date(b.event_start).getTime() : Infinity;
    return (isNaN(timeA) ? Infinity : timeA) - (isNaN(timeB) ? Infinity : timeB);
  });
  for (const item of sorted) {
    const date = item.setup_deadline || item.event_start;
    const day = date ? dateKey(date, zone) : null;
    const done = ['completed', 'cancelled'].includes(item.status);
    const isOverdue = !done && date && !isNaN(new Date(date).getTime()) && new Date(date) < now;
    const key = !date
      ? 'Needs review'
      : isOverdue
      ? 'Overdue'
      : day === today
      ? 'Today'
      : day === tomorrow
      ? 'Tomorrow'
      : dateLabel(date, zone);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return Array.from(groups, ([title, data]) => ({ title, data }));
}

export const statusLabel = (s: string) =>
  ({
    needs_review: 'Needs review',
    new: 'New',
    in_progress: 'In progress',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    dismissed: 'Dismissed',
  }[s] || s);

