"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const TICK_MS = 200;

/** 目標タイムまでの残りを減っていくバーで出す。過ぎても止めない */
export function TimeBar({ targetMs, getElapsedMs }: { targetMs: number; getElapsedMs: () => number }) {
  const [elapsed, setElapsed] = useState(0);
  const getRef = useRef(getElapsedMs);

  useEffect(() => {
    getRef.current = getElapsedMs;
  });

  useEffect(() => {
    const id = setInterval(() => setElapsed(getRef.current()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const over = elapsed > targetMs;
  const remainingRatio = Math.max(0, 1 - elapsed / targetMs);
  const remainingSec = Math.ceil(Math.max(0, targetMs - elapsed) / 1000);

  return (
    <div className="px-4" data-time-over={over ? "true" : "false"}>
      <div className="h-2 overflow-hidden rounded-full bg-white/60">
        <div
          className={cn("h-full rounded-full transition-[width] duration-200", over ? "bg-[#b9b2a3]" : "bg-[#2b6fa3]")}
          style={{ width: `${over ? 100 : remainingRatio * 100}%` }}
        />
      </div>
      <p className="mt-0.5 text-right">
        {/* 紫のフィーバー画面の上でも読めるよう、白い札に載せる */}
        <span
          className={cn(
            "inline-block rounded-full bg-white/80 px-2 font-display text-[11px] font-black",
            over ? "text-muted-foreground" : "text-[#2b6fa3]"
          )}
        >
          {over ? "★3は つぎ がんばろう" : `★3まで あと ${remainingSec}びょう`}
        </span>
      </p>
    </div>
  );
}
