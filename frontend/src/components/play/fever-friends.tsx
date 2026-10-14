"use client";

import Image from "next/image";

import { gardenFriends, starsOf } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { useProgress } from "@/lib/progress-store";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

/** フィーバー中に応援に集まる仲間。hopKey が変わるたび（正解のたび）に跳ねる */
export function FeverFriends({ hopKey }: { hopKey: number }) {
  const { stars, garden } = useProgress();
  const friends = gardenFriends(stars, garden);
  return (
    <div aria-hidden className="flex h-14 items-end justify-center gap-1 px-4">
      {friends.length === 0 ? (
        <span key={hopKey} className="block animate-spru-hop">
          <Image src={SPRU_POSES.jump} alt="" width={44} height={60} className="h-14 w-auto" />
        </span>
      ) : (
        friends.map((stage, i) => (
          <span key={`${stage.id}-${hopKey}`} className="block animate-spru-hop" style={{ animationDelay: `${i * 40}ms` }}>
            <Image
              src={growthImage(stage.color, growthForStars(starsOf(stars, stage.id)))}
              alt=""
              width={40}
              height={54}
              className="h-12 w-auto"
            />
          </span>
        ))
      )}
    </div>
  );
}
