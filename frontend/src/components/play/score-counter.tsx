"use client";

import { useCountUp } from "@/components/play/use-count-up";

export function ScoreCounter({ score }: { score: number }) {
  const shown = useCountUp(score);
  return (
    <span className="rounded-full border-b-[3px] border-[#c98f12] bg-accent px-3 py-0.5 font-display text-sm font-black text-accent-foreground">
      PT {shown.toLocaleString("ja-JP")}
    </span>
  );
}
