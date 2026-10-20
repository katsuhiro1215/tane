import { generateProblem, OPERATOR_SYMBOL, type ArithmeticRule, type Problem } from "@/lib/game/problem-rules";

/** 種に書く問題。今後の「穴あき」などの型も、この形で返す */
export interface SeedProblem {
  text: string;
  answer: number;
}

export interface SeedAvoid {
  answers: readonly number[];
  texts: readonly string[];
}

const MAX_REDRAWS = 20;

export function toSeedProblem(problem: Problem): SeedProblem {
  return {
    text: `${problem.operandA} ${OPERATOR_SYMBOL[problem.operator]} ${problem.operandB}`,
    answer: problem.answer,
  };
}

/** 虫食い。片方の数を？にして、その数を答えにする（例：3 ＋ ？ ＝ 7 → 4）。rng が0.5より小さいと左の数を隠す */
export function toBlankProblem(problem: Problem, rng: () => number = Math.random): SeedProblem {
  const symbol = OPERATOR_SYMBOL[problem.operator];
  if (rng() < 0.5) return { text: `？ ${symbol} ${problem.operandB} ＝ ${problem.answer}`, answer: problem.operandA };
  return { text: `${problem.operandA} ${symbol} ？ ＝ ${problem.answer}`, answer: problem.operandB };
}

type Convert = (problem: Problem, rng: () => number) => SeedProblem;

function drawWith(convert: Convert, rule: ArithmeticRule, avoid: SeedAvoid, rng: () => number): SeedProblem {
  let drawn = convert(generateProblem(rule, rng), rng);
  for (let i = 0; i < MAX_REDRAWS; i++) {
    if (!avoid.answers.includes(drawn.answer) && !avoid.texts.includes(drawn.text)) return drawn;
    drawn = convert(generateProblem(rule, rng), rng);
  }
  return drawn;
}

/** 避ける答え・式を出さないように引き直す。避けられないルールでは、避けずに返す */
export function drawSeedProblem(rule: ArithmeticRule, avoid: SeedAvoid, rng: () => number = Math.random): SeedProblem {
  return drawWith((problem) => toSeedProblem(problem), rule, avoid, rng);
}

export function drawBlankSeedProblem(rule: ArithmeticRule, avoid: SeedAvoid, rng: () => number = Math.random): SeedProblem {
  return drawWith(toBlankProblem, rule, avoid, rng);
}
