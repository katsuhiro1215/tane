export interface FlashProblem {
  sequence: number[];
  answer: number;
}

export interface FlashRule {
  readonly count: number;
  readonly digits: 1 | 2;
  readonly stepMs: number;
  readonly gapMs: number;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateFlashProblem(rule: FlashRule, rng: () => number = Math.random): FlashProblem {
  if (rule.count < 2) {
    throw new Error(`flash rule needs at least 2 numbers: ${rule.count}`);
  }
  const min = rule.digits === 1 ? 1 : 10;
  const max = rule.digits === 1 ? 9 : 99;

  const start = randomInt(min, max, rng);
  const sequence: number[] = [start];
  let runningTotal = start;

  while (sequence.length < rule.count) {
    // 合計が「いちばん小さい数」より小さいときに引くと負になるため、足し算にする
    const isAddition = runningTotal < min ? true : rng() < 0.5;
    const magnitude = isAddition
      ? randomInt(min, max, rng)
      : randomInt(min, Math.min(max, runningTotal), rng);
    const value = isAddition ? magnitude : -magnitude;
    runningTotal += value;
    sequence.push(value);
  }

  return { sequence, answer: runningTotal };
}

export function generateFlashStageProblems(
  rule: FlashRule,
  count: number = 20,
  rng: () => number = Math.random
): FlashProblem[] {
  return Array.from({ length: count }, () => generateFlashProblem(rule, rng));
}
