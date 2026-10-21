import { displayNumber, MODES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import { starsOf, type StarMap } from "@/lib/game/progression";
import { growthForStage, type Stars } from "@/lib/game/stars";

const NEXT_GROWTH: Record<Stars, string | null> = {
  0: null,
  1: "★2で つぼみに なるよ",
  2: "★3で はなが さくよ",
  3: "まんかい！",
  4: "まんかい！",
  5: "まんかい！",
};

// しそくえんざんは★5まで。★3でつぼみ、★4で花、★5はきらきらの花
const NEXT_GROWTH_SEED: Record<Stars, string | null> = {
  0: null,
  1: "★3で つぼみに なるよ",
  2: "★3で つぼみに なるよ",
  3: "★4で はなが さくよ",
  4: "★5で きらきらの はなに！",
  5: "まんかい！",
};

export function nextGrowthText(stars: Stars, stage?: Stage): string | null {
  return stage?.kind === "seed" ? NEXT_GROWTH_SEED[stars] : NEXT_GROWTH[stars];
}

export interface ModeBloom {
  bloomed: number;
  total: number;
  complete: boolean;
  left: number;
}

/** あそびごとの「はな」（花まで育った子）の数。全員がはなになったらコンプリート */
export function modeBloom(mode: ModeId, stars: StarMap): ModeBloom {
  const list = stagesOfMode(mode);
  const bloomed = list.filter((stage) => growthForStage(stage, starsOf(stars, stage.id)) === "flower").length;
  return { bloomed, total: list.length, complete: bloomed === list.length, left: list.length - bloomed };
}

/** 子どもに見せるステージの呼び方。そろばんは画面に番号を出していないので、級と種目で呼ぶ */
export function stageLabel(stage: Stage): string {
  if (stage.kind === "soroban") return stage.name;
  return `${MODES[stage.mode].label} ${displayNumber(stage)}`;
}

export function favoriteText(stage: Stage): string {
  if (stage.kind === "soroban") return `${stage.name}（${stage.description}）`;
  return `${stage.name}（${stageLabel(stage)}）`;
}

/** ホームの「つづきから」の下に出す行き先 */
export function continueLabel(stage: Stage): string {
  if (stage.kind === "soroban") return `${MODES.soroban.label} ・ ${stage.name}`;
  return `${MODES[stage.mode].label} ステージ${displayNumber(stage)} ・ ${stage.name}`;
}

export function unlockHint(stage: Stage): string {
  return `${stageLabel(stage)}を クリアすると なかまに なるよ`;
}
