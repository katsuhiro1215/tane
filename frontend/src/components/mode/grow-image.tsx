"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { useSound } from "@/components/app/sound-provider";
import type { Stage } from "@/data/stages/catalog";
import { growthForStage, type Stars } from "@/lib/game/stars";
import { prefersReducedMotion } from "@/lib/motion";
import { growthImage } from "@/lib/spru-images";

const SPARKLES = [
  { dx: -26, dy: -30 },
  { dx: 24, dy: -34 },
  { dx: -34, dy: -4 },
  { dx: 32, dy: -6 },
  { dx: -14, dy: -42 },
  { dx: 12, dy: -44 },
];
const SWAP_MS = 450;

/** 前の育ち具合が縮んで消え、次の育ち具合が弾むように出てキラキラが散る */
export function GrowImage({ stage, from, to }: { stage: Stage; from: Stars; to: Stars }) {
  const { play } = useSound();
  // この部品は ssr: false の画面の中でだけ使うので、初期値で window を見てよい
  const [phase, setPhase] = useState<"before" | "after">(() => (prefersReducedMotion() ? "after" : "before"));

  useEffect(() => {
    play("coin");
  }, [play]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = setTimeout(() => setPhase("after"), SWAP_MS);
    return () => clearTimeout(timer);
  }, []);

  if (phase === "before") {
    return (
      <Image
        key="before"
        src={growthImage(stage.color, growthForStage(stage, from))}
        alt=""
        width={56}
        height={70}
        className="h-14 w-auto animate-grow-out object-contain"
      />
    );
  }
  return (
    <span className="relative flex h-14 items-end justify-center">
      <Image
        key="after"
        src={growthImage(stage.color, growthForStage(stage, to))}
        alt=""
        width={56}
        height={70}
        className="h-14 w-auto animate-grow-in object-contain"
      />
      {SPARKLES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 animate-sparkle rounded-full bg-accent"
          style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, animationDelay: `${i * 30}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}
