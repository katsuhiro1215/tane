import Image from "next/image";
import { Leaf } from "lucide-react";

import { StarsRow } from "@/components/app/stars-row";
import { FRIENDS } from "@/data/friends";
import type { Stage } from "@/data/stages/catalog";
import { stageLabel } from "@/lib/game/friends";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";

export function FriendCell({
  stage,
  stars,
  inGarden,
  onOpen,
}: {
  stage: Stage;
  stars: Stars;
  inGarden: boolean;
  onOpen: () => void;
}) {
  const met = stars > 0;
  const name = FRIENDS[stage.id].name;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={met ? name : `まだ あって いない なかま（${stageLabel(stage)}）`}
      data-in-garden={met && inGarden ? "true" : "false"}
      className="relative flex h-28 w-full flex-col items-center justify-end gap-0.5 rounded-2xl bg-card/80 p-1 active:translate-y-px"
    >
      {met ? (
        <>
          <Image
            src={growthImage(stage.color, growthForStars(stars))}
            alt=""
            width={56}
            height={70}
            className="h-14 w-auto object-contain"
          />
          <span className="line-clamp-1 font-display text-[11px] font-black">{name}</span>
          <StarsRow stars={stars} size="sm" />
        </>
      ) : (
        <>
          <Image
            src={growthImage(stage.color, "flower")}
            alt=""
            width={56}
            height={70}
            className="h-14 w-auto object-contain opacity-15 brightness-0"
          />
          <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#c9bfa8]">?</span>
        </>
      )}
      {met && inGarden && <Leaf aria-hidden className="absolute top-1 right-1 h-4 w-4 text-primary" fill="currentColor" />}
    </button>
  );
}
