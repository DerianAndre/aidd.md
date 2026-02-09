import type { SessionState } from '../../../lib/types';

const UNIX_SECONDS_MAX = 9_999_999_999;
const MIN_REASONABLE_MS = Date.UTC(2000, 0, 1);

function normalizeTimestampMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const ms = value <= UNIX_SECONDS_MAX ? value * 1000 : value;
  return ms >= MIN_REASONABLE_MS ? ms : 0;
}

function parseDateInput(value: string | number | undefined): number {
  if (typeof value === 'number') return normalizeTimestampMs(value);
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^\d+$/.test(trimmed)) {
    return normalizeTimestampMs(Number(trimmed));
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSessionStartedMs(session: SessionState): number {
  const fromColumn = parseDateInput(session.startedAtTs);
  if (fromColumn > 0) {
    return fromColumn;
  }
  return parseDateInput(session.startedAt);
}

export function getSessionEndedMs(session: SessionState): number {
  const fromColumn = parseDateInput(session.endedAtTs);
  if (fromColumn > 0) {
    return fromColumn;
  }
  return parseDateInput(session.endedAt);
}

export function getDateInput(value: string | number | undefined): string | number {
  const parsed = parseDateInput(value);
  return parsed > 0 ? parsed : '';
}
