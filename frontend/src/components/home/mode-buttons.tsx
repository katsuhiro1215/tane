"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calculator, Timer, Zap } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { MODE_IDS, MODES } from "@/data/stages/catalog";
import { CHALLENGE_UNLOCK_STARS, isChallengeUnlocked, modeStarSummary, type StarMap } from "@/lib/game/progression";
import { cn } from "@/lib/utils";

const NOTICE_MS = 2000;
const TILE = "h-16 flex-col gap-0 px-1 text-xs";

function SorobanLink({ stars }: { stars: StarMap }) {
  const summary = modeStarSummary("soroban", stars);
  return (
    <Link
      href="/mode/soroban"
      className={cn(appButtonVariants({ variant: "cream" }), "col-span-3 h-14 justify-start gap-3 px-4 text-base")}
    >
      <Calculator className="h-6 w-6 shrink-0" strokeWidth={2.5} />
      <span className="flex flex-1 flex-col items-start leading-tight">
        <span>{MODES.soroban.label}</span>
        <span className="text-[10px] text-muted-foreground">10きゅう〜4きゅう</span>
      </span>
      <span className="text-[10px] text-[#c98a1b]">
        ★ {summary.earned}/{summary.max}
      </span>
    </Link>
  );
}

export function ModeButtons({ stars }: { stars: StarMap }) {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengeOpen = isChallengeUnlocked(stars);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function showLockedNotice() {
    setNotice(`★を ${CHALLENGE_UNLOCK_STARS}こ あつめると ひらくよ`);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }

  return (
    <section aria-label="あそびを えらぶ" className="relative mt-4 grid grid-cols-3 gap-2 px-4">
      {MODE_IDS.filter((id) => id !== "soroban").map((id) => {
        const summary = modeStarSummary(id, stars);
        return (
          <Link key={id} href={`/mode/${id}`} className={cn(appButtonVariants({ variant: "cream" }), TILE)}>
            <span className="text-2xl leading-none">{MODES[id].symbol ?? <Zap className="h-6 w-6" fill="currentColor" />}</span>
            {MODES[id].label}
            <span className="text-[10px] text-[#c98a1b]">
              ★ {summary.earned}/{summary.max}
            </span>
          </Link>
        );
      })}
      {challengeOpen ? (
        <Link href="/challenge" className={cn(appButtonVariants({ variant: "warning" }), TILE)}>
          <Timer className="h-6 w-6" />
          チャレンジ
          <span className="text-[10px]">60びょう</span>
        </Link>
      ) : (
        <button type="button" onClick={showLockedNotice} className={cn(appButtonVariants({ variant: "locked" }), TILE)}>
          <Timer className="h-6 w-6" />
          チャレンジ
          <span className="text-[10px]">★{CHALLENGE_UNLOCK_STARS}で ひらくよ</span>
        </button>
      )}
      {/* そろばんは、検定の級ごとに遊ぶので、横長のボタンにして別に置く */}
      <SorobanLink stars={stars} />
      {notice && (
        <p
          role="status"
          className="absolute -top-10 right-4 animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black shadow"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
