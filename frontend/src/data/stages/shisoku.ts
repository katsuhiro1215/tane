import { range, type ArithmeticRule } from "@/lib/game/problem-rules";
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
}

const ADD_1: ArithmeticRule = { op: "add", a: range(1, 9), b: range(1, 9) };
const SUB_1: ArithmeticRule = { op: "sub", a: range(2, 9), b: range(1, 9) };
const ADD_2: ArithmeticRule = { op: "add", a: range(10, 99), b: range(10, 99) };
const SUB_2: ArithmeticRule = { op: "sub", a: range(20, 99), b: range(10, 89) };
const MUL: ArithmeticRule = { op: "mul", a: range(2, 9), b: range(2, 9) };
const DIV: ArithmeticRule = { op: "div", divisor: range(2, 9), quotient: range(2, 9) };

export const SHISOKU_STAGE_SPECS: StageSpec<SeedStageRule>[] = [
  {
    name: "たしひき 1けた",
    description: "1けた",
    rule: { rule: { op: "mix", rules: [ADD_1, SUB_1] }, fallMs: 9000, simultaneous: 2, thresholds: [8, 14, 20, 26, 32] },
  },
  {
    name: "たしひき 2けた",
    description: "2けた",
    rule: { rule: { op: "mix", rules: [ADD_2, SUB_2] }, fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
  },
  {
    name: "かけわり くく",
    description: "九九",
    rule: { rule: { op: "mix", rules: [MUL, DIV] }, fallMs: 7500, simultaneous: 3, thresholds: [7, 12, 17, 22, 27] },
  },
  {
    name: "しそく ごちゃまぜ",
    description: "ぜんぶ",
    rule: { rule: { op: "mix", rules: [ADD_2, SUB_2, MUL, DIV] }, fallMs: 6000, simultaneous: 3, thresholds: [6, 10, 14, 19, 24] },
  },
];
