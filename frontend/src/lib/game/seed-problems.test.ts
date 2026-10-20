import { describe, expect, it } from "vitest";

import { oneOf, range, type ArithmeticRule } from "@/lib/game/problem-rules";
import { drawSeedProblem, toSeedProblem } from "@/lib/game/seed-problems";

describe("toSeedProblem", () => {
  it("4つの演算を式の文字と答えにする", () => {
    expect(toSeedProblem({ operator: "add", operandA: 3, operandB: 4, answer: 7 })).toEqual({ text: "3 ＋ 4", answer: 7 });
    expect(toSeedProblem({ operator: "sub", operandA: 9, operandB: 4, answer: 5 })).toEqual({ text: "9 − 4", answer: 5 });
    expect(toSeedProblem({ operator: "mul", operandA: 6, operandB: 7, answer: 42 })).toEqual({ text: "6 × 7", answer: 42 });
    expect(toSeedProblem({ operator: "div", operandA: 42, operandB: 7, answer: 6 })).toEqual({ text: "42 ÷ 7", answer: 6 });
  });
});

describe("drawSeedProblem", () => {
  const rule: ArithmeticRule = { op: "add", a: range(1, 9), b: range(1, 9) };

  it("避ける答えと式を出さない", () => {
    const bad: string[] = [];
    for (let i = 0; i < 200; i++) {
      const p = drawSeedProblem(rule, { answers: [5, 6, 7], texts: ["1 ＋ 1"] });
      if ([5, 6, 7].includes(p.answer) || p.text === "1 ＋ 1") bad.push(`${p.text}=${p.answer}`);
    }
    expect(bad).toEqual([]);
  });

  it("避けられないルールでも止まらず、避けずに返す", () => {
    const only: ArithmeticRule = { op: "add", a: oneOf(1), b: oneOf(1) };
    expect(drawSeedProblem(only, { answers: [2], texts: [] })).toEqual({ text: "1 ＋ 1", answer: 2 });
  });
});
