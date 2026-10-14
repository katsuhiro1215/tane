"use client";

import Image from "next/image";

import { BottomNav } from "@/components/app/bottom-nav";
import { MODE_IDS, MODES, STAGES, stagesOfMode } from "@/data/stages/catalog";
import { friendsCount, starsOf } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { useProgress } from "@/lib/progress-store";
import { growthImage } from "@/lib/spru-images";

export function FriendsScreen() {
  const { stars } = useProgress();
  return (
    <main className="flex flex-1 flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-display text-2xl font-black text-primary">なかま</h1>
        <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
          {friendsCount(stars)} / {STAGES.length}
        </span>
      </header>
      {MODE_IDS.map((mode) => (
        <section key={mode} aria-labelledby={`friends-${mode}`} className="px-4 pt-4">
          <h2 id={`friends-${mode}`} className="mb-2 font-display text-lg font-black">
            {MODES[mode].label}
          </h2>
          <ul className="grid grid-cols-4 gap-2">
            {stagesOfMode(mode).map((stage) => {
              const earned = starsOf(stars, stage.id);
              return (
                <li key={stage.id} className="relative flex h-24 flex-col items-center justify-end rounded-2xl bg-card/80 p-1">
                  {earned > 0 ? (
                    <>
                      <Image
                        src={growthImage(stage.color, growthForStars(earned))}
                        alt=""
                        width={56}
                        height={70}
                        className="h-14 w-auto object-contain"
                      />
                      <span className="line-clamp-1 text-[10px] font-bold">{stage.name}</span>
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
                      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#c9bfa8]">
                        ?
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <BottomNav />
    </main>
  );
}
