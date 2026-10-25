import { defaultSetup, parseSetup, syncProgress } from '../src/setup/model';
import { Mailbox } from '../src/api/types';

const previous = '2026-10-25T04:00:00Z';
const fresh = '2026-10-25T04:05:00Z';
const box = (changes: Partial<Mailbox> = {}) => ({ status: 'connected', email: 'media@example.edu', last_synced: previous, demo: false, queued: 0, failed: 0, ...changes });
const attempt = { ...defaultSetup, step: 'sync' as const, syncRequested: true, syncBaseline: previous };

test('queued is not completion and an old successful sync cannot finish a new attempt', () => {
  expect(syncProgress(box(), attempt)).toBe('waiting');
  expect(syncProgress(box({ status: 'syncing' }), attempt)).toBe('reading');
  expect(syncProgress(box({ last_synced: fresh, queued: 3 }), attempt)).toBe('processing');
  expect(syncProgress(box({ last_synced: fresh }), attempt)).toBe('complete');
});

test('first sync permits a new timestamp but never guesses completion from invalid data', () => {
  const first = { ...attempt, syncBaseline: null };
  expect(syncProgress(box({ last_synced: null }), first)).toBe('waiting');
  expect(syncProgress(box({ last_synced: 'invalid' }), first)).toBe('waiting');
  expect(syncProgress(box({ last_synced: fresh }), first)).toBe('complete');
  expect(syncProgress(box({ last_synced: fresh, queued: undefined }), first)).toBe('synced');
});

test('sync errors, failures and disconnected mailboxes have distinct recovery states', () => {
  expect(syncProgress(box({ status: 'error' }), attempt)).toBe('error');
  expect(syncProgress(box({ status: 'reconnect_required' }), attempt)).toBe('reconnect');
  expect(syncProgress(box({ status: 'disconnected' }), attempt)).toBe('disconnected');
  expect(syncProgress(box({ last_synced: fresh, failed: 2 }), attempt)).toBe('attention');
  expect(syncProgress(undefined, attempt)).toBe('unknown');
  expect(syncProgress(box(), defaultSetup)).toBe('existing');
});

test('setup persistence validates steps and never treats corrupt values as complete', () => {
  expect(parseSetup(null)).toEqual(defaultSetup);
  expect(parseSetup('not json')).toEqual(defaultSetup);
  expect(parseSetup(JSON.stringify({ version: 1, step: 'unknown', completed: true }))).toEqual(defaultSetup);
  expect(parseSetup(JSON.stringify({ ...defaultSetup, step: 'sync', syncRequested: true, syncBaseline: previous }))).toMatchObject({ step: 'sync', syncRequested: true, syncBaseline: previous });
  expect(parseSetup(JSON.stringify({ ...defaultSetup, completed: 'true' })).completed).toBe(false);
});
