"use client";

import { useEffect, useRef, useState } from "react";

import { CHALLENGE_MS, remainingMs, WARNING_MS } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

const TICK_MS = 100;

/** 残り時間を出し、0になったら onTimeUp を呼ぶ（呼ぶ側で1回だけにする）。running の間だけ見張る */
export function ChallengeTimer({
  getElapsedMs,
  running,
  onTimeUp,
}: {
  getElapsedMs: () => number;
  running: boolean;
  onTimeUp: () => void;
}) {
  const [left, setLeft] = useState(CHALLENGE_MS);
  const getRef = useRef(getElapsedMs);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    getRef.current = getElapsedMs;
    onTimeUpRef.current = onTimeUp;
  });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const next = remainingMs(getRef.current());
      setLeft(next);
      if (next === 0) onTimeUpRef.current();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const warning = left <= WARNING_MS;
  const seconds = Math.ceil(left / 1000);

  return (
    <div
      role="timer"
      aria-label={`のこり ${seconds}びょう`}
      data-warning={warning ? "true" : "false"}
      className="flex flex-1 items-center gap-2"
    >
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn("h-full rounded-full transition-[width] duration-100", warning ? "bg-destructive" : "bg-[#2b6fa3]")}
          style={{ width: `${(left / CHALLENGE_MS) * 100}%` }}
        />
      </div>
      {/* 紫のフィーバー画面の上でも読めるよう、白い札に載せる */}
      <span
        className={cn(
          "min-w-14 rounded-full bg-white/85 px-2 text-center font-display text-2xl font-black tabular-nums",
          warning ? "animate-pulse-soft text-destructive" : "text-[#2b6fa3]"
        )}
      >
        {seconds}
      </span>
    </div>
  );
}
