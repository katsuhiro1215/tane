"use client";

import Image from "next/image";
import { useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { SPRU_LINES } from "@/data/spru-lines";
import { gardenFriends, starsOf, type StarMap } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

// 育てたSpruを置く場所（左右に交互、手前ほど小さく）
const SLOTS = [
  { left: "6%", top: 112, width: 52 },
  { right: "6%", top: 108, width: 52 },
  { left: "24%", top: 146, width: 42 },
  { right: "24%", top: 148, width: 42 },
  { left: "1%", top: 162, width: 40 },
  { right: "1%", top: 164, width: 40 },
  { left: "38%", top: 178, width: 34 },
  { right: "38%", top: 180, width: 34 },
] as const;

export function Garden({ stars }: { stars: StarMap }) {
  const { play } = useSound();
  const [hops, setHops] = useState(0);
  const [line, setLine] = useState(0);
  const friends = gardenFriends(stars);

  function talk() {
    play("select");
    setHops((n) => n + 1);
    setLine((n) => (n + 1) % SPRU_LINES.length);
  }

  return (
    <section aria-label="Spruの にわ" className="relative h-60 overflow-hidden">
      <div
        aria-hidden
        className="absolute -inset-x-10 -bottom-28 h-52 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_20%,#8fd16a,#5bb33e_60%,#3b7f26)]"
      />
      {friends.map((stage, i) => {
        const slot = SLOTS[i];
        return (
          <Image
            key={stage.id}
            src={growthImage(stage.color, growthForStars(starsOf(stars, stage.id)))}
            alt=""
            width={slot.width}
            height={Math.round(slot.width * 1.35)}
            className="absolute h-auto animate-spru-bob"
            style={{
              left: "left" in slot ? slot.left : undefined,
              right: "right" in slot ? slot.right : undefined,
              top: slot.top,
              width: slot.width,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        );
      })}
      <button
        type="button"
        onClick={talk}
        aria-label="Spruに はなしかける"
        className="absolute top-5 left-1/2 -translate-x-1/2"
      >
        {/* 跳ねる動きと揺れる動きは transform がぶつかるので、別の要素に分ける */}
        <span key={hops} className={hops > 0 ? "block animate-spru-hop" : "block"}>
          <Image
            src={SPRU_POSES.cheer}
            alt=""
            width={110}
            height={152}
            priority
            className="h-auto w-[110px] animate-spru-bob"
          />
        </span>
      </button>
      <p
        key={line}
        role="status"
        className="absolute top-3 left-3 max-w-[42%] animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black shadow-[0_2px_0_var(--cream-edge)]"
      >
        {SPRU_LINES[line]}
      </p>
    </section>
  );
}
