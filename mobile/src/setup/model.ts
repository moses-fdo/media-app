import { Mailbox } from '../api/types';

export const setupSteps = ['welcome', 'mailbox', 'sync', 'reminders', 'widget'] as const;
export type SetupStep = typeof setupSteps[number];
export type SetupState = {
  version: 1; step: SetupStep; completed: boolean;
  syncRequested: boolean; syncBaseline: string | null; syncStartedAt: number | null;
};
export const defaultSetup: SetupState = { version: 1, step: 'welcome', completed: false, syncRequested: false, syncBaseline: null, syncStartedAt: null };
export const setupStorageKey = (workspace: string, member: string) => `media-setup:v1:${encodeURIComponent(workspace)}:${encodeURIComponent(member)}`;

export function parseSetup(raw: string | null): SetupState {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || value.version !== 1 || !setupSteps.includes(value.step)) return { ...defaultSetup };
    return { version: 1, step: value.step, completed: value.completed === true, syncRequested: value.syncRequested === true,
      syncBaseline: typeof value.syncBaseline === 'string' && Number.isFinite(Date.parse(value.syncBaseline)) ? value.syncBaseline : null,
      syncStartedAt: typeof value.syncStartedAt === 'number' && Number.isFinite(value.syncStartedAt) ? value.syncStartedAt : null };
  } catch { return { ...defaultSetup }; }
}

export function mailboxConnected(mailbox: Mailbox | undefined): boolean {
  return !!mailbox?.email && ['connected', 'syncing', 'error'].includes(mailbox.status);
}

export function syncProgress(mailbox: Mailbox | undefined, setup: SetupState) {
  if (!mailbox) return 'unknown';
  if (mailbox.status === 'reconnect_required') return 'reconnect';
  if (mailbox.status === 'disconnected') return 'disconnected';
  if (mailbox.status === 'error') return 'error';
  if (mailbox.status === 'syncing') return 'reading';
  if ((mailbox.queued || 0) > 0) return 'processing';
  const synced = mailbox.last_synced ? Date.parse(mailbox.last_synced) : NaN;
  if (!Number.isFinite(synced)) return setup.syncRequested ? 'waiting' : 'idle';
  if (setup.syncRequested && setup.syncBaseline && synced <= Date.parse(setup.syncBaseline)) return 'waiting';
  if ((mailbox.failed || 0) > 0) return 'attention';
  if (mailbox.queued === undefined) return 'synced';
  return setup.syncRequested ? 'complete' : 'existing';
}
