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

/** 避ける答え・式を出さないように引き直す。避けられないルールでは、避けずに返す */
export function drawSeedProblem(rule: ArithmeticRule, avoid: SeedAvoid, rng: () => number = Math.random): SeedProblem {
  let drawn = toSeedProblem(generateProblem(rule, rng));
  for (let i = 0; i < MAX_REDRAWS; i++) {
    if (!avoid.answers.includes(drawn.answer) && !avoid.texts.includes(drawn.text)) return drawn;
    drawn = toSeedProblem(generateProblem(rule, rng));
  }
  return drawn;
}
