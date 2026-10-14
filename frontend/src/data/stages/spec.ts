import type { ArithmeticRule } from "@/lib/game/problem-rules";

export interface StageSpec<R> {
  readonly name: string;
  readonly description: string;
  readonly rule: R;
}

/** 番号 from〜to（1始まり・両端を含む）のルールから1問ずつ選ぶボスを最後に足す */
export function withBoss(
  specs: readonly StageSpec<ArithmeticRule>[],
  from: number,
  to: number
): StageSpec<ArithmeticRule>[] {
  return [
    ...specs,
    {
      name: "ボス",
      description: "まぜこぜ",
      rule: { op: "mix", rules: specs.slice(from - 1, to).map((spec) => spec.rule) },
    },
  ];
}
