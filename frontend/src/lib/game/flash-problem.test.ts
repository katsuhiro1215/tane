import { describe, expect, it } from "vitest";

import { generateFlashProblem, generateFlashStageProblems, type FlashRule } from "@/lib/game/flash-problem";

const N = 2000;
const rule = (count: number, digits: 1 | 2): FlashRule => ({ count, digits, stepMs: 700, gapMs: 200 });

describe("generateFlashProblem", () => {
  it("ルールの数だけ数を作り、答えは数列の合計", () => {
    for (const count of [3, 5, 7]) {
      const problem = generateFlashProblem(rule(count, 1));
      expect(problem.sequence).toHaveLength(count);
      expect(problem.answer).toBe(problem.sequence.reduce((sum, v) => sum + v, 0));
    }
  });

  it("1けたのルールでは、どの数も絶対値が1〜9", () => {
    for (let i = 0; i < N; i++) {
      for (const value of generateFlashProblem(rule(5, 1)).sequence) {
        expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(value)).toBeLessThanOrEqual(9);
      }
    }
  });

  it("2けたのルールでは、どの数も絶対値が10〜99", () => {
    for (let i = 0; i < N; i++) {
      for (const value of generateFlashProblem(rule(3, 2)).sequence) {
        expect(Math.abs(value)).toBeGreaterThanOrEqual(10);
        expect(Math.abs(value)).toBeLessThanOrEqual(99);
      }
    }
  });

  it("最初の数は必ず正", () => {
    for (let i = 0; i < N; i++) {
      expect(generateFlashProblem(rule(3, 2)).sequence[0]).toBeGreaterThan(0);
    }
  });

  it("どのルールでも、途中の合計が0未満にならない", () => {
    for (const r of [rule(5, 1), rule(7, 1), rule(3, 2)]) {
      for (let i = 0; i < N; i++) {
        let total = 0;
        for (const value of generateFlashProblem(r).sequence) {
          total += value;
          expect(total).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("数が2つ未満のルールはエラー", () => {
    expect(() => generateFlashProblem(rule(1, 1))).toThrow();
  });
});

describe("generateFlashStageProblems", () => {
  it("既定で20問作る", () => {
    expect(generateFlashStageProblems(rule(3, 1))).toHaveLength(20);
  });
});
