"use client";

import { GaugeBar } from "@/components/play/gauge-bar";
import { ScoreCounter } from "@/components/play/score-counter";
import { TimeBar } from "@/components/play/time-bar";
import type { PlaySession } from "@/lib/game/play-session";

export function SpeedHud({
  session,
  targetMs,
  getElapsedMs,
}: {
  session: PlaySession;
  /** null は時間なしのステージ。残り時間のバーを出さない */
  targetMs: number | null;
  getElapsedMs: () => number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={session.gauge} feverLeft={session.feverLeft} />
        <ScoreCounter score={session.score} />
      </div>
      {targetMs !== null && <TimeBar targetMs={targetMs} getElapsedMs={getElapsedMs} />}
    </div>
  );
}
