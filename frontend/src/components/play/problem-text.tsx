import type { Operator, Problem } from "@/lib/game/problem-rules";

const OPERATOR_SYMBOL: Record<Operator, string> = { add: "＋", sub: "−", mul: "×", div: "÷" };

export function ProblemText({ problem }: { problem: Problem }) {
  return (
    <p className="font-display text-4xl font-black tracking-wide">
      {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
    </p>
  );
}
