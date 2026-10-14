import { describe, expect, it } from "vitest";

import {
  generateProblem,
  generateProblems,
  isInPick,
  oneOf,
  pickNumber,
  range,
  satisfiesRule,
  tens,
  type ArithmeticRule,
} from "@/lib/game/problem-rules";

// 固定の乱数だと各数が同じ値から作られて相関し、境界の壊れを見逃す
// (以前の problem-generator.test.ts で実際に踏んだ)。実乱数で多数回確かめる。
const N = 2000;
const columns = (n: number) => String(n).split("").reverse().map(Number);
const ones = (n: number) => n % 10;
const sample = (rule: ArithmeticRule) => generateProblems(rule, N);

describe("pickNumber / isInPick", () => {
  it("range は両端を含む範囲から選ぶ", () => {
    const seen = new Set(Array.from({ length: N }, () => pickNumber(range(3, 5), Math.random)));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it("tens は10の倍数だけを選ぶ", () => {
    for (let i = 0; i < N; i++) {
      const value = pickNumber(tens(10, 90), Math.random);
      expect(value % 10).toBe(0);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(90);
    }
  });

  it("oneOf は指定した数だけを選び、どれも出る", () => {
    const seen = new Set(Array.from({ length: N }, () => pickNumber(oneOf(2, 5), Math.random)));
    expect([...seen].sort()).toEqual([2, 5]);
  });

  it("isInPick は範囲外・刻み違い・候補外を false にする", () => {
    expect(isInPick(20, tens(10, 90))).toBe(true);
    expect(isInPick(15, tens(10, 90))).toBe(false);
    expect(isInPick(100, range(1, 99))).toBe(false);
    expect(isInPick(3, oneOf(2, 5))).toBe(false);
  });
});

describe("たし算", () => {
  it("答えが正しく、数が範囲内", () => {
    for (const p of sample({ op: "add", a: range(1, 9), b: range(1, 9) })) {
      expect(p.operator).toBe("add");
      expect(p.answer).toBe(p.operandA + p.operandB);
      expect(p.operandA).toBeGreaterThanOrEqual(1);
      expect(p.operandA).toBeLessThanOrEqual(9);
    }
  });

  it("carry: none のとき、どの位も足して10未満", () => {
    for (const p of sample({ op: "add", a: range(10, 89), b: range(10, 89), carry: "none" })) {
      const ca = columns(p.operandA);
      const cb = columns(p.operandB);
      for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
        expect((ca[i] ?? 0) + (cb[i] ?? 0)).toBeLessThan(10);
      }
    }
  });

  it("carry: required のとき、一の位でくり上がる", () => {
    for (const p of sample({ op: "add", a: range(11, 89), b: range(2, 9), carry: "required" })) {
      expect(ones(p.operandA) + ones(p.operandB)).toBeGreaterThanOrEqual(10);
    }
  });

  it("minAnswer / maxAnswer を守る", () => {
    for (const p of sample({ op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 })) {
      expect(p.answer).toBeLessThanOrEqual(10);
    }
    for (const p of sample({ op: "add", a: range(10, 99), b: range(10, 99), minAnswer: 100 })) {
      expect(p.answer).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("ひき算", () => {
  it("範囲が重なっていても、答えはマイナスにならない", () => {
    for (const p of sample({ op: "sub", a: range(1, 20), b: range(1, 20) })) {
      expect(p.answer).toBe(p.operandA - p.operandB);
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("borrow: none のとき、どの位もひかれる数の数字 ≥ ひく数の数字", () => {
    for (const p of sample({ op: "sub", a: range(10, 99), b: range(10, 99), borrow: "none" })) {
      const ca = columns(p.operandA);
      const cb = columns(p.operandB);
      for (let i = 0; i < ca.length; i++) {
        expect(ca[i]).toBeGreaterThanOrEqual(cb[i] ?? 0);
      }
    }
  });

  it("borrow: required のとき、一の位でくり下がる", () => {
    for (const p of sample({ op: "sub", a: range(20, 99), b: range(2, 9), borrow: "required" })) {
      expect(ones(p.operandA)).toBeLessThan(ones(p.operandB));
    }
  });

  it("minAnswer を守る", () => {
    for (const p of sample({ op: "sub", a: range(20, 99), b: range(11, 89), minAnswer: 1 })) {
      expect(p.answer).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("かけ算", () => {
  it("carry: none のとき、ひとつ目の数の各位 × ふたつ目の数 が10未満", () => {
    for (const p of sample({ op: "mul", a: range(11, 44), b: range(2, 4), carry: "none" })) {
      expect(p.answer).toBe(p.operandA * p.operandB);
      for (const d of columns(p.operandA)) {
        expect(d * p.operandB).toBeLessThan(10);
      }
    }
  });

  it("carry: required のとき、どこかの位で10以上になる", () => {
    for (const p of sample({ op: "mul", a: range(12, 99), b: range(2, 9), carry: "required" })) {
      expect(columns(p.operandA).some((d) => d * p.operandB >= 10)).toBe(true);
    }
  });
});

describe("わり算", () => {
  it("必ず割り切れ、割る数と答えが範囲内", () => {
    for (const p of sample({ op: "div", divisor: range(2, 9), quotient: range(10, 49), maxDividend: 99 })) {
      expect(p.operator).toBe("div");
      expect(p.answer * p.operandB).toBe(p.operandA);
      expect(p.operandB).toBeGreaterThanOrEqual(2);
      expect(p.operandB).toBeLessThanOrEqual(9);
      expect(p.answer).toBeGreaterThanOrEqual(10);
      expect(p.operandA).toBeLessThanOrEqual(99);
    }
  });

  it("minDividend を守る", () => {
    for (const p of sample({ op: "div", divisor: range(2, 9), quotient: range(12, 99), minDividend: 100 })) {
      expect(p.operandA).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("mix（ボス）", () => {
  const rule: ArithmeticRule = {
    op: "mix",
    rules: [
      { op: "add", a: range(1, 1), b: range(1, 1) },
      { op: "add", a: range(5, 5), b: range(5, 5) },
    ],
  };

  it("各問題がどれかのルールに合い、どのルールも出る", () => {
    const answers = new Set(sample(rule).map((p) => p.answer));
    expect([...answers].sort((x, y) => x - y)).toEqual([2, 10]);
  });

  it("中身が空なら作れずエラーになる", () => {
    expect(() => generateProblem({ op: "mix", rules: [] })).toThrow();
  });
});

describe("satisfiesRule", () => {
  const rule: ArithmeticRule = { op: "add", a: range(1, 9), b: range(1, 9) };

  it("答えが間違っている問題は false", () => {
    expect(satisfiesRule({ operator: "add", operandA: 2, operandB: 3, answer: 6 }, rule)).toBe(false);
  });

  it("演算が違う問題は false", () => {
    expect(satisfiesRule({ operator: "sub", operandA: 3, operandB: 2, answer: 1 }, rule)).toBe(false);
  });

  it("合っている問題は true", () => {
    expect(satisfiesRule({ operator: "add", operandA: 2, operandB: 3, answer: 5 }, rule)).toBe(true);
  });
});

it("条件を満たせないルールはエラーになる（無限ループしない）", () => {
  expect(() => generateProblem({ op: "add", a: range(1, 1), b: range(1, 1), minAnswer: 5 })).toThrow();
});
