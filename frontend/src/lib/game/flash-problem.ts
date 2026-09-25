export interface FlashProblem {
  sequence: number[];
  answer: number;
}

// フラッシュ暗算のレベルの唯一の出所。flash-stages.ts(ステージ定義)と
// flash-stage-player.tsx(表示速度)はここから型を借りることで、
// レベルを追加したときにLEVEL_LENGTH/LEVEL_TIMINGの更新を忘れると
// コンパイルエラーになるようにする(Record<FlashLevel, V>は全キーの
// 指定を要求するため)。
export const FLASH_LEVELS = [1, 2, 3] as const;
export type FlashLevel = (typeof FLASH_LEVELS)[number];

const LEVEL_LENGTH: Record<FlashLevel, number> = {
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
  const length = LEVEL_LENGTH[level as FlashLevel];
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
