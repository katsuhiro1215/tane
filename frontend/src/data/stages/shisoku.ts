import { range, type ArithmeticRule } from "@/lib/game/problem-rules";
import type { DivModRule } from "@/lib/game/remainder-division";

import { ADD_STAGE_SPECS } from "./add";
import { DIV_STAGE_SPECS } from "./div";
import { MUL_STAGE_SPECS } from "./mul";
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
  /** 筆算（縦書き）で表示する */
  readonly layout?: "flat" | "column";
  /** あまりのあるわり算（商とあまりを別々に答える、降らない専用の遊び）。あるときは rule.rule は使わない */
  readonly pair?: DivModRule;
}

/** 1つのグループのステージ数。表示の番号は「グループ-その中の番号」（1-1〜1-4、2-1〜…） */
export const SHISOKU_GROUP_SIZE = 4;
export const SHISOKU_GROUP_NAMES = [
  "たしざん（きほん）",
  "ひきざん（きほん）",
  "たしざん・ひきざん ごちゃまぜ",
  "たしざんの むしくい",
  "ひきざんの むしくい",
  "たしざん2けた（ひっさん）",
  "ひきざん2けた（ひっさん）",
  "たしひき2けた ごちゃまぜ",
  "たしひき2けたの むしくい",
  "かけざん くく",
  "かけざん くく ぜんぶ",
  "わりざん くく",
  "わりざん くく ぜんぶ",
  "かけざん・わりざん ごちゃまぜ",
  "かけざん ひっさん",
  "わりざん あまりあり（かんたん）",
  "たしざん・ひきざん3けた",
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

// グループ6・7は「2けたの筆算（ひっさん）」。たしざん・ひきざんの5・6・8・9番（0始まり添字4,5,7,8）を縦書きで
const COLUMN2_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 10000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21], layout: "column" },
  { fallMs: 10000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21], layout: "column" },
  { fallMs: 9500, simultaneous: 2, thresholds: [4, 7, 10, 13, 16], layout: "column" },
  { fallMs: 9500, simultaneous: 2, thresholds: [4, 7, 10, 13, 16], layout: "column" },
];

// グループ8「たしひき2けた ごちゃまぜ」。同じ番号どうしで混ぜる（ふつうの式）
const MIX2_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 9000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 9000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 8500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 8500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
];

// グループ9「たしひき2けたの むしくい」
const BLANK2_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 7500, simultaneous: 2, thresholds: [6, 10, 14, 18, 22], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 7500, simultaneous: 2, thresholds: [6, 10, 14, 18, 22], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 7000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21], blank: true, single: true, roundMs: BLANK_ROUND_MS },
  { fallMs: 7000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21], blank: true, single: true, roundMs: BLANK_ROUND_MS },
];

// 2けた±1けた・2けた±2けたの4段（0始まり添字4,5,7,8）
const ADD2 = [4, 5, 7, 8].map((i) => ADD_STAGE_SPECS[i]);
const SUB2 = [4, 5, 7, 8].map((i) => SUB_STAGE_SPECS[i]);

const G6_G9: StageSpec<SeedStageRule>[] = [
  ...ADD2.map((spec, i) => ({
    name: `ひっさん ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[5],
    rule: { rule: spec.rule, ...COLUMN2_SEED[i] },
  })),
  ...SUB2.map((spec, i) => ({
    name: `ひっさん ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[6],
    rule: { rule: spec.rule, ...COLUMN2_SEED[i] },
  })),
  ...ADD2.map((spec, i) => ({
    name: `まぜこぜ ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[7],
    rule: { rule: { op: "mix" as const, rules: [spec.rule, SUB2[i].rule] }, ...MIX2_SEED[i] },
  })),
  ...[ADD2[2], ADD2[3], SUB2[2], SUB2[3]].map((spec, i) => ({
    name: `むしくい ${spec.name}`,
    description: SHISOKU_GROUP_NAMES[8],
    rule: { rule: spec.rule, ...BLANK2_SEED[i] },
  })),
];

// グループ10「かけざん くく」・11「かけざん くく ぜんぶ」
const MUL_KUKU_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
  { fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
  { fallMs: 8000, simultaneous: 2, thresholds: [6, 11, 16, 21, 26] },
  { fallMs: 8000, simultaneous: 2, thresholds: [6, 11, 16, 21, 26] },
];
const MUL_ZENBU_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 7500, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 7500, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 7500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7000, simultaneous: 3, thresholds: [5, 9, 13, 17, 21] },
];

// グループ12「わりざん くく」・13「わりざん くく ぜんぶ」
const DIV_KUKU_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 8500, simultaneous: 2, thresholds: [6, 11, 16, 21, 26] },
  { fallMs: 8500, simultaneous: 2, thresholds: [6, 11, 16, 21, 26] },
  { fallMs: 8000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 8000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
];
const DIV_ZENBU_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 7500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7000, simultaneous: 3, thresholds: [4, 7, 10, 13, 16] },
  { fallMs: 7000, simultaneous: 2, thresholds: [7, 12, 17, 22, 27], blank: true, single: true, roundMs: BLANK_ROUND_MS },
];

const G10_G13: StageSpec<SeedStageRule>[] = [
  ...[0, 1, 2, 3].map((i) => ({
    name: MUL_STAGE_SPECS[i].name,
    description: SHISOKU_GROUP_NAMES[9],
    rule: { rule: MUL_STAGE_SPECS[i].rule, ...MUL_KUKU_SEED[i] },
  })),
  {
    name: MUL_STAGE_SPECS[4].name,
    description: SHISOKU_GROUP_NAMES[10],
    rule: { rule: MUL_STAGE_SPECS[4].rule, ...MUL_ZENBU_SEED[0] },
  },
  {
    name: MUL_STAGE_SPECS[5].name,
    description: SHISOKU_GROUP_NAMES[10],
    rule: { rule: MUL_STAGE_SPECS[5].rule, ...MUL_ZENBU_SEED[1] },
  },
  {
    name: MUL_STAGE_SPECS[6].name,
    description: SHISOKU_GROUP_NAMES[10],
    rule: { rule: MUL_STAGE_SPECS[6].rule, ...MUL_ZENBU_SEED[2] },
  },
  {
    name: "まぜこぜ ぜんぶ",
    description: SHISOKU_GROUP_NAMES[10],
    rule: {
      rule: { op: "mix" as const, rules: [MUL_STAGE_SPECS[4].rule, MUL_STAGE_SPECS[5].rule, MUL_STAGE_SPECS[6].rule] },
      ...MUL_ZENBU_SEED[3],
    },
  },
  ...[0, 1, 2, 3].map((i) => ({
    name: DIV_STAGE_SPECS[i].name,
    description: SHISOKU_GROUP_NAMES[11],
    rule: { rule: DIV_STAGE_SPECS[i].rule, ...DIV_KUKU_SEED[i] },
  })),
  {
    name: DIV_STAGE_SPECS[4].name,
    description: SHISOKU_GROUP_NAMES[12],
    rule: { rule: DIV_STAGE_SPECS[4].rule, ...DIV_ZENBU_SEED[0] },
  },
  {
    name: DIV_STAGE_SPECS[5].name,
    description: SHISOKU_GROUP_NAMES[12],
    rule: { rule: DIV_STAGE_SPECS[5].rule, ...DIV_ZENBU_SEED[1] },
  },
  {
    name: "まぜこぜ ぜんぶ",
    description: SHISOKU_GROUP_NAMES[12],
    rule: {
      rule: {
        op: "mix" as const,
        rules: [DIV_STAGE_SPECS[0].rule, DIV_STAGE_SPECS[1].rule, DIV_STAGE_SPECS[2].rule, DIV_STAGE_SPECS[3].rule],
      },
      ...DIV_ZENBU_SEED[2],
    },
  },
  {
    name: `むしくい ${DIV_STAGE_SPECS[4].name}`,
    description: SHISOKU_GROUP_NAMES[12],
    rule: { rule: DIV_STAGE_SPECS[4].rule, ...DIV_ZENBU_SEED[3] },
  },
];

// グループ14「かけざん・わりざん ごちゃまぜ」
const MULDIV_MIX_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 8000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  { fallMs: 7500, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7000, simultaneous: 3, thresholds: [4, 7, 10, 13, 16] },
];

// グループ15「かけざん ひっさん」
const MUL_COLUMN_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 9500, simultaneous: 2, thresholds: [5, 8, 11, 14, 17], layout: "column" },
  { fallMs: 9500, simultaneous: 2, thresholds: [5, 8, 11, 14, 17], layout: "column" },
  { fallMs: 9000, simultaneous: 2, thresholds: [4, 7, 10, 13, 16], layout: "column" },
  { fallMs: 9000, simultaneous: 2, thresholds: [4, 7, 10, 13, 16], layout: "column" },
];

// グループ16「わりざん あまりあり（かんたん）」。商とあまりを別々に答える（降らない）
const DIV_MOD_SIMULTANEOUS: 2 | 3 = 2;
const DIV_MOD_EASY_PAIRS: DivModRule[] = [
  { divisor: range(2, 4), quotient: range(2, 6) },
  { divisor: range(2, 6), quotient: range(2, 7) },
  { divisor: range(3, 7), quotient: range(2, 8) },
  { divisor: range(2, 9), quotient: range(2, 9) },
];
const DIV_MOD_EASY_THRESHOLDS: SeedThresholds[] = [
  [4, 7, 10, 13, 16],
  [4, 7, 10, 13, 16],
  [3, 6, 9, 12, 15],
  [3, 6, 9, 12, 15],
];
const DIV_MOD_EASY_FALL_MS = [8000, 8000, 7500, 7500];

// グループ17「たしざん・ひきざん3けた」
const BIG3_SEED: Omit<SeedStageRule, "rule">[] = [
  { fallMs: 8000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 8000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  { fallMs: 7500, simultaneous: 2, thresholds: [4, 7, 10, 13, 16] },
  { fallMs: 7500, simultaneous: 2, thresholds: [4, 7, 10, 13, 16] },
];

const G14_G17: StageSpec<SeedStageRule>[] = [
  {
    name: "まぜこぜ 2・5だん",
    description: SHISOKU_GROUP_NAMES[13],
    rule: {
      rule: { op: "mix" as const, rules: [MUL_STAGE_SPECS[0].rule, DIV_STAGE_SPECS[0].rule] },
      ...MULDIV_MIX_SEED[0],
    },
  },
  {
    name: "まぜこぜ 6・7だん",
    description: SHISOKU_GROUP_NAMES[13],
    rule: {
      rule: { op: "mix" as const, rules: [MUL_STAGE_SPECS[2].rule, DIV_STAGE_SPECS[2].rule] },
      ...MULDIV_MIX_SEED[1],
    },
  },
  {
    name: "まぜこぜ くくぜんぶ",
    description: SHISOKU_GROUP_NAMES[13],
    rule: {
      rule: { op: "mix" as const, rules: [MUL_STAGE_SPECS[5].rule, DIV_STAGE_SPECS[4].rule] },
      ...MULDIV_MIX_SEED[2],
    },
  },
  {
    name: "まぜこぜ なんじゅう",
    description: SHISOKU_GROUP_NAMES[13],
    rule: {
      rule: { op: "mix" as const, rules: [MUL_STAGE_SPECS[6].rule, DIV_STAGE_SPECS[5].rule] },
      ...MULDIV_MIX_SEED[3],
    },
  },
  ...[6, 7, 8, 9].map((i, j) => ({
    name: `ひっさん ${MUL_STAGE_SPECS[i].name}`,
    description: SHISOKU_GROUP_NAMES[14],
    rule: { rule: MUL_STAGE_SPECS[i].rule, ...MUL_COLUMN_SEED[j] },
  })),
  ...DIV_MOD_EASY_PAIRS.map((pair, i) => ({
    name: "あまりのある わりざん",
    description: SHISOKU_GROUP_NAMES[15],
    rule: {
      rule: { op: "div" as const, divisor: pair.divisor, quotient: pair.quotient },
      fallMs: DIV_MOD_EASY_FALL_MS[i],
      simultaneous: DIV_MOD_SIMULTANEOUS,
      thresholds: DIV_MOD_EASY_THRESHOLDS[i],
      roundMs: BLANK_ROUND_MS,
      pair,
    },
  })),
  ...[9, 10].map((i, j) => ({
    name: ADD_STAGE_SPECS[i].name,
    description: SHISOKU_GROUP_NAMES[16],
    rule: { rule: ADD_STAGE_SPECS[i].rule, ...BIG3_SEED[j] },
  })),
  ...[9, 10].map((i, j) => ({
    name: SUB_STAGE_SPECS[i].name,
    description: SHISOKU_GROUP_NAMES[16],
    rule: { rule: SUB_STAGE_SPECS[i].rule, ...BIG3_SEED[j + 2] },
  })),
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
  ...G6_G9,
  ...G10_G13,
  ...G14_G17,
];

