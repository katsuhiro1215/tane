import { describe, expect, it } from "vitest";

import { generateProblem, generateStageProblems } from "@/lib/game/problem-generator";

describe("generateProblem", () => {
  it("たし算Lv.1は1〜9の数字同士で、答えが正しい", () => {
    const problem = generateProblem("add", 1, () => 0);
    expect(problem.operandA).toBeGreaterThanOrEqual(1);
    expect(problem.operandA).toBeLessThanOrEqual(9);
    expect(problem.operandB).toBeGreaterThanOrEqual(1);
    expect(problem.operandB).toBeLessThanOrEqual(9);
    expect(problem.answer).toBe(problem.operandA + problem.operandB);
  });

  it("ひき算はどのレベルでも答えが負にならない", () => {
    const rngValues = [0, 0.1, 0.5, 0.9, 0.99];
    for (const level of [1, 2, 3]) {
      for (const rngValue of rngValues) {
        const problem = generateProblem("sub", level, () => rngValue);
        expect(problem.operandA).toBeGreaterThanOrEqual(problem.operandB);
        expect(problem.answer).toBe(problem.operandA - problem.operandB);
        expect(problem.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("わり算はどのレベルでも割り切れる（余りが出ない）", () => {
    const rngValues = [0, 0.1, 0.5, 0.9, 0.99];
    for (const level of [1, 2, 3]) {
      for (const rngValue of rngValues) {
        const problem = generateProblem("div", level, () => rngValue);
        expect(problem.operandB).not.toBe(0);
        expect(problem.operandA % problem.operandB).toBe(0);
        expect(problem.answer).toBe(problem.operandA / problem.operandB);
      }
    }
  });

  it("かけ算Lv.1は九九の範囲で、答えが正しい", () => {
    const problem = generateProblem("mul", 1, () => 0.99);
    expect(problem.operandA).toBeGreaterThanOrEqual(1);
    expect(problem.operandA).toBeLessThanOrEqual(9);
    expect(problem.operandB).toBeGreaterThanOrEqual(1);
    expect(problem.operandB).toBeLessThanOrEqual(9);
    expect(problem.answer).toBe(problem.operandA * problem.operandB);
  });

  it("未対応のlevelを渡すとエラーになる", () => {
    expect(() => generateProblem("add", 4, () => 0)).toThrow();
  });
});

describe("generateProblem (実際の乱数を通した検証)", () => {
  // 上のテストは固定値rngのため、operandAとoperandBが同じ乱数値から
  // 導出され常に相関してしまい、境界条件が崩れても検出できない
  // (例: sub Lv.3でoperandB > operandAになる実装バグを混入しても、
  // 固定rngのテストだけでは通ってしまう)。実際の乱数で多数回検証する。
  const ITERATIONS = 2000;

  it("ひき算は乱数を通しても答えが負にならない", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem("sub", level);
        expect(problem.operandA).toBeGreaterThanOrEqual(problem.operandB);
        expect(problem.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("わり算は乱数を通しても割り切れる（余りが出ない）", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem("div", level);
        expect(problem.operandB).not.toBe(0);
        expect(problem.operandA % problem.operandB).toBe(0);
      }
    }
  });
});

describe("generateStageProblems", () => {
  it("指定した問数ぶんの問題を生成する", () => {
    const problems = generateStageProblems("add", 1, 20, () => 0.5);
    expect(problems).toHaveLength(20);
    for (const problem of problems) {
      expect(problem.answer).toBe(problem.operandA + problem.operandB);
    }
  });
});
