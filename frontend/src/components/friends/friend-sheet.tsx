"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { COLOR_LABELS, FRIENDS } from "@/data/friends";
import { playPath, type Stage } from "@/data/stages/catalog";
import { favoriteText, nextGrowthText, unlockHint } from "@/lib/game/friends";
import { isUnlocked, starsOf } from "@/lib/game/progression";
import { growthForStage, type Growth } from "@/lib/game/stars";
import { toggleGarden, type Progress } from "@/lib/progress-store";
import { GROWTHS, growthImage } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const GROWTH_LABELS: Record<Growth, string> = { seed: "タネ", sprout: "め", bud: "つぼみ", flower: "はな" };
const NOTICE_MS = 2000;

/** さわったなかまのカード。画面の下から出る */
export function FriendSheet({ stage, progress, onClose }: { stage: Stage; progress: Progress; onClose: () => void }) {
  const { play } = useSound();
  const [notice, setNotice] = useState<string | null>(null);
  const stars = starsOf(progress.stars, stage.id);
  const met = stars > 0;
  const friend = FRIENDS[stage.id];
  const inGarden = progress.garden.includes(stage.id);
  const unlocked = isUnlocked(stage, progress.stars);
  const best = progress.best[stage.id];
  const current = growthForStage(stage, stars);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // 開いている間は後ろの図鑑を動かさない（設計書3章）
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function onGarden() {
    play("select");
    if (toggleGarden(stage.id) === "full") setNotice("にわが いっぱい！ だれかを もどしてね");
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end overscroll-contain bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-sheet-title"
        className="relative mx-auto flex w-full max-w-md animate-bubble-in flex-col items-center gap-2 rounded-t-3xl bg-card px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        {met ? (
          <>
            <Image
              key={stage.id}
              src={growthImage(stage.color, current)}
              alt=""
              width={120}
              height={150}
              className="h-32 w-auto animate-pop-in object-contain"
            />
            <h2 id="friend-sheet-title" className="font-display text-2xl font-black">
              {friend.name}
            </h2>
            <p className="text-xs font-bold text-muted-foreground">{COLOR_LABELS[stage.color]}の なかま</p>
            <ol aria-label="そだちかた" className="flex items-end gap-2">
              {GROWTHS.map((growth) => (
                <li
                  key={growth}
                  aria-current={growth === current ? "step" : undefined}
                  className={cn(
                    "flex flex-col items-center rounded-xl px-1.5 py-1",
                    growth === current ? "bg-accent/30 ring-2 ring-accent" : "opacity-40"
                  )}
                >
                  <Image src={growthImage(stage.color, growth)} alt="" width={32} height={40} className="h-8 w-auto" />
                  <span className="text-[10px] font-bold">{GROWTH_LABELS[growth]}</span>
                </li>
              ))}
            </ol>
            <p className="font-display text-sm font-black text-[#2b6fa3]">{nextGrowthText(stars, stage)}</p>
            <p className="rounded-2xl bg-muted/60 px-4 py-2 text-center font-display font-black">「{friend.line}」</p>
            <p className="text-xs font-bold">すきな けいさん: {favoriteText(stage)}</p>
            {best !== undefined && (
              <p className="text-xs font-bold text-muted-foreground">さいこう {best.toLocaleString("ja-JP")} PT</p>
            )}
          </>
        ) : (
          <>
            <span className="relative">
              <Image
                src={growthImage(stage.color, "flower")}
                alt=""
                width={120}
                height={150}
                className="h-32 w-auto object-contain opacity-15 brightness-0"
              />
              <span className="absolute inset-0 grid place-items-center font-display text-5xl font-black text-[#c9bfa8]">
                ?
              </span>
            </span>
            <h2 id="friend-sheet-title" className="font-display text-xl font-black">
              まだ あって いないよ
            </h2>
            <p className="text-center text-sm font-bold">{unlockHint(stage)}</p>
            {!unlocked && <p className="text-xs font-bold text-muted-foreground">まえの ステージを クリアしよう</p>}
          </>
        )}
        <div className="mt-2 flex w-full flex-col gap-2">
          {unlocked && (
            <Link href={playPath(stage)} className={appButtonVariants({ variant: "cta", size: "lg" })}>
              この ステージで あそぶ
            </Link>
          )}
          {(met || inGarden) && (
            <AppButton variant="primary" onClick={onGarden}>
              {inGarden ? "にわから もどす" : "にわに だす"}
            </AppButton>
          )}
          <AppButton onClick={onClose}>とじる</AppButton>
        </div>
        {notice && (
          <p
            role="status"
            className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black whitespace-nowrap shadow"
          >
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
