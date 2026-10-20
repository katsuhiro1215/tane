"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { playPath, type ModeId } from "@/data/stages/catalog";
import { continueLabel } from "@/lib/game/friends";
import { continueTarget, type StarMap } from "@/lib/game/progression";

export function ContinueButton({ stars, lastModeId }: { stars: StarMap; lastModeId?: ModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const stage = continueTarget(stars, lastModeId);
  return (
    <AppButton
      variant="cta"
      className="h-[72px] w-full flex-col gap-0 leading-tight"
      onClick={() => {
        play("select");
        router.push(playPath(stage));
      }}
    >
      <span className="flex items-center gap-1 text-2xl">
        つづきから <Play className="h-6 w-6" fill="currentColor" />
      </span>
      <span className="text-xs font-bold tracking-normal">
        {continueLabel(stage)}
      </span>
    </AppButton>
  );
}
