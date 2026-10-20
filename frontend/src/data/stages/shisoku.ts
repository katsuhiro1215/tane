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

// 最初のグループは「たし算（きほん）」。今のたしざん1〜4と同じ中身で、ゆっくり上げていく（Owner 決定）
export const SHISOKU_STAGE_SPECS: StageSpec<SeedStageRule>[] = [
  {
    name: "こたえが5まで",
    description: "1けた＋1けた",
    rule: { rule: { op: "add", a: range(1, 4), b: range(1, 4), maxAnswer: 5 }, fallMs: 11000, simultaneous: 2, thresholds: [5, 9, 13, 17, 21] },
  },
  {
    name: "こたえが10まで",
    description: "1けた＋1けた",
    rule: { rule: { op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 }, fallMs: 10000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  },
  {
    name: "くりあがり",
    description: "1けた＋1けた",
    rule: { rule: { op: "add", a: range(2, 9), b: range(2, 9), minAnswer: 11 }, fallMs: 9000, simultaneous: 2, thresholds: [6, 10, 14, 18, 22] },
  },
  {
    name: "1けた まぜこぜ",
    description: "1けた＋1けた",
    rule: { rule: { op: "add", a: range(1, 9), b: range(1, 9) }, fallMs: 8500, simultaneous: 2, thresholds: [7, 12, 17, 22, 27] },
  },
];
