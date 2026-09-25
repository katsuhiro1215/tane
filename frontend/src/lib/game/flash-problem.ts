export interface FlashProblem {
  sequence: number[];
  answer: number;
}

const LEVEL_LENGTH: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
};

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateFlashProblem(
  level: number,
  rng: () => number = Math.random
): FlashProblem {
  const length = LEVEL_LENGTH[level];
  if (!length) {
    throw new Error(`Unsupported level for flash: ${level}`);
  }

  const start = randomInt(1, 9, rng);
  const sequence: number[] = [start];
  let runningTotal = start;

  while (sequence.length < length) {
    // 合計が0のときに引き算を選ぶと負になってしまうため、必ず足し算にする。
    const isAddition = runningTotal === 0 ? true : rng() < 0.5;
    const magnitude = isAddition
      ? randomInt(1, 9, rng)
      : randomInt(1, Math.min(9, runningTotal), rng);
    const value = isAddition ? magnitude : -magnitude;

    runningTotal += value;
    sequence.push(value);
  }

  return { sequence, answer: runningTotal };
}

export function generateFlashStageProblems(
  level: number,
  count: number = 20,
  rng: () => number = Math.random
): FlashProblem[] {
  return Array.from({ length: count }, () => generateFlashProblem(level, rng));
}
