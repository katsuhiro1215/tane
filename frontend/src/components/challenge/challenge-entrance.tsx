"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopBar } from "@/components/app/top-bar";
import { ChallengeModeCard } from "@/components/challenge/challenge-mode-card";
import { CHALLENGE_MODE_IDS } from "@/lib/game/challenge-rules";
import { isChallengeUnlocked } from "@/lib/game/progression";
import { useProgress } from "@/lib/progress-store";

export function ChallengeEntrance() {
  const router = useRouter();
  const { stars, challengeBest } = useProgress();
  const unlocked = isChallengeUnlocked(stars);

  // ★30に届く前に URL を直接開いたら、ホームへ戻す
  useEffect(() => {
    if (!unlocked) router.replace("/");
  }, [unlocked, router]);

  if (!unlocked) return null;
  return (
    <main className="flex flex-1 flex-col gap-3 pb-6">
      <TopBar title="チャレンジ" backHref="/" />
      <div className="px-4 text-center">
        <p className="font-display text-lg font-black text-[#2b6fa3]">60びょうで どこまで いける？</p>
        <p className="text-xs font-bold text-muted-foreground">つづけて せいかいすると むずかしく なるよ</p>
      </div>
      <ul className="flex flex-col gap-2 px-4">
        {CHALLENGE_MODE_IDS.map((id) => (
          <li key={id}>
            <ChallengeModeCard modeId={id} best={challengeBest[id] ?? null} />
          </li>
        ))}
      </ul>
    </main>
  );
}
