import { MODES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import { starsOf, type StarMap } from "@/lib/game/progression";
import type { Stars } from "@/lib/game/stars";

const NEXT_GROWTH: Record<Stars, string | null> = {
  0: null,
  1: "★2で つぼみに なるよ",
  2: "★3で はなが さくよ",
  3: "まんかい！",
};

export function nextGrowthText(stars: Stars): string | null {
  return NEXT_GROWTH[stars];
}

export interface ModeBloom {
  bloomed: number;
  total: number;
  complete: boolean;
  left: number;
}

/** あそびごとの「はな」（★3）の数。全員がはなになったらコンプリート */
export function modeBloom(mode: ModeId, stars: StarMap): ModeBloom {
  const list = stagesOfMode(mode);
  const bloomed = list.filter((stage) => starsOf(stars, stage.id) === 3).length;
  return { bloomed, total: list.length, complete: bloomed === list.length, left: list.length - bloomed };
}

function stageLabel(stage: Stage): string {
  return `${MODES[stage.mode].label} ${stage.number}`;
}

export function favoriteText(stage: Stage): string {
  return `${stage.name}（${stageLabel(stage)}）`;
}

export function unlockHint(stage: Stage): string {
  return `${stageLabel(stage)}を クリアすると なかまに なるよ`;
}
