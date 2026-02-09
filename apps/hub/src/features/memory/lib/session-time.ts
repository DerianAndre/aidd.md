import type { SessionState } from '../../../lib/types';

function parseDateInput(value: string | number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSessionStartedMs(session: SessionState): number {
  if (typeof session.startedAtTs === 'number' && Number.isFinite(session.startedAtTs)) {
    return session.startedAtTs;
  }
  return parseDateInput(session.startedAt);
}

export function getSessionEndedMs(session: SessionState): number {
  if (typeof session.endedAtTs === 'number' && Number.isFinite(session.endedAtTs)) {
    return session.endedAtTs;
  }
  return parseDateInput(session.endedAt);
}

export function getDateInput(value: string | number | undefined): string | number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return value ?? '';
}
