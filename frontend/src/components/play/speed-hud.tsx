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
  targetMs: number;
  getElapsedMs: () => number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={session.gauge} feverLeft={session.feverLeft} />
        <ScoreCounter score={session.score} />
      </div>
      <TimeBar targetMs={targetMs} getElapsedMs={getElapsedMs} />
    </div>
  );
}
