"use client";

import { useState } from "react";

import { BottomNav } from "@/components/app/bottom-nav";
import { FriendSheet } from "@/components/friends/friend-sheet";
import { MedalShelf } from "@/components/friends/medal-shelf";
import { ModeFriends } from "@/components/friends/mode-friends";
import { getStage, MODE_IDS, STAGES } from "@/data/stages/catalog";
import { friendsCount } from "@/lib/game/progression";
import { useProgress } from "@/lib/progress-store";

export function FriendsScreen() {
  const progress = useProgress();
  const [openId, setOpenId] = useState<string | null>(null);
  const count = friendsCount(progress.stars);
  const opened = openId ? getStage(openId) : undefined;

  return (
    <main className="flex flex-1 flex-col pb-24">
      <header className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-black text-primary">なかま</h1>
          <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
            {count} / {STAGES.length}
          </span>
        </div>
        <div
          role="img"
          aria-label={`あつめた なかま ${count} / ${STAGES.length}`}
          className="h-2.5 overflow-hidden rounded-full bg-white/70"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-leaf to-accent"
            style={{ width: `${(count / STAGES.length) * 100}%` }}
          />
        </div>
      </header>
      <MedalShelf stars={progress.stars} challengeBest={progress.challengeBest} />
      {MODE_IDS.map((mode) => (
        <ModeFriends key={mode} mode={mode} stars={progress.stars} garden={progress.garden} onOpen={setOpenId} />
      ))}
      {opened && <FriendSheet stage={opened} progress={progress} onClose={() => setOpenId(null)} />}
      <BottomNav />
    </main>
  );
}
