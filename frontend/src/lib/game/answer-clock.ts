export interface AnswerClock {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): number;
  peek(): number;
}

export function createAnswerClock(now: () => number): AnswerClock {
  let startedAt: number | null = null;
  let accumulated = 0;
  let paused = false;

  function peek(): number {
    if (startedAt === null) return 0;
    return accumulated + (paused ? 0 : now() - startedAt);
  }

  return {
    start() {
      startedAt = now();
      accumulated = 0;
      paused = false;
    },
    pause() {
      if (startedAt === null || paused) return;
      accumulated += now() - startedAt;
      paused = true;
    },
    resume() {
      if (startedAt === null || !paused) return;
      startedAt = now();
      paused = false;
    },
    stop() {
      const total = peek();
      startedAt = null;
      accumulated = 0;
      paused = false;
      return total;
    },
    peek,
  };
}
