import Link from "next/link";
import { Shuffle } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { MedalBadge } from "@/components/challenge/medal-badge";
import { MODES } from "@/data/stages/catalog";
import { CHALLENGE_LABELS, medalFor, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

export function ChallengeModeCard({ modeId, best }: { modeId: ChallengeModeId; best: number | null }) {
  const medal = medalFor(modeId, best);
  return (
    <Link
      href={`/challenge/${modeId}`}
      className={cn(appButtonVariants({ variant: "cream", size: "lg" }), "h-20 w-full justify-start gap-3 px-4")}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl text-primary-foreground">
        {modeId === "mix" ? <Shuffle className="h-6 w-6" strokeWidth={3} /> : MODES[modeId].symbol}
      </span>
      <span className="flex flex-1 flex-col items-start gap-0.5">
        <span className="text-xl">{CHALLENGE_LABELS[modeId]}</span>
        <span className="text-xs text-muted-foreground">
          {best === null ? "まだ きろくなし" : `さいこう ${best.toLocaleString("ja-JP")} PT`}
        </span>
      </span>
      {medal && <MedalBadge medal={medal} size="sm" />}
    </Link>
  );
}
