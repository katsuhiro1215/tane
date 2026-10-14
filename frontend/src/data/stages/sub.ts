import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// ひき算の答えは problem-rules 側でいつも0以上にそろえる
export const SUB_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "5までのひきざん", description: "1けた−1けた", rule: { op: "sub", a: range(2, 5), b: range(1, 5) } },
    { name: "10までのひきざん", description: "10までのかず", rule: { op: "sub", a: range(2, 10), b: range(1, 10) } },
    { name: "くりさがり", description: "10いくつ−1けた", rule: { op: "sub", a: range(11, 18), b: range(2, 9), borrow: "required" } },
    { name: "20まで まぜこぜ", description: "20までのかず", rule: { op: "sub", a: range(1, 20), b: range(1, 9) } },
    { name: "2けた−1けた", description: "くりさがり なし", rule: { op: "sub", a: range(10, 99), b: range(1, 9), borrow: "none" } },
    { name: "2けた−1けた", description: "くりさがり あり", rule: { op: "sub", a: range(20, 99), b: range(2, 9), borrow: "required" } },
    { name: "なんじゅう−なんじゅう", description: "10のまとまり", rule: { op: "sub", a: tens(10, 90), b: tens(10, 90) } },
    { name: "2けた−2けた", description: "くりさがり なし", rule: { op: "sub", a: range(10, 99), b: range(10, 99), borrow: "none" } },
    { name: "2けた−2けた", description: "くりさがり あり", rule: { op: "sub", a: range(20, 99), b: range(11, 89), borrow: "required", minAnswer: 1 } },
    { name: "100からひく", description: "100−2けた", rule: { op: "sub", a: oneOf(100), b: range(11, 99) } },
    { name: "3けた−2けた", description: "大きなかず", rule: { op: "sub", a: range(100, 999), b: range(10, 99) } },
  ],
  5,
  11
);
