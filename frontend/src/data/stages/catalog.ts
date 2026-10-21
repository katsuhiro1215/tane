import type { FlashRule } from "@/lib/game/flash-problem";
import type { ArithmeticRule } from "@/lib/game/problem-rules";
import { sorobanTargetMs, SOROBAN_PROBLEMS, type SorobanRule, type SorobanStageEvent } from "@/lib/game/soroban-rules";

import { ADD_STAGE_SPECS } from "./add";
import { colorForStage, type SpruColor } from "./colors";
import { DIV_STAGE_SPECS } from "./div";
import { FLASH_STAGE_SPECS } from "./flash";
import { MUL_STAGE_SPECS } from "./mul";
import { SHISOKU_GROUP_SIZE, SHISOKU_STAGE_SPECS, type SeedStageRule } from "./shisoku";
import { SOROBAN_STAGE_SPECS } from "./soroban";
import type { StageSpec } from "./spec";
import { SUB_STAGE_SPECS } from "./sub";

export type ModeId = "add" | "sub" | "mul" | "div" | "flash" | "soroban" | "shisoku";
export const MODE_IDS: readonly ModeId[] = ["add", "sub", "mul", "div", "flash", "soroban", "shisoku"];

export interface ModeDefinition {
  readonly id: ModeId;
  readonly label: string;
  readonly symbol: string | null;
}

export const MODES: Record<ModeId, ModeDefinition> = {
  add: { id: "add", label: "たしざん", symbol: "＋" },
  sub: { id: "sub", label: "ひきざん", symbol: "−" },
  mul: { id: "mul", label: "かけざん", symbol: "×" },
  div: { id: "div", label: "わりざん", symbol: "÷" },
  flash: { id: "flash", label: "フラッシュ", symbol: null },
  soroban: { id: "soroban", label: "そろばん", symbol: null },
  shisoku: { id: "shisoku", label: "たねまき", symbol: null },
};

export const PROBLEMS_PER_STAGE = 20;

// 1問の目安の秒数（設計書2.5）。フラッシュは答える時間だけ
export const SECONDS_PER_PROBLEM: Record<ModeId, readonly number[]> = {
  add: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
  sub: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
  mul: [4, 4, 4, 4, 4, 4, 5, 7, 7, 10, 12, 9],
  div: [5, 5, 5, 5, 5, 6, 8, 10, 12, 9, 14, 10],
  flash: [5, 5, 5, 6, 5, 8],
  // そろばんは級・種目の式で決めるので、ここは使わない（soroban-rules.ts の secondsFor）
  soroban: [],
  // しそくえんざんは種の降る時間（stage.rule.fallMs）で決めるので、ここは使わない
  shisoku: [],
};

interface StageBase {
  readonly id: string;
  readonly mode: ModeId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly color: SpruColor;
  readonly isBoss: boolean;
  readonly secondsPerProblem: number;
}

export interface ArithmeticStage extends StageBase {
  readonly kind: "arithmetic";
  readonly rule: ArithmeticRule;
}

export interface FlashStage extends StageBase {
  readonly kind: "flash";
  readonly rule: FlashRule;
}

export interface SorobanStage extends StageBase {
  readonly kind: "soroban";
  readonly grade: number;
  readonly event: SorobanStageEvent;
  readonly rule: SorobanRule;
}

export interface SeedStage extends StageBase {
  readonly kind: "seed";
  readonly rule: SeedStageRule;
}

export type Stage = ArithmeticStage | FlashStage | SorobanStage | SeedStage;

const BOSS_COLORS: Record<Exclude<ModeId, "soroban" | "shisoku">, SpruColor> = {
  add: "crystal",
  sub: "platinum",
  mul: "obsidian",
  div: "crystal",
  flash: "platinum",
};
const SOROBAN_BOSS_COLORS: readonly SpruColor[] = ["crystal", "platinum", "obsidian"];

function colorFor(mode: ModeId, index: number, isBoss: boolean): SpruColor {
  if (isBoss) {
    if (mode === "soroban") return SOROBAN_BOSS_COLORS[index % SOROBAN_BOSS_COLORS.length];
    if (mode !== "shisoku") return BOSS_COLORS[mode];
  }
  return colorForStage(MODE_IDS.indexOf(mode), index);
}

function build<R>(
  mode: ModeId,
  specs: readonly StageSpec<R>[],
  make: (base: StageBase, rule: R) => Stage
): Stage[] {
  return specs.map((spec, index) => {
    const isBoss = index === specs.length - 1;
    return make(
      {
        id: `${mode}-${index + 1}`,
        mode,
        number: index + 1,
        name: spec.name,
        description: spec.description,
        color: colorFor(mode, index, isBoss),
        isBoss,
        secondsPerProblem: SECONDS_PER_PROBLEM[mode][index] ?? 0,
      },
      spec.rule
    );
  });
}

const arithmetic = (base: StageBase, rule: ArithmeticRule): Stage => ({ ...base, kind: "arithmetic", rule });
const flash = (base: StageBase, rule: FlashRule): Stage => ({ ...base, kind: "flash", rule });

const seed: Stage[] = SHISOKU_STAGE_SPECS.map((spec, index) => ({
  id: `shisoku-${index + 1}`,
  mode: "shisoku",
  number: index + 1,
  name: spec.name,
  description: spec.description,
  color: colorFor("shisoku", index, false),
  isBoss: false,
  secondsPerProblem: spec.rule.fallMs / 1000,
  kind: "seed",
  rule: spec.rule,
}));

const soroban: Stage[] = SOROBAN_STAGE_SPECS.map((spec, index) => {
  const isBoss = spec.event === "mogi";
  const rule: SorobanRule = { grade: spec.grade, event: spec.event };
  return {
    id: `soroban-${index + 1}`,
    mode: "soroban",
    number: index + 1,
    name: spec.name,
    description: spec.description,
    color: colorFor("soroban", isBoss ? Math.floor(index / 3.5) : index, isBoss),
    isBoss,
    secondsPerProblem: sorobanTargetMs(rule) / 1000 / SOROBAN_PROBLEMS,
    kind: "soroban",
    grade: spec.grade,
    event: spec.event,
    rule,
  };
});

export const STAGES: readonly Stage[] = [
  ...build("add", ADD_STAGE_SPECS, arithmetic),
  ...build("sub", SUB_STAGE_SPECS, arithmetic),
  ...build("mul", MUL_STAGE_SPECS, arithmetic),
  ...build("div", DIV_STAGE_SPECS, arithmetic),
  ...build("flash", FLASH_STAGE_SPECS, flash),
  ...soroban,
  ...seed,
];

const STAGE_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));
const STAGES_BY_MODE = new Map(MODE_IDS.map((mode) => [mode, STAGES.filter((s) => s.mode === mode)]));

export function getStage(id: string): Stage | undefined {
  return STAGE_BY_ID.get(id);
}

export function stagesOfMode(mode: ModeId): readonly Stage[] {
  return STAGES_BY_MODE.get(mode) ?? [];
}

export function nextStageInMode(stage: Stage): Stage | undefined {
  // number は1始まりなので、そのまま次のステージの添字になる
  return stagesOfMode(stage.mode)[stage.number];
}

export function isModeId(value: string): value is ModeId {
  return (MODE_IDS as readonly string[]).includes(value);
}

export function playPath(stage: Stage): string {
  if (stage.kind === "soroban") return `/soroban/${stage.id}`;
  if (stage.kind === "seed") return `/seed/${stage.id}`;
  return stage.kind === "flash" ? `/flash/${stage.id}` : `/stage/${stage.id}`;
}

export function problemCount(stage: Stage): number {
  return stage.kind === "soroban" ? SOROBAN_PROBLEMS : PROBLEMS_PER_STAGE;
}

/** ★3に必要な目標タイム。時間なしのステージ（そろばんのみとりざん・かけざん・わりざん）は null で、ミスなしなら★3 */
export function stageTargetMs(stage: Stage): number | null {
  if (stage.kind === "soroban" && stage.event !== "mogi") return null;
  return targetMs(stage);
}

export function targetMs(stage: Stage): number {
  if (stage.kind === "soroban") return sorobanTargetMs(stage.rule);
  return stage.secondsPerProblem * 1000 * PROBLEMS_PER_STAGE;
}

/** そのステージで取れる★の最大。しそくえんざんだけ5 */
export function maxStars(stage: Stage): 3 | 5 {
  return stage.kind === "seed" ? 5 : 3;
}

/** 次のステージが開くのに必要な、このステージの★ */
export function unlockStars(stage: Stage): 1 | 3 {
  return stage.kind === "seed" ? 3 : 1;
}

/** しそくえんざんの番号。5番目のステージは「2-1」 */
function seedNumber(number: number): string {
  return `${Math.floor((number - 1) / SHISOKU_GROUP_SIZE) + 1}-${((number - 1) % SHISOKU_GROUP_SIZE) + 1}`;
}

/** 画面に出すステージの番号。しそくえんざんは「1-1」の形 */
export function displayNumber(stage: Stage): string {
  return stage.kind === "seed" ? seedNumber(stage.number) : String(stage.number);
}
