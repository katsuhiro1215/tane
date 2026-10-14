"use client";

import { useEffect, useRef, useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { createAnswerClock } from "@/lib/game/answer-clock";
import { FEVER_BANNER_MS } from "@/lib/game/play-rules";
import { answer, INITIAL_SESSION, type AnswerOutcome, type PlaySession } from "@/lib/game/play-session";

export interface LastGain {
  amount: number;
  doubled: boolean;
  key: number;
}

interface Options {
  secondsPerProblem: number;
  answerable: boolean;
  questionKey: number;
}

export function useSpeedPlay({ secondsPerProblem, answerable, questionKey }: Options) {
  const { playBgm } = useSound();
  // プレイ画面は ssr: false で読み込むので、初期値で performance を使ってよい
  const [clock] = useState(() => createAnswerClock(() => performance.now()));
  const [session, setSession] = useState<PlaySession>(INITIAL_SESSION);
  const [banner, setBanner] = useState(false);
  const [lastGain, setLastGain] = useState<LastGain | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 問題が答えられる状態になるたびに、0から測り始める（演出中・フラッシュの表示中は数えない）
  useEffect(() => {
    // 隠れたタブで問題が始まることもある（演出やフラッシュのタイマーは隠れていても進む）
    if (answerable) clock.start(document.visibilityState === "hidden");
  }, [answerable, questionKey, clock]);

  // 別のタブ・アプリにいる間は数えない
  useEffect(() => {
    const onVisibility = () => (document.visibilityState === "hidden" ? clock.pause() : clock.resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [clock]);

  function submit(correct: boolean, remainingAfter: number): AnswerOutcome {
    const outcome = answer(session, { correct, elapsedMs: clock.stop(), secondsPerProblem, remainingAfter });
    setSession(outcome.session);
    setLastGain(
      outcome.gained > 0 ? { amount: outcome.gained, doubled: outcome.inFever, key: outcome.session.answered } : null
    );
    if (outcome.feverStarted) {
      playBgm("fever");
      setBanner(true);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(false), FEVER_BANNER_MS);
    }
    if (outcome.feverEnded) playBgm("quiz");
    return outcome;
  }

  function reset() {
    if (session.feverLeft > 0) playBgm("quiz");
    clock.stop();
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setSession(INITIAL_SESSION);
    setLastGain(null);
    setBanner(false);
  }

  function getElapsedMs(): number {
    return session.elapsedMs + clock.peek();
  }

  return { session, banner, lastGain, submit, reset, getElapsedMs };
}
