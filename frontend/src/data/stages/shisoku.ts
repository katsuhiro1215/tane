import { range, type ArithmeticRule } from "@/lib/game/problem-rules";

import { ADD_STAGE_SPECS } from "./add";
import { SUB_STAGE_SPECS } from "./sub";
import type { SeedThresholds } from "@/lib/game/seed-stars";

import type { StageSpec } from "./spec";

/** 種が降るステージの中身。数値はすべて初期値で、遊んでから直す（設計書4.3・4.5） */
export interface SeedStageRule {
  readonly rule: ArithmeticRule;
  /** 種が降りきるまでの時間（コンボ0のとき） */
  readonly fallMs: number;
  readonly simultaneous: 2 | 3;
  /** ★1〜★5に必要な正解数（1分） */
  readonly thresholds: SeedThresholds;
  /** 虫食いの問題にする */
  readonly blank?: boolean;
  /** 1問ずつ出す（降らない）。降る焦りがいらない、考える問題用 */
  readonly single?: boolean;
  /** 1分モードの制限時間。省略は60秒 */
  readonly roundMs?: number;
}

/** 1つのグループのステージ数。表示の番号は「グループ-その中の番号」（1-1〜1-4、2-1〜…） */
export const SHISOKU_GROUP_SIZE = 4;
export const SHISOKU_GROUP_NAMES = [
  "たしざん（きほん）",
  "ひきざん（きほん）",
  "たしざん・ひきざん ごちゃまぜ",
  "たしざんの むしくい",
  "ひきざんの むしくい",
] as const;

// グループ1は「たし算（きほん）」、グループ2は「ひき算（きほん）」。それぞれ今のたしざん・ひきざんの1〜4と同じ中身で、ゆっくり上げていく（Owner 決定）
const SUB_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 11000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 10000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 9000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
];

// グループ3は、たしざん1〜4とひきざん1〜4を、同じ番号どうしでまぜる。まぜると迷うので、降る時間は少し長め
const MIX_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 11000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 10500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 9500, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 9000, simultaneous: 2, thresholds: [6, 11, 16, 21, 26] },
];

// 虫食い（1＋？＝4）は、降らせず1問ずつ出して、2分で何問答えられるかで★を決める（Owner 決定）。fallMs は「速く答えたら点が多い」ための目安の時間
const BLANK_ROUND_MS = 120_000;
const BLANK_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 7000, simultaneous: 2, thresholds: [8, 13, 18, 23, 28], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 7000, simultaneous: 2, thresholds: [8, 13, 18, 23, 28], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 8000, simultaneous: 2, thresholds: [7, 12, 17, 22, 27], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 8000, simultaneous: 2, thresholds: [7, 12, 17, 22, 27], blank: true, single: true, roundMs: BLANK_ROUND_MS },
];

export const SHISOKU_STAGE_SPECS: StageSpec<SeedStageRule>[] = [
  {
    name: "こたえが5まで",
    description: SHISOKU_GROUP_NAMES[0],
    rule: { rule: { op: "add", a: range(1, 4), b: range(1, 4), maxAnswer: 5 }, fallMs: 11000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  },
  {
    name: "こたえが10まで",
    description: SHISOKU_GROUP_NAMES[0],
    rule: { rule: { op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 }, fallMs: 10000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  },
  {
    name: "くりあがり",
    description: SHISOKU_GROUP_NAMES[0],
    rule: { rule: { op: "add", a: range(2, 9), b: range(2, 9), minAnswer: 11 }, fallMs: 9000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  },
  {
    name: "1けた まぜこぜ",
    description: SHISOKU_GROUP_NAMES[0],
    rule: { rule: { op: "add", a: range(1, 9), b: range(1, 9) }, fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
  },
  ...SUB_STAGE_SPECS.slice(0, SHISOKU_GROUP_SIZE).map((spec, i) => ({
    name: spec.name,
    description: SHISOKU_GROUP_NAMES[1],
    rule: { rule: spec.rule, ...SUB_SEED[i] },
  })),
  ...ADD_STAGE_SPECS.slice(0, SHISOKU_GROUP_SIZE).map((spec, i) => ({
    name: `まぜこぜ ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[2],
    rule: { rule: { op: "mix" as const, rules: [spec.rule, SUB_STAGE_SPECS[i].rule] }, ...MIX_SEED[i] },
  })),
  ...ADD_STAGE_SPECS.slice(0, SHISOKU_GROUP_SIZE).map((spec, i) => ({
    name: `むしくい ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[3],
    rule: { rule: spec.rule, ...BLANK_SEED[i] },
  })),
  ...SUB_STAGE_SPECS.slice(0, SHISOKU_GROUP_SIZE).map((spec, i) => ({
    name: `むしくい ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[4],
    rule: { rule: spec.rule, ...BLANK_SEED[i] },
  })),
];
