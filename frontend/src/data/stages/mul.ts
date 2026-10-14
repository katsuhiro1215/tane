import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// 表示は「段 × かける数」(a が段)
export const MUL_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "2のだん・5のだん", description: "くく", rule: { op: "mul", a: oneOf(2, 5), b: range(1, 9) } },
    { name: "3のだん・4のだん", description: "くく", rule: { op: "mul", a: oneOf(3, 4), b: range(1, 9) } },
    { name: "6のだん・7のだん", description: "くく", rule: { op: "mul", a: oneOf(6, 7), b: range(1, 9) } },
    { name: "8のだん・9のだん", description: "くく", rule: { op: "mul", a: oneOf(8, 9), b: range(1, 9) } },
    { name: "1〜5のだん", description: "くく まぜこぜ", rule: { op: "mul", a: range(1, 5), b: range(1, 9) } },
    { name: "くく ぜんぶ", description: "くく まぜこぜ", rule: { op: "mul", a: range(1, 9), b: range(1, 9) } },
    { name: "なんじゅう×1けた", description: "10のまとまり", rule: { op: "mul", a: tens(10, 90), b: range(2, 9) } },
    { name: "2けた×1けた", description: "くりあがり なし", rule: { op: "mul", a: range(11, 44), b: range(2, 4), carry: "none" } },
    { name: "2けた×1けた", description: "くりあがり あり", rule: { op: "mul", a: range(12, 99), b: range(2, 9), carry: "required" } },
    { name: "3けた×1けた", description: "大きなかず", rule: { op: "mul", a: range(100, 999), b: range(2, 9) } },
    { name: "2けた×2けた", description: "10〜19", rule: { op: "mul", a: range(11, 19), b: range(11, 19) } },
  ],
  6,
  11
);
