// ---------------------------------------------------------------------------
// HookBus — event bus with retries, backoff, dead-letter tracking, and breaker
// ---------------------------------------------------------------------------

export type HookEvent =
  | { type: 'session_ended'; sessionId: string }
  | { type: 'observation_saved'; observationId: string; sessionId: string };

export type HookHandler = (event: HookEvent) => Promise<void>;

interface Subscriber {
  name: string;
  handler: HookHandler;
  failures: number;
  disabled: boolean;
  disabledAt?: string;
  lastError?: string;
}

interface DeadLetter {
  id: string;
  subscriber: string;
  eventType: HookEvent['type'];
  sessionId: string;
  error: string;
  attempts: number;
  timestamp: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 50;
const RECOVERY_COOLDOWN_MS = 60_000;
const MAX_DEAD_LETTERS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HookBus {
  private subscribers: Subscriber[] = [];
  private deadLetters: DeadLetter[] = [];

  register(name: string, handler: HookHandler): void {
    const existing = this.subscribers.find((s) => s.name === name);
    if (existing) {
      existing.handler = handler;
      existing.disabled = false;
      existing.failures = 0;
      existing.lastError = undefined;
      existing.disabledAt = undefined;
      return;
    }
    this.subscribers.push({ name, handler, failures: 0, disabled: false });
  }

  async emit(event: HookEvent): Promise<void> {
    for (const sub of this.subscribers) {
      this.recoverIfCooldownElapsed(sub);
      if (sub.disabled) continue;

      let attempts = 0;
      let lastErr: unknown = null;
      for (; attempts <= MAX_RETRIES; attempts++) {
        try {
          await sub.handler(event);
          sub.failures = 0;
          sub.lastError = undefined;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (attempts < MAX_RETRIES) {
            await sleep(BASE_BACKOFF_MS * 2 ** attempts);
          }
        }
      }

      if (!lastErr) continue;

      const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
      sub.failures += 1;
      sub.lastError = message;

      this.deadLetters.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        subscriber: sub.name,
        eventType: event.type,
        sessionId: event.sessionId,
        error: message,
        attempts: attempts,
        timestamp: new Date().toISOString(),
      });

      if (this.deadLetters.length > MAX_DEAD_LETTERS) {
        this.deadLetters.splice(0, this.deadLetters.length - MAX_DEAD_LETTERS);
      }

      if (sub.failures >= MAX_CONSECUTIVE_FAILURES) {
        sub.disabled = true;
        sub.disabledAt = new Date().toISOString();
      }
    }
  }

  status(): Array<{
    name: string;
    failures: number;
    disabled: boolean;
    disabledAt?: string;
    lastError?: string;
    deadLetters: number;
  }> {
    return this.subscribers.map((s) => ({
      name: s.name,
      failures: s.failures,
      disabled: s.disabled,
      disabledAt: s.disabledAt,
      lastError: s.lastError,
      deadLetters: this.deadLetters.filter((d) => d.subscriber === s.name).length,
    }));
  }

  listDeadLetters(limit = 50): DeadLetter[] {
    return this.deadLetters.slice(-Math.max(1, limit));
  }

  private recoverIfCooldownElapsed(sub: Subscriber): void {
    if (!sub.disabled || !sub.disabledAt) return;
    const disabledAtMs = new Date(sub.disabledAt).getTime();
    if (!Number.isFinite(disabledAtMs)) return;
    if (Date.now() - disabledAtMs < RECOVERY_COOLDOWN_MS) return;

    sub.disabled = false;
    sub.failures = 0;
    sub.disabledAt = undefined;
    sub.lastError = undefined;
  }
}

export const hookBus = new HookBus();

