import { OPERATOR_SYMBOL, type Problem } from "@/lib/game/problem-rules";

export function ProblemText({ problem }: { problem: Problem }) {
  return (
    <p className="font-display text-4xl font-black tracking-wide">
      {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
    </p>
  );
}
