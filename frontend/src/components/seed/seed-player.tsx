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
import { SeedFieldView, type Bloom } from "@/components/seed/seed-field-view";
import { SeedModeSelect } from "@/components/seed/seed-mode-select";
import { SeedResult, type SeedOutcome } from "@/components/seed/seed-result";
import { getStage } from "@/data/stages/catalog";
import { INITIAL_HP } from "@/lib/game/hp";
import { MAX_TICK_MS, type SeedFieldConfig } from "@/lib/game/seed-field";
import { createRun, stepRun, tapRun, type SeedEvent, type SeedRun, type SeedRunMode } from "@/lib/game/seed-run";
import { SEED_ROUND_MS, starsForSeedRun } from "@/lib/game/seed-stars";
import { modeHref } from "@/lib/mode-params";
import { recordEndlessResult, recordStageResult, rememberLastMode, useProgress } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
const ENDING_MS = 1500;
const BLOOM_MS = 700;
const SHAKE_MS = 350;

type Phase = "select" | "countdown" | "playing" | "ending" | "result";

export function SeedPlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "seed" ? found : undefined;
  const { play } = useSound();
  const progress = useProgress();

  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<SeedRunMode>("minute");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [round, setRound] = useState(0);
  const [run, setRun] = useState<SeedRun | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [blooms, setBlooms] = useState<Bloom[]>([]);
  const [shaking, setShaking] = useState(false);
  const [outcome, setOutcome] = useState<SeedOutcome | null>(null);
  const [newFriendOpen, setNewFriendOpen] = useState(false);

  // 種の動きは run を正とし、描画のたびに state へ写す（rAF の中では ref を読む）
  const runRef = useRef<SeedRun | null>(null);
  const queueRef = useRef<SeedEvent[]>([]);
  const endedRef = useRef(false);
  const bloomKeyRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const config: SeedFieldConfig | null = stage
    ? {
        rule: stage.rule.rule,
        fallMs: stage.rule.fallMs,
        simultaneous: stage.rule.simultaneous,
        single: stage.rule.single,
        blank: stage.rule.blank,
        roundMs: stage.rule.roundMs,
        layout: stage.rule.layout,
      }
    : null;
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

  // カウントダウン
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setTimeout(() => (count > 0 ? setCount(count - 1) : setPhase("playing")), COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, count]);

  // 種を落とす。dt は足し合わせた時間（stepRun が MAX_TICK_MS に切るので、タブ復帰でも一気に落ちない）
  useEffect(() => {
    if (phase !== "playing" || !config) return;
    const cfg = config;
    let last = performance.now();
    let frame = 0;
    function loop(now: number) {
      const current = runRef.current;
      if (current && current.status === "playing") {
        const out = stepRun(current, Math.min(now - last, MAX_TICK_MS), cfg);
        runRef.current = out.run;
        queueRef.current.push(...out.events);
        setRun(out.run);
      }
      last = now;
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // config は stage から決まり、遊んでいる間は変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  // 記録はここで1回だけ行う（endedRef）。描画の副作用に置くと、開発時の二重実行で2回走る
  function endRun(finished: SeedRun) {
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
    setInputValue("");
    setPhase("ending");
    play(defeated ? "incorrect" : "allCorrect");
    schedule(() => {
      setPhase("result");
      // 初めて★1以上になったときだけ「なかまに なった！」を先に出す
      setNewFriendOpen(next.mode === "minute" && next.before === 0 && next.stars > 0);
    }, ENDING_MS);
  }

  // 描画のたびに、たまった出来事を1つずつ点数・ゲージに反映する（speed.submit は直前の状態から計算するため、1回の描画で1つ）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const event = queueRef.current.shift();
    if (event) {
      if (event.kind === "correct") {
        speed.submit(true, Number.POSITIVE_INFINITY, 0, event.seed.ageMs);
        play("correct");
        const key = (bloomKeyRef.current += 1);
        setBlooms((list) => [...list, { key, lane: event.seed.lane, progress: event.seed.progress }]);
        schedule(() => setBlooms((list) => list.filter((b) => b.key !== key)), BLOOM_MS);
      } else {
        speed.submit(false, Number.POSITIVE_INFINITY, 0, 0);
        play("incorrect");
        setShaking(true);
        schedule(() => setShaking(false), SHAKE_MS);
      }
    }
    // 終わりの処理は、たまった出来事を全部反映してから1回だけ行う
    const current = runRef.current;
    if (phase === "playing" && current && current.status !== "playing" && queueRef.current.length === 0 && !event && !endedRef.current) {
      endRun(current);
    }
  });

  if (!stage || !config) return <StageNotFound />;
  const current = stage;
  const stars = progress.stars[current.id] ?? 0;

  function start(selected: SeedRunMode) {
    const fresh = createRun(config as SeedFieldConfig, selected);
    runRef.current = fresh;
    queueRef.current = [];
    endedRef.current = false;
    setMode(selected);
    setRun(fresh);
    setBlooms([]);
    setOutcome(null);
    setInputValue("");
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
    setRound((n) => n + 1);
  }

  function retry() {
    speed.reset();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.length = 0;
    start(mode);
  }

  function tap(seedId: number) {
    const live = runRef.current;
    if (phase !== "playing" || !live || inputValue === "") return;
    play("throw");
    const out = tapRun(live, seedId, Number(inputValue));
    runRef.current = out.run;
    queueRef.current.push(...out.events);
    setRun(out.run);
    setInputValue("");
  }

  // OK は、打った答えと合う種をタップするのと同じ（合う種が無ければ、いちばん下の種を外したことにする）
  function submitInput() {
    const live = runRef.current;
    if (phase !== "playing" || !live || inputValue === "" || live.field.seeds.length === 0) return;
    const match = live.field.seeds.find((s) => s.problem.answer === Number(inputValue));
    const lowest = [...live.field.seeds].sort((a, b) => b.progress - a.progress)[0];
    tap((match ?? lowest).id);
  }

  if (phase === "select") {
    return (
      <SeedModeSelect stage={current} stars={stars} endlessBest={progress.endless[current.id]} onSelect={start} />
    );
  }
  if (phase === "result" && outcome) {
    if (newFriendOpen) {
      return <NewFriend stage={current} stars={outcome.stars} onClose={() => setNewFriendOpen(false)} />;
    }
    return <SeedResult stage={current} outcome={outcome} onRetry={retry} />;
  }

  const inFever = speed.session.feverLeft > 0;
  const live = run;
  const leftSec = live && mode === "minute" ? Math.max(0, Math.ceil(((config.roundMs ?? SEED_ROUND_MS) - live.playedMs) / 1000)) : null;
  const playing = phase === "playing";

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
      <Panel className={cn("relative mx-4 flex items-center justify-center gap-3 px-3 py-1", shaking && "animate-shake")}>
        <Image src={SPRU_POSES[shaking ? "sad" : "think"]} alt="" width={48} height={60} className="h-9 w-auto" />
        <ComboText combo={speed.session.combo} />
        <p className="min-w-24 rounded-2xl bg-muted/60 px-4 py-0.5 text-center font-display text-3xl font-black tabular-nums">
          {inputValue || " "}
        </p>
        <PointsPopup gain={speed.lastGain} />
      </Panel>
      <SeedFieldView
        seeds={live && playing ? live.field.seeds : []}
        blooms={blooms}
        color={current.color}
        single={config.single === true}
        onTap={tap}
        disabled={!playing}
      />
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={submitInput}
          disabled={!playing}
          maxLength={3}
          size="md"
        />
      </div>
      <FeverBanner show={speed.banner} />
      <span key={round} className="hidden" />
      {phase === "countdown" && <CountdownBanner count={count} />}
      {phase === "ending" && <TimeUpBanner />}
    </main>
  );
}
