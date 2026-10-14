import type { StageStatus } from "@/lib/game/stage";

export type Stars = 0 | 1 | 2 | 3;
export type EarnedStars = 1 | 2 | 3;
export type Growth = "seed" | "sprout" | "bud" | "flower";

export interface StageResultInput {
  status: StageStatus;
  mistakes: number;
  elapsedMs: number;
  targetMs: number;
}

export function starsForResult({ status, mistakes, elapsedMs, targetMs }: StageResultInput): Stars {
  if (status !== "cleared") return 0;
  if (mistakes === 0 && elapsedMs <= targetMs) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/** ミスなしでクリアしたのに時間で★3を逃したとき、目標タイムを超えたミリ秒。それ以外は null */
export function missedThreeByMs({ status, mistakes, elapsedMs, targetMs }: StageResultInput): number | null {
  if (status !== "cleared" || mistakes !== 0 || elapsedMs <= targetMs) return null;
  return elapsedMs - targetMs;
}

export function mistakesOf(state: { currentIndex: number; correctCount: number }): number {
  return state.currentIndex - state.correctCount;
}

const GROWTH_BY_STARS: Record<Stars, Growth> = { 0: "seed", 1: "sprout", 2: "bud", 3: "flower" };

export function growthForStars(stars: Stars): Growth {
  return GROWTH_BY_STARS[stars];
}
