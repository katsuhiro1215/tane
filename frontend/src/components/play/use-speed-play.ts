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
  const { play, playBgm } = useSound();
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

  /** elapsedMs を渡すと、時計の代わりにその値を使う（種が降るあそびは、種ごとに経過時間が違う） */
  function submit(correct: boolean, remainingAfter: number, bonusPoints = 0, elapsedMs?: number): AnswerOutcome {
    const elapsed = elapsedMs ?? clock.stop();
    const outcome = answer(session, { correct, elapsedMs: elapsed, secondsPerProblem, remainingAfter, bonusPoints });
    setSession(outcome.session);
    setLastGain(
      outcome.gained > 0 ? { amount: outcome.gained, doubled: outcome.inFever, key: outcome.session.answered } : null
    );
    if (outcome.feverStarted) {
      play("gauge");
      playBgm("fever");
      setBanner(true);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(false), FEVER_BANNER_MS);
    }
    if (outcome.feverEnded) playBgm("quiz");
    return outcome;
  }

  /** 時間切れで終わるとき。時計を止め、フィーバー中なら終えて曲を戻し、最後の状態を返す */
  function finish(): PlaySession {
    clock.stop();
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner(false);
    if (session.feverLeft === 0) return session;
    playBgm("quiz");
    const ended = { ...session, gauge: 0, feverLeft: 0 };
    setSession(ended);
    return ended;
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

  return { session, banner, lastGain, submit, finish, reset, getElapsedMs };
}
