"use client";

import Image from "next/image";
import { useEffect } from "react";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { FRIENDS } from "@/data/friends";
import type { Stage } from "@/data/stages/catalog";
import { growthForStage, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";

/** 初めてクリアしたステージの子が「なかまに なった！」と出てくる。画面いっぱいに出す */
export function NewFriend({ stage, stars, onClose }: { stage: Stage; stars: Stars; onClose: () => void }) {
  const { play } = useSound();
  const friend = FRIENDS[stage.id];

  useEffect(() => {
    play("coin");
  }, [play]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-friend-title"
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#fffbe8_0%,#bfe6ff_75%)] p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1/2 animate-beams bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.65)_0deg_7deg,transparent_7deg_30deg)]"
      />
      <Image
        src={growthImage(stage.color, growthForStage(stage, stars))}
        alt=""
        width={180}
        height={225}
        priority
        className="relative h-48 w-auto animate-grow-in object-contain"
      />
      <h2 id="new-friend-title" className="relative text-center font-display text-3xl leading-snug font-black">
        <span className="text-cta-to">{friend.name}</span>が
        <br />
        なかまに なった！
      </h2>
      <p className="relative rounded-2xl bg-white/85 px-4 py-2 text-center font-display font-black">「{friend.line}」</p>
      <AppButton variant="cta" size="xl" className="relative mt-2" onClick={onClose} autoFocus>
        やったね！
      </AppButton>
    </div>
  );
}
