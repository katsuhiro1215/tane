import type { Stage } from "@/data/stages/catalog";
import type { StageStatus } from "@/lib/game/stage";

export type Stars = 0 | 1 | 2 | 3 | 4 | 5;
export type EarnedStars = 1 | 2 | 3 | 4 | 5;
export type Growth = "seed" | "sprout" | "bud" | "flower";

export interface StageResultInput {
  status: StageStatus;
  mistakes: number;
  elapsedMs: number;
  /** 時間の条件。null は時間なし（ミスなしなら★3） */
  targetMs: number | null;
}

export function starsForResult({ status, mistakes, elapsedMs, targetMs }: StageResultInput): Stars {
  if (status !== "cleared") return 0;
  if (mistakes === 0 && (targetMs === null || elapsedMs <= targetMs)) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/** ミスなしでクリアしたのに時間で★3を逃したとき、目標タイムを超えたミリ秒。それ以外は null */
export function missedThreeByMs({ status, mistakes, elapsedMs, targetMs }: StageResultInput): number | null {
  if (targetMs === null || status !== "cleared" || mistakes !== 0 || elapsedMs <= targetMs) return null;
  return elapsedMs - targetMs;
}

export function mistakesOf(state: { currentIndex: number; correctCount: number }): number {
  return state.currentIndex - state.correctCount;
}

const GROWTH_BY_STARS: Record<Stars, Growth> = { 0: "seed", 1: "sprout", 2: "bud", 3: "flower", 4: "flower", 5: "flower" };
// しそくえんざん（★5）の育ち。★3で初めてつぼみ、★4から花
const GROWTH_BY_SEED_STARS: Record<Stars, Growth> = { 0: "seed", 1: "sprout", 2: "sprout", 3: "bud", 4: "flower", 5: "flower" };

export function growthForStars(stars: Stars): Growth {
  return GROWTH_BY_STARS[stars];
}

/** ステージの育ち。しそくえんざんだけ、★の段階が違う */
export function growthForStage(stage: Stage, stars: Stars): Growth {
  return stage.kind === "seed" ? GROWTH_BY_SEED_STARS[stars] : growthForStars(stars);
}
