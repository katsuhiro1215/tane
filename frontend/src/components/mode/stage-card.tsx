"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Crown, Lock } from "lucide-react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import { problemCount, type Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { SPRU_POSES, STAGE_BADGES } from "@/lib/spru-images";

interface StageCardProps {
  stage: Stage;
  total: number;
  stars: Stars;
  unlocked: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onStart: () => void;
}

export function StageCard({ stage, total, stars, unlocked, onPrev, onNext, onStart }: StageCardProps) {
  return (
    <Panel className="relative mx-4 mt-7 pt-6">
      <span className="absolute -top-3 left-4 rounded-full bg-accent px-3 py-0.5 font-display text-xs font-black text-accent-foreground">
        {stage.kind === "soroban" ? `${stage.grade}きゅう` : `ステージ ${stage.number} / ${total}`}
      </span>
      <Image
        src={unlocked ? SPRU_POSES.cheer : STAGE_BADGES.locked}
        alt=""
        width={64}
        height={88}
        priority
        className="absolute -top-10 -right-2 h-auto w-16 animate-spru-bob"
      />
      <h2 className="flex items-center justify-center gap-1 font-display text-xl font-black">
        {stage.isBoss && <Crown className="h-5 w-5 text-accent" fill="currentColor" aria-label="ボス" />}
        {stage.name}
      </h2>
      <p className="text-center text-sm font-bold text-muted-foreground">
        {stage.description} ・ {problemCount(stage)}もん
      </p>
      <p className="mt-1 text-center">
        <StarsRow stars={stars} />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <AppButton size="icon" aria-label="まえのステージ" onClick={onPrev} disabled={!onPrev}>
          <ChevronLeft className="h-6 w-6" strokeWidth={3} />
        </AppButton>
        <AppButton
          variant={unlocked ? "cta" : "locked"}
          size="lg"
          className="flex-1"
          onClick={onStart}
          disabled={!unlocked}
        >
          {unlocked ? (
            "はじめる！"
          ) : (
            <>
              <Lock className="h-5 w-5" /> まだ ひらいてないよ
            </>
          )}
        </AppButton>
        <AppButton size="icon" aria-label="つぎのステージ" onClick={onNext} disabled={!onNext}>
          <ChevronRight className="h-6 w-6" strokeWidth={3} />
        </AppButton>
      </div>
      {!unlocked && (
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground">まえのステージを クリアしてね</p>
      )}
    </Panel>
  );
}
