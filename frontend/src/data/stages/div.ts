import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// 割る数と答えから作るので、いつも割り切れる
export const DIV_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "2・5のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(2, 5), quotient: range(1, 9) } },
    { name: "3・4のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(3, 4), quotient: range(1, 9) } },
    { name: "6・7のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(6, 7), quotient: range(1, 9) } },
    { name: "8・9のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(8, 9), quotient: range(1, 9) } },
    { name: "くくのわりざん ぜんぶ", description: "まぜこぜ", rule: { op: "div", divisor: range(1, 9), quotient: range(1, 9) } },
    { name: "なんじゅう÷1けた", description: "10のまとまり", rule: { op: "div", divisor: range(2, 9), quotient: tens(10, 40), maxDividend: 90 } },
    { name: "2けた÷1けた", description: "こたえ 2けた", rule: { op: "div", divisor: range(2, 9), quotient: range(10, 49), maxDividend: 99 } },
    { name: "3けた÷1けた", description: "こたえ 2けた", rule: { op: "div", divisor: range(2, 9), quotient: range(12, 99), minDividend: 100 } },
    { name: "3けた÷1けた", description: "こたえ 3けた", rule: { op: "div", divisor: range(2, 9), quotient: range(100, 499), maxDividend: 999 } },
    { name: "2けた÷2けた", description: "2けたでわる", rule: { op: "div", divisor: range(11, 49), quotient: range(2, 9), maxDividend: 99 } },
    { name: "3けた÷2けた", description: "大きなかず", rule: { op: "div", divisor: range(11, 30), quotient: range(5, 30), minDividend: 100, maxDividend: 999 } },
  ],
  6,
  11
);
