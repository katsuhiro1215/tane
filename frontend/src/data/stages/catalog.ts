import type { FlashRule } from "@/lib/game/flash-problem";
import type { ArithmeticRule } from "@/lib/game/problem-rules";

import { ADD_STAGE_SPECS } from "./add";
import { REGULAR_COLORS, type SpruColor } from "./colors";
import { DIV_STAGE_SPECS } from "./div";
import { FLASH_STAGE_SPECS } from "./flash";
import { MUL_STAGE_SPECS } from "./mul";
import type { StageSpec } from "./spec";
import { SUB_STAGE_SPECS } from "./sub";

export type ModeId = "add" | "sub" | "mul" | "div" | "flash";
export const MODE_IDS: readonly ModeId[] = ["add", "sub", "mul", "div", "flash"];

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
};

export const PROBLEMS_PER_STAGE = 20;

interface StageBase {
  readonly id: string;
  readonly mode: ModeId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly color: SpruColor;
  readonly isBoss: boolean;
}

export interface ArithmeticStage extends StageBase {
  readonly kind: "arithmetic";
  readonly rule: ArithmeticRule;
}

export interface FlashStage extends StageBase {
  readonly kind: "flash";
  readonly rule: FlashRule;
}

export type Stage = ArithmeticStage | FlashStage;

const BOSS_COLORS: Record<ModeId, SpruColor> = {
  add: "crystal",
  sub: "platinum",
  mul: "obsidian",
  div: "crystal",
  flash: "platinum",
};

function colorFor(mode: ModeId, index: number, isBoss: boolean): SpruColor {
  if (isBoss) return BOSS_COLORS[mode];
  // あそびごとに色の出だしをずらし、どのあそびでも1ステージ目が同じ色にならないようにする
  const offset = MODE_IDS.indexOf(mode) * 3;
  return REGULAR_COLORS[(offset + index) % REGULAR_COLORS.length];
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
      },
      spec.rule
    );
  });
}

const arithmetic = (base: StageBase, rule: ArithmeticRule): Stage => ({ ...base, kind: "arithmetic", rule });
const flash = (base: StageBase, rule: FlashRule): Stage => ({ ...base, kind: "flash", rule });

export const STAGES: readonly Stage[] = [
  ...build("add", ADD_STAGE_SPECS, arithmetic),
  ...build("sub", SUB_STAGE_SPECS, arithmetic),
  ...build("mul", MUL_STAGE_SPECS, arithmetic),
  ...build("div", DIV_STAGE_SPECS, arithmetic),
  ...build("flash", FLASH_STAGE_SPECS, flash),
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
  return stage.kind === "flash" ? `/flash/${stage.id}` : `/stage/${stage.id}`;
}
