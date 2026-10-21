import { describe, expect, it } from "vitest";

import { oneOf, range, type ArithmeticRule } from "@/lib/game/problem-rules";
import { drawBlankSeedProblem, drawSeedProblem, toBlankProblem, toSeedProblem } from "@/lib/game/seed-problems";

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

describe("虫食い（toBlankProblem / drawBlankSeedProblem）", () => {
  it("たし算・ひき算の、片方の数を？にして、その数が答えになる", () => {
    const add = { operator: "add", operandA: 3, operandB: 4, answer: 7 } as const;
    const sub = { operator: "sub", operandA: 9, operandB: 4, answer: 5 } as const;
    expect(toBlankProblem(add, () => 0.9)).toEqual({ text: "3 ＋ ？ ＝ 7", answer: 4 });
    expect(toBlankProblem(add, () => 0.1)).toEqual({ text: "？ ＋ 4 ＝ 7", answer: 3 });
    expect(toBlankProblem(sub, () => 0.9)).toEqual({ text: "9 − ？ ＝ 5", answer: 4 });
    expect(toBlankProblem(sub, () => 0.1)).toEqual({ text: "？ − 4 ＝ 5", answer: 9 });
  });

  it("かけ算・わり算も、片方の数を？にできる", () => {
    expect(toBlankProblem({ operator: "mul", operandA: 6, operandB: 7, answer: 42 }, () => 0.9)).toEqual({ text: "6 × ？ ＝ 42", answer: 7 });
    expect(toBlankProblem({ operator: "div", operandA: 42, operandB: 7, answer: 6 }, () => 0.1)).toEqual({ text: "？ ÷ 7 ＝ 6", answer: 42 });
  });

  it("drawBlankSeedProblem は、避ける答えと式を出さない", () => {
    const rule: ArithmeticRule = { op: "add", a: range(1, 9), b: range(1, 9) };
    const bad: string[] = [];
    for (let i = 0; i < 200; i++) {
      const p = drawBlankSeedProblem(rule, { answers: [3, 4], texts: [] });
      if ([3, 4].includes(p.answer) || !p.text.includes("？")) bad.push(p.text);
    }
    expect(bad).toEqual([]);
  });
});
