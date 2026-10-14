"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** 表示する数を target まで少しずつ近づける。動きを減らす設定ではすぐ target にする */
export function useCountUp(target: number, durationMs = 400, initial = target): number {
  const [shown, setShown] = useState(initial);
  const shownRef = useRef(initial);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const duration = prefersReducedMotion() ? 0 : durationMs;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      const value = Math.round(from + (target - from) * progress);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
