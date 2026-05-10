export type SimulationEvent = {
  id: string;
  atTick: number;
  action: () => void;
};

export class SimulationScheduler {
  private tick = 0;
  private queue: SimulationEvent[] = [];

  get currentTick(): number {
    return this.tick;
  }

  schedule(delayTicks: number, action: () => void): string {
    const safeDelay = Math.max(0, Math.floor(delayTicks));
    const event: SimulationEvent = {
      id: `ev-${this.tick}-${Math.random().toString(36).slice(2, 8)}`,
      atTick: this.tick + safeDelay,
      action,
    };
    this.queue.push(event);
    this.queue.sort((a, b) => a.atTick - b.atTick || a.id.localeCompare(b.id));
    return event.id;
  }

  cancel(eventId: string): void {
    this.queue = this.queue.filter((event) => event.id !== eventId);
  }

  advance(ticks = 1): void {
    const stepCount = Math.max(1, Math.floor(ticks));
    for (let i = 0; i < stepCount; i++) {
      this.tick += 1;
      this.flushDueEvents();
    }
  }

  clear(): void {
    this.queue = [];
  }

  snapshot() {
    return {
      tick: this.tick,
      queuedEvents: this.queue.map((event) => ({ id: event.id, atTick: event.atTick })),
    };
  }

  private flushDueEvents(): void {
    const due = this.queue.filter((event) => event.atTick <= this.tick);
    this.queue = this.queue.filter((event) => event.atTick > this.tick);
    for (const event of due) {
      event.action();
    }
  }
}
