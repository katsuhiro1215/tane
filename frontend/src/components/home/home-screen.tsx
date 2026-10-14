"use client";

import { BottomNav } from "@/components/app/bottom-nav";
import { ContinueButton } from "@/components/home/continue-button";
import { Garden } from "@/components/home/garden";
import { HomeHud } from "@/components/home/home-hud";
import { ModeButtons } from "@/components/home/mode-buttons";
import { TitleScreen } from "@/components/home/title-screen";
import { useProgress } from "@/lib/progress-store";

export function HomeScreen() {
  const { stars, lastModeId, titleSeen, garden } = useProgress();
  if (!titleSeen) return <TitleScreen />;
  return (
    <main className="flex flex-1 flex-col pb-24">
      <HomeHud stars={stars} />
      <Garden stars={stars} chosen={garden} />
      <div className="px-4">
        <ContinueButton stars={stars} lastModeId={lastModeId} />
      </div>
      <ModeButtons stars={stars} />
      <BottomNav />
    </main>
  );
}
