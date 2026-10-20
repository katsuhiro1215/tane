export type Operator = "add" | "sub" | "mul" | "div";

export const OPERATOR_SYMBOL: Record<Operator, string> = { add: "＋", sub: "−", mul: "×", div: "÷" };

export interface Problem {
  operator: Operator;
  operandA: number;
  operandB: number;
  answer: number;
}

export type NumberPick =
  | { readonly min: number; readonly max: number; readonly step?: number }
  | { readonly oneOf: readonly number[] };

export type CarryCondition = "none" | "required";

type SingleRule =
  | {
      readonly op: "add";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly carry?: CarryCondition;
      readonly minAnswer?: number;
      readonly maxAnswer?: number;
    }
  | {
      readonly op: "sub";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly borrow?: CarryCondition;
      readonly minAnswer?: number;
    }
  | {
      readonly op: "mul";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly carry?: CarryCondition;
    }
  | {
      readonly op: "div";
      readonly divisor: NumberPick;
      readonly quotient: NumberPick;
      readonly minDividend?: number;
      readonly maxDividend?: number;
    };

export type ArithmeticRule = SingleRule | { readonly op: "mix"; readonly rules: readonly ArithmeticRule[] };

export const MAX_ANSWER = 9999;
const MAX_ATTEMPTS = 1000;

export function range(min: number, max: number): NumberPick {
  return { min, max };
}

export function tens(min: number, max: number): NumberPick {
  return { min, max, step: 10 };
}

export function oneOf(...values: number[]): NumberPick {
  return { oneOf: values };
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickNumber(pick: NumberPick, rng: () => number): number {
  if ("oneOf" in pick) {
    return pick.oneOf[randomInt(0, pick.oneOf.length - 1, rng)];
  }
  const step = pick.step ?? 1;
  const count = Math.floor((pick.max - pick.min) / step) + 1;
  return pick.min + step * randomInt(0, count - 1, rng);
}

export function isInPick(value: number, pick: NumberPick): boolean {
  if ("oneOf" in pick) {
    return pick.oneOf.includes(value);
  }
  const step = pick.step ?? 1;
  return value >= pick.min && value <= pick.max && (value - pick.min) % step === 0;
}

/** 一の位から順に並べた各位の数字 */
function digitsOf(n: number): number[] {
  return String(n).split("").reverse().map(Number);
}

function addCarry(a: number, b: number): { any: boolean; ones: boolean } {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let any = false;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    if ((da[i] ?? 0) + (db[i] ?? 0) >= 10) any = true;
  }
  return { any, ones: (da[0] ?? 0) + (db[0] ?? 0) >= 10 };
}

function subBorrow(a: number, b: number): { any: boolean; ones: boolean } {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return {
    any: da.some((d, i) => d < (db[i] ?? 0)),
    ones: (da[0] ?? 0) < (db[0] ?? 0),
  };
}

function mulCarry(a: number, b: number): boolean {
  return digitsOf(a).some((d) => d * b >= 10);
}

function matchesCondition(condition: CarryCondition | undefined, any: boolean, ones: boolean): boolean {
  if (condition === "none") return !any;
  if (condition === "required") return ones;
  return true;
}

export function satisfiesRule(problem: Problem, rule: ArithmeticRule): boolean {
  if (rule.op === "mix") {
    return rule.rules.some((inner) => satisfiesRule(problem, inner));
  }
  if (problem.operator !== rule.op) return false;
  const { operandA: a, operandB: b, answer } = problem;
  if (!Number.isInteger(answer) || answer < 0 || answer > MAX_ANSWER) return false;

  switch (rule.op) {
    case "add": {
      if (answer !== a + b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      if (rule.minAnswer !== undefined && answer < rule.minAnswer) return false;
      if (rule.maxAnswer !== undefined && answer > rule.maxAnswer) return false;
      const carry = addCarry(a, b);
      return matchesCondition(rule.carry, carry.any, carry.ones);
    }
    case "sub": {
      if (answer !== a - b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      if (rule.minAnswer !== undefined && answer < rule.minAnswer) return false;
      const borrow = subBorrow(a, b);
      return matchesCondition(rule.borrow, borrow.any, borrow.ones);
    }
    case "mul": {
      if (answer !== a * b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      const carry = mulCarry(a, b);
      return matchesCondition(rule.carry, carry, carry);
    }
    case "div": {
      if (b === 0 || answer * b !== a) return false;
      if (!isInPick(b, rule.divisor) || !isInPick(answer, rule.quotient)) return false;
      if (rule.minDividend !== undefined && a < rule.minDividend) return false;
      if (rule.maxDividend !== undefined && a > rule.maxDividend) return false;
      return true;
    }
  }
}

function drawCandidate(rule: SingleRule, rng: () => number): Problem {
  switch (rule.op) {
    case "add": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "add", operandA: a, operandB: b, answer: a + b };
    }
    case "sub": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "sub", operandA: a, operandB: b, answer: a - b };
    }
    case "mul": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "mul", operandA: a, operandB: b, answer: a * b };
    }
    case "div": {
      const divisor = pickNumber(rule.divisor, rng);
      const quotient = pickNumber(rule.quotient, rng);
      return { operator: "div", operandA: divisor * quotient, operandB: divisor, answer: quotient };
    }
  }
}

export function generateProblem(rule: ArithmeticRule, rng: () => number = Math.random): Problem {
  if (rule.op === "mix") {
    if (rule.rules.length === 0) {
      throw new Error("mix rule needs at least one rule");
    }
    return generateProblem(rule.rules[randomInt(0, rule.rules.length - 1, rng)], rng);
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = drawCandidate(rule, rng);
    if (satisfiesRule(candidate, rule)) {
      return candidate;
    }
  }
  throw new Error(`No problem satisfies rule: ${JSON.stringify(rule)}`);
}

export function generateProblems(
  rule: ArithmeticRule,
  count: number = 20,
  rng: () => number = Math.random
): Problem[] {
  return Array.from({ length: count }, () => generateProblem(rule, rng));
}
