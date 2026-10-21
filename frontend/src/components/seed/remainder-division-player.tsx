"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { CountdownBanner, TimeUpBanner } from "@/components/challenge/challenge-banners";
import { HpGauge } from "@/components/hp-gauge";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { GaugeBar } from "@/components/play/gauge-bar";
import { NewFriend } from "@/components/play/new-friend";
import { PointsPopup } from "@/components/play/points-popup";
import { ScoreCounter } from "@/components/play/score-counter";
import { StageNotFound } from "@/components/play/stage-not-found";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { SeedModeSelect } from "@/components/seed/seed-mode-select";
import { SeedResult, type SeedOutcome } from "@/components/seed/seed-result";
import { getStage } from "@/data/stages/catalog";
import { appendDigit, canSubmit, removeLastDigit } from "@/lib/game/answer-input";
import { INITIAL_HP } from "@/lib/game/hp";
import { modeHref } from "@/lib/mode-params";
import { recordEndlessResult, recordStageResult, rememberLastMode, useProgress } from "@/lib/progress-store";
import { answerDivMod, createDivModRun, stepDivModRun, type DivModRun, type DivModRule } from "@/lib/game/remainder-division";
import { SEED_ROUND_MS, starsForSeedRun } from "@/lib/game/seed-stars";
import type { SeedRunMode } from "@/lib/game/seed-run";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
const ENDING_MS = 1500;
const SHAKE_MS = 350;
const MAX_LEN = 4;

type Phase = "select" | "countdown" | "playing" | "ending" | "result";
type Field = "quotient" | "remainder";

/** あまりのあるわり算。降らず、1問ずつ出す。商とあまりを別々に答える */
export function RemainderDivisionPlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "seed" && found.rule.pair ? found : undefined;
  const { play } = useSound();
  const progress = useProgress();

  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<SeedRunMode>("minute");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [run, setRun] = useState<DivModRun | null>(null);
  const [active, setActive] = useState<Field>("quotient");
  const [quotientValue, setQuotientValue] = useState("");
  const [remainderValue, setRemainderValue] = useState("");
  const [shaking, setShaking] = useState(false);
  const [outcome, setOutcome] = useState<SeedOutcome | null>(null);
  const [newFriendOpen, setNewFriendOpen] = useState(false);

  const runRef = useRef<DivModRun | null>(null);
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const problemStartRef = useRef(0);
  // rAF のループは [phase, mode] が変わったときしか作り直さないため、中の endRun をそのまま閉じ込めると
  // 古い描画の speed.finish（＝古い session）を呼んでしまう。ref 経由で、常に最新の endRun を呼ぶ
  const endRunRef = useRef<(finished: DivModRun) => void>(() => {});

  const rule: DivModRule | null = stage ? stage.rule.pair! : null;
  const roundMs = stage ? (stage.rule.roundMs ?? SEED_ROUND_MS) : SEED_ROUND_MS;
  const speed = useSpeedPlay({
    secondsPerProblem: stage ? stage.rule.fallMs / 1000 : 1,
    answerable: false,
    questionKey: 0,
  });

  useEffect(() => {
    if (stage) rememberLastMode(stage.mode);
  }, [stage]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  function schedule(fn: () => void, ms: number) {
    timeoutsRef.current.push(setTimeout(fn, ms));
  }

  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setTimeout(() => (count > 0 ? setCount(count - 1) : setPhase("playing")), COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, count]);

  // 時間だけを進める（あまりのあるわり算には「落ちる」概念が無い。終わりは timeup か defeated だけ）
  useEffect(() => {
    if (phase !== "playing" || mode !== "minute") return;
    let last = performance.now();
    let frame = 0;
    function loop(now: number) {
      const current = runRef.current;
      if (current && current.status === "playing") {
        const next = stepDivModRun(current, now - last, roundMs);
        runRef.current = next;
        setRun(next);
        if (next.status !== "playing" && !endedRef.current) endRunRef.current(next);
      }
      last = now;
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode]);

  function endRun(finished: DivModRun) {
    if (!stage) return;
    endedRef.current = true;
    const session = speed.finish();
    const defeated = finished.status === "defeated";
    let next: SeedOutcome;
    if (finished.mode === "minute") {
      const earned = starsForSeedRun({
        correct: finished.correct,
        mistakes: finished.mistakes,
        defeated,
        thresholds: stage.rule.thresholds,
      });
      const record = recordStageResult(stage.id, earned, earned > 0 ? session.score : null);
      next = {
        mode: "minute", stars: earned, before: record.before, improved: record.improved, score: session.score,
        newBest: record.newBest, correct: finished.correct, mistakes: finished.mistakes, maxCombo: finished.maxCombo,
        defeated, newBestCorrect: false, newBestCombo: false,
      };
    } else {
      const record = recordEndlessResult(stage.id, finished.correct, finished.maxCombo);
      next = {
        mode: "endless", stars: 0, before: 0, improved: false, score: session.score, newBest: false,
        correct: finished.correct, mistakes: finished.mistakes, maxCombo: finished.maxCombo, defeated,
        newBestCorrect: record.newBestCorrect, newBestCombo: record.newBestCombo,
      };
    }
    setOutcome(next);
    setPhase("ending");
    play(defeated ? "incorrect" : "allCorrect");
    schedule(() => {
      setPhase("result");
      setNewFriendOpen(next.mode === "minute" && next.before === 0 && next.stars > 0);
    }, ENDING_MS);
  }

  // 毎回の描画で最新の endRun を ref に入れ直す（rAF ループから、常に最新の speed.finish を呼べるようにする）
  useEffect(() => {
    endRunRef.current = endRun;
  });

  if (!stage || !rule) return <StageNotFound />;
  const current = stage;
  const stars = progress.stars[current.id] ?? 0;

  function start(selected: SeedRunMode) {
    const fresh = createDivModRun(rule!, selected);
    runRef.current = fresh;
    endedRef.current = false;
    problemStartRef.current = performance.now();
    setMode(selected);
    setRun(fresh);
    setOutcome(null);
    setActive("quotient");
    setQuotientValue("");
    setRemainderValue("");
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
  }

  function retry() {
    speed.reset();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.length = 0;
    start(mode);
  }

  function handleDigit(digit: string) {
    if (active === "quotient") setQuotientValue((v) => appendDigit(v, digit, MAX_LEN));
    else setRemainderValue((v) => appendDigit(v, digit, MAX_LEN));
  }

  function handleBackspace() {
    if (active === "quotient") setQuotientValue((v) => removeLastDigit(v));
    else setRemainderValue((v) => removeLastDigit(v));
  }

  function submitAnswer() {
    const live = runRef.current;
    if (phase !== "playing" || !live || !canSubmit(quotientValue) || !canSubmit(remainderValue)) return;
    const elapsedMs = performance.now() - problemStartRef.current;
    const out = answerDivMod(live, Number(quotientValue), Number(remainderValue), rule!);
    runRef.current = out.run;
    setRun(out.run);
    speed.submit(out.correct, Number.POSITIVE_INFINITY, 0, elapsedMs);
    play(out.correct ? "correct" : "incorrect");
    if (!out.correct) {
      setShaking(true);
      schedule(() => setShaking(false), SHAKE_MS);
    }
    problemStartRef.current = performance.now();
    setActive("quotient");
    setQuotientValue("");
    setRemainderValue("");
    if (out.run.status !== "playing" && !endedRef.current) endRun(out.run);
  }

  if (phase === "select") {
    return <SeedModeSelect stage={current} stars={stars} endlessBest={progress.endless[current.id]} onSelect={start} />;
  }
  if (phase === "result" && outcome) {
    if (newFriendOpen) {
      return <NewFriend stage={current} stars={outcome.stars} onClose={() => setNewFriendOpen(false)} />;
    }
    return <SeedResult stage={current} outcome={outcome} onRetry={retry} />;
  }

  const inFever = speed.session.feverLeft > 0;
  const live = run;
  const leftSec = live && mode === "minute" ? Math.max(0, Math.ceil((roundMs - live.playedMs) / 1000)) : null;
  const playing = phase === "playing";
  const activeValue = active === "quotient" ? quotientValue : remainderValue;

  return (
    <main
      data-phase={phase}
      data-fever={inFever ? "true" : "false"}
      className="relative isolate flex flex-1 flex-col gap-2 pb-4"
    >
      <FeverStage active={inFever} />
      <header className="flex items-center gap-2 px-3 pt-3">
        <Link
          href={modeHref(current.mode, { stageId: current.id })}
          aria-label="やめる"
          className={appButtonVariants({ variant: "cream", size: "icon" })}
        >
          <X className="h-6 w-6" strokeWidth={3} />
        </Link>
        <HpGauge value={live?.hp ?? INITIAL_HP} max={INITIAL_HP} />
        <span
          data-testid="seed-time"
          className={cn(
            "ml-auto rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black",
            leftSec !== null && leftSec <= 10 && "text-destructive"
          )}
        >
          {leftSec !== null ? `のこり ${leftSec}びょう` : `${live?.correct ?? 0}もん`}
        </span>
      </header>
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={speed.session.gauge} feverLeft={speed.session.feverLeft} />
        <ScoreCounter score={speed.session.score} />
      </div>
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-3 px-3 py-4",
          shaking && "animate-shake"
        )}
      >
        <Image src={SPRU_POSES[shaking ? "sad" : "think"]} alt="" width={64} height={80} className="h-14 w-auto" />
        <ComboText combo={speed.session.combo} />
        {live && (
          <p data-testid="seed" className="font-display text-3xl font-black tabular-nums">
            {live.problem.a} ÷ {live.problem.b} ＝
          </p>
        )}
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => setActive("quotient")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2",
              active === "quotient" ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/60"
            )}
          >
            <span className="font-display text-2xl font-black tabular-nums">{quotientValue || " "}</span>
            <span className="text-xs font-bold text-muted-foreground">しょう</span>
          </button>
          <span className="pb-5 font-display text-xl font-black">あまり</span>
          <button
            type="button"
            onClick={() => setActive("remainder")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2",
              active === "remainder" ? "bg-primary/20 ring-2 ring-primary" : "bg-muted/60"
            )}
          >
            <span className="font-display text-2xl font-black tabular-nums">{remainderValue || " "}</span>
            <span className="text-xs font-bold text-muted-foreground">あまり</span>
          </button>
        </div>
        <PointsPopup gain={speed.lastGain} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={activeValue}
          onChange={(next) => {
            // appendDigit/removeLastDigit は「今えらんでいる欄」の value から作られた新しい文字列。
            // 桁数いっぱいで appendDigit が変わらず返すこともあるため、長さが減ったときだけ消す
            if (next.length > activeValue.length) handleDigit(next.slice(-1));
            else if (next.length < activeValue.length) handleBackspace();
          }}
          onSubmit={submitAnswer}
          disabled={!playing}
          maxLength={MAX_LEN}
        />
      </div>
      <FeverBanner show={speed.banner} />
      {phase === "countdown" && <CountdownBanner count={count} />}
      {phase === "ending" && <TimeUpBanner />}
    </main>
  );
}
