"use client";

import Image from "next/image";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { markTitleSeen } from "@/lib/progress-store";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

const ROW = [
  { src: growthImage("spru", "seed"), width: 44 },
  { src: growthImage("spru", "sprout"), width: 56 },
  { src: SPRU_POSES.front, width: 110 },
  { src: growthImage("spru", "flower"), width: 66 },
];

export function TitleScreen() {
  const { play } = useSound();
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden pt-16">
      <div
        aria-hidden
        className="absolute -inset-x-10 -bottom-32 h-80 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_20%,#8fd16a,#5bb33e_60%,#3b7f26)]"
      />
      <h1 className="font-display text-6xl font-black tracking-wide text-primary">
        T<span className="text-cta-to">a</span>ne
      </h1>
      <p className="mt-1 font-display text-sm font-black">けいさんの タネを そだてよう</p>
      <div className="relative mt-12 flex items-end gap-1">
        {ROW.map((item, i) => (
          <Image
            key={item.src}
            src={item.src}
            alt=""
            width={item.width}
            height={Math.round(item.width * 1.4)}
            priority
            className="h-auto animate-pop-in"
            style={{ width: item.width, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <AppButton
        variant="cta"
        size="xl"
        className="relative mt-auto mb-24 w-4/5 animate-pulse-soft"
        onClick={() => {
          play("select");
          markTitleSeen();
        }}
      >
        はじめる
      </AppButton>
    </main>
  );
}
