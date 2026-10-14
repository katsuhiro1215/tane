import type { StageStatus } from "@/lib/game/stage";

export type Stars = 0 | 1 | 2 | 3;
export type EarnedStars = 1 | 2 | 3;
export type Growth = "seed" | "sprout" | "bud" | "flower";

// 分割2で★3に「目標タイム以内」を足すときは、この関数だけを直す
export function starsForResult(status: StageStatus, mistakes: number): Stars {
  if (status !== "cleared") return 0;
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function mistakesOf(state: { currentIndex: number; correctCount: number }): number {
  return state.currentIndex - state.correctCount;
}

const GROWTH_BY_STARS: Record<Stars, Growth> = { 0: "seed", 1: "sprout", 2: "bud", 3: "flower" };

export function growthForStars(stars: Stars): Growth {
  return GROWTH_BY_STARS[stars];
}
