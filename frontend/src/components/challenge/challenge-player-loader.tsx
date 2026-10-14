"use client";

import dynamic from "next/dynamic";

import type { ChallengeModeId } from "@/lib/game/challenge-rules";

const ChallengePlayer = dynamic(
  () => import("@/components/challenge/challenge-player").then((mod) => mod.ChallengePlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function ChallengePlayerLoader({ modeId }: { modeId: ChallengeModeId }) {
  // あそびを変えたら作り直す（前のあそびの段や点数を引き継がない）
  return <ChallengePlayer key={modeId} modeId={modeId} />;
}
