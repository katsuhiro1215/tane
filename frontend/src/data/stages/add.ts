import { range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

export const ADD_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "こたえが5まで", description: "1けた＋1けた", rule: { op: "add", a: range(1, 4), b: range(1, 4), maxAnswer: 5 } },
    { name: "こたえが10まで", description: "1けた＋1けた", rule: { op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 } },
    { name: "くりあがり", description: "1けた＋1けた", rule: { op: "add", a: range(2, 9), b: range(2, 9), minAnswer: 11 } },
    { name: "1けた まぜこぜ", description: "1けた＋1けた", rule: { op: "add", a: range(1, 9), b: range(1, 9) } },
    { name: "2けた＋1けた", description: "くりあがり なし", rule: { op: "add", a: range(10, 89), b: range(1, 9), carry: "none" } },
    { name: "2けた＋1けた", description: "くりあがり あり", rule: { op: "add", a: range(11, 89), b: range(2, 9), carry: "required" } },
    { name: "なんじゅう＋なんじゅう", description: "10のまとまり", rule: { op: "add", a: tens(10, 90), b: tens(10, 90) } },
    { name: "2けた＋2けた", description: "くりあがり なし", rule: { op: "add", a: range(10, 89), b: range(10, 89), carry: "none" } },
    { name: "2けた＋2けた", description: "くりあがり あり", rule: { op: "add", a: range(11, 89), b: range(11, 89), carry: "required", maxAnswer: 99 } },
    { name: "100をこえる", description: "2けた＋2けた", rule: { op: "add", a: range(10, 99), b: range(10, 99), minAnswer: 100 } },
    { name: "3けた＋2けた", description: "大きなかず", rule: { op: "add", a: range(100, 899), b: range(10, 99) } },
  ],
  5,
  11
);
