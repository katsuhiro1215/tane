import { describe, expect, it } from "vitest";

import { generateFlashProblem, generateFlashStageProblems } from "@/lib/game/flash-problem";

describe("generateFlashProblem", () => {
  it("Lv.1は3個の数字を生成し、答えが数列の合計と一致する", () => {
    const problem = generateFlashProblem(1, () => 0.5);
    expect(problem.sequence).toHaveLength(3);
    const total = problem.sequence.reduce((sum, value) => sum + value, 0);
    expect(problem.answer).toBe(total);
  });

  it("Lv.2は4個、Lv.3は5個の数字を生成する", () => {
    expect(generateFlashProblem(2, () => 0.5).sequence).toHaveLength(4);
    expect(generateFlashProblem(3, () => 0.5).sequence).toHaveLength(5);
  });

  it("最初の数字は必ず正で1〜9の範囲", () => {
    const rngValues = [0, 0.1, 0.5, 0.9, 0.99];
    for (const rngValue of rngValues) {
      const problem = generateFlashProblem(1, () => rngValue);
      expect(problem.sequence[0]).toBeGreaterThanOrEqual(1);
      expect(problem.sequence[0]).toBeLessThanOrEqual(9);
    }
  });

  it("未対応のlevelを渡すとエラーになる", () => {
    expect(() => generateFlashProblem(4, () => 0)).toThrow();
  });
});

describe("generateFlashProblem (実際の乱数を通した検証)", () => {
  // 固定rngだと各要素が同じ乱数値から導出され相関してしまい、
  // 途中合計が負になる境界条件の破壊を検出できない
  // (problem-generator.test.tsで実際に踏んだ教訓)。実乱数で多数回検証する。
  const ITERATIONS = 2000;

  it("どのレベルでも、途中の合計がどの時点でも0未満にならない", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateFlashProblem(level);
        let runningTotal = 0;
        for (const value of problem.sequence) {
          runningTotal += value;
          expect(runningTotal).toBeGreaterThanOrEqual(0);
        }
        expect(problem.answer).toBe(runningTotal);
      }
    }
  });

  it("どのレベルでも、各数字の絶対値は1〜9の範囲に収まる", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateFlashProblem(level);
        for (const value of problem.sequence) {
          expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(value)).toBeLessThanOrEqual(9);
        }
      }
    }
  });
});

describe("generateFlashStageProblems", () => {
  it("指定した問数ぶんの問題を生成する", () => {
    const problems = generateFlashStageProblems(1, 20, () => 0.5);
    expect(problems).toHaveLength(20);
    for (const problem of problems) {
      const total = problem.sequence.reduce((sum, value) => sum + value, 0);
      expect(problem.answer).toBe(total);
    }
  });
});
