export type SeedThresholds = readonly [number, number, number, number, number];

export const SEED_ROUND_MS = 60_000;
export const SEED_PENALTY_MISTAKES = 3;

/** 制限時間の読み方（60000 → 1ぷん、120000 → 2ふん） */
export function roundLabel(roundMs: number): string {
  const minutes = Math.round(roundMs / 60_000);
  return minutes === 1 ? "1ぷん" : `${minutes}ふん`;
}

export type SeedStars = 0 | 1 | 2 | 3 | 4 | 5;

/** 1分の★。正解数が届いた目標の数。ミスが多いと1つ減る（★1は残す）。HPが0なら0（設計書4.5） */
export function starsForSeedRun(input: {
  correct: number;
  mistakes: number;
  defeated: boolean;
  thresholds: SeedThresholds;
}): SeedStars {
  if (input.defeated) return 0;
  const base = input.thresholds.filter((need) => input.correct >= need).length;
  if (base === 0) return 0;
  const penalized = input.mistakes >= SEED_PENALTY_MISTAKES ? base - 1 : base;
  return Math.max(1, penalized) as SeedStars;
}
