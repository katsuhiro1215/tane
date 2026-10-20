"use client";

import Image from "next/image";
import { Fragment } from "react";
import { Crown } from "lucide-react";

import { StarsRow } from "@/components/app/stars-row";
import { GrowImage } from "@/components/mode/grow-image";
import type { Stage } from "@/data/stages/catalog";
import { isUnlocked, starsOf, type StarMap } from "@/lib/game/progression";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

interface StageGridProps {
  stages: readonly Stage[];
  stars: StarMap;
  focusedId: string;
  grew?: { stageId: string; from: Stars };
  onSelect: (stageId: string) => void;
}

const EVENT_SHORT = { mitori: "みとり", kake: "かけ", wari: "わり", mogi: "もぎ" } as const;

export function StageGrid({ stages, stars, focusedId, grew, onSelect }: StageGridProps) {
  return (
    <ul className="grid grid-cols-4 gap-2 px-4 pt-5 pb-6">
      {stages.map((stage, index) => {
        const gradeHeading = stage.kind === "soroban" && (index === 0 || stages[index - 1].kind !== "soroban" || (stages[index - 1] as typeof stage).grade !== stage.grade);
        const earned = starsOf(stars, stage.id);
        const unlocked = isUnlocked(stage, stars);
        const focused = stage.id === focusedId;
        const growing = grew?.stageId === stage.id;
        return (
          <Fragment key={stage.id}>
          {gradeHeading && stage.kind === "soroban" && (
            <li aria-hidden className="col-span-4 mt-1 font-display text-sm font-black text-primary">
              {stage.grade}きゅう
            </li>
          )}
          <li className="animate-pop-in" style={{ animationDelay: `${index * 35}ms` }}>
            <button
              type="button"
              onClick={() => onSelect(stage.id)}
              aria-label={`ステージ${stage.number} ${stage.name}${unlocked ? "" : "（まだ ひらいてない）"}`}
              aria-current={focused ? "true" : undefined}
              className={cn(
                "relative flex h-20 w-full items-end justify-center rounded-2xl pb-1 transition active:translate-y-[2px]",
                unlocked ? "bg-card/80" : "bg-white/40",
                focused && "ring-[3px] ring-accent"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 rounded-md px-1.5 font-display text-[10px] font-black text-white",
                  unlocked ? "bg-primary" : "bg-[#9aa39a]"
                )}
              >
                {stage.kind === "soroban" ? EVENT_SHORT[stage.event] : stage.number}
              </span>
              {stage.isBoss && (
                <Crown className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-accent" fill="currentColor" />
              )}
              {earned > 0 && (
                <span className="absolute top-1 right-1">
                  <StarsRow stars={earned} size="sm" animate={growing} />
                </span>
              )}
              {!unlocked ? (
                <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#7fa38a]">
                  ?
                </span>
              ) : growing && grew ? (
                <GrowImage color={stage.color} from={grew.from} to={earned} />
              ) : (
                <Image
                  src={growthImage(stage.color, growthForStars(earned))}
                  alt=""
                  width={56}
                  height={70}
                  className={cn("w-auto object-contain", earned === 0 ? "h-9" : "h-14")}
                />
              )}
            </button>
          </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
