import { OPERATOR_SYMBOL, type Operator } from "@/lib/game/problem-rules";

/** 筆算（縦書き）の見た目。1つ目の数・記号＋2つ目の数・下線を右そろえで並べる */
export function ColumnProblem({ a, b, operator }: { a: number; b: number; operator: Operator }) {
  const width = Math.max(String(a).length, String(b).length + 1);
  return (
    <div data-testid="column-problem" className="inline-grid justify-items-end gap-0.5 font-display text-2xl font-black text-white">
      <span className="tabular-nums" style={{ minWidth: `${width}ch` }}>
        {a}
      </span>
      <span className="flex items-baseline gap-1 tabular-nums" style={{ minWidth: `${width}ch` }}>
        <span className="mr-auto">{OPERATOR_SYMBOL[operator]}</span>
        {b}
      </span>
      <span className="h-0.5 w-full bg-white" style={{ minWidth: `${width}ch` }} />
    </div>
  );
}
