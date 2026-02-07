// ---------------------------------------------------------------------------
// HookBus — lightweight event bus with circuit breaker
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
}

const MAX_CONSECUTIVE_FAILURES = 3;

class HookBus {
  private subscribers: Subscriber[] = [];

  register(name: string, handler: HookHandler): void {
    this.subscribers.push({ name, handler, failures: 0, disabled: false });
  }

  async emit(event: HookEvent): Promise<void> {
    for (const sub of this.subscribers) {
      if (sub.disabled) continue;
      try {
        await sub.handler(event);
        sub.failures = 0;
      } catch {
        sub.failures++;
        if (sub.failures >= MAX_CONSECUTIVE_FAILURES) {
          sub.disabled = true;
        }
      }
    }
  }

  status(): Array<{ name: string; failures: number; disabled: boolean }> {
    return this.subscribers.map((s) => ({ name: s.name, failures: s.failures, disabled: s.disabled }));
  }
}

export const hookBus = new HookBus();
