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

/** 子どもに見せるステージの呼び方。そろばんは画面に番号を出していないので、級と種目で呼ぶ */
export function stageLabel(stage: Stage): string {
  if (stage.kind === "soroban") return stage.name;
  return `${MODES[stage.mode].label} ${stage.number}`;
}

export function favoriteText(stage: Stage): string {
  if (stage.kind === "soroban") return `${stage.name}（${stage.description}）`;
  return `${stage.name}（${stageLabel(stage)}）`;
}

/** ホームの「つづきから」の下に出す行き先 */
export function continueLabel(stage: Stage): string {
  if (stage.kind === "soroban") return `${MODES.soroban.label} ・ ${stage.name}`;
  return `${MODES[stage.mode].label} ステージ${stage.number} ・ ${stage.name}`;
}

export function unlockHint(stage: Stage): string {
  return `${stageLabel(stage)}を クリアすると なかまに なるよ`;
}
