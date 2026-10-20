import type { SorobanProblem } from "@/lib/game/soroban-rules";

/** かけざん・わりざんの式。桁が多いので、文字は四則演算より少し小さい */
export function SorobanProblemText({ problem }: { problem: Exclude<SorobanProblem, { event: "mitori" }> }) {
  return (
    <p className="font-display text-3xl font-black tracking-wide tabular-nums">
      {problem.a} {problem.event === "kake" ? "×" : "÷"} {problem.b} ＝
    </p>
  );
}
