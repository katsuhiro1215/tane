"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { finishStage } from "@/components/play/finish-stage";
import { PlayHeader } from "@/components/play/play-header";
import { PointsPopup } from "@/components/play/points-popup";
import { SpeedHud } from "@/components/play/speed-hud";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { MitoriSheet } from "@/components/soroban/mitori-sheet";
import { SorobanAbacus } from "@/components/soroban/soroban-abacus";
import { SorobanProblemText } from "@/components/soroban/soroban-problem-text";
import { getStage, stageTargetMs, type SorobanStage } from "@/data/stages/catalog";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import {
  generateSorobanProblems,
  secondsFor,
  SOROBAN_MAX_ANSWER_LENGTH,
  type SorobanProblem,
} from "@/lib/game/soroban-rules";
import { modeHref } from "@/lib/mode-params";
import { rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 600;

function newStage(stage: SorobanStage): StageState<SorobanProblem> {
  return createStage(generateSorobanProblems(stage.rule));
}

export function SorobanPlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "soroban" ? found : undefined;
  const { play } = useSound();

  // 問題は Math.random で作るため、SorobanPlayerLoader が ssr: false・key={stageId} で読み込む
  const [state, setState] = useState<StageState<SorobanProblem> | null>(() => (stage ? newStage(stage) : null));
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [outcome, setOutcome] = useState<StageOutcome | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problem = state && state.status === "in-progress" ? currentProblem(state) : undefined;
  const speed = useSpeedPlay({
    // もぎけんていは問題ごとに種目がちがうので、いまの問題の種目の秒数を使う
    secondsPerProblem: stage && problem ? secondsFor(problem.event, stage.grade) : 1,
    answerable: state !== null && state.status === "in-progress" && feedback === null,
    questionKey: state?.currentIndex ?? 0,
  });

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage) rememberLastMode(stage.mode);
  }, [stage]);

  if (!stage || !state) return <StageNotFound />;
  const current = stage;

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || state.status !== "in-progress") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    const remainingAfter = next.status === "in-progress" ? next.problems.length - next.currentIndex : 0;
    const result = speed.submit(isCorrect, remainingAfter);
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        setOutcome(finishStage(current, next, result.session));
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    speed.reset();
    setState(newStage(current));
    setOutcome(null);
    setInputValue("");
  }

  if (state.status !== "in-progress" && outcome) {
    return (
      <StageResult
        stage={current}
        cleared={state.status === "cleared"}
        correctCount={state.correctCount}
        total={state.problems.length}
        outcome={outcome}
        onRetry={retry}
      />
    );
  }

  const inFever = speed.session.feverLeft > 0;

  return (
    <main data-fever={inFever ? "true" : "false"} className="relative isolate flex flex-1 flex-col gap-2 pb-4">
      <FeverStage active={inFever} />
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <SpeedHud session={speed.session} targetMs={stageTargetMs(current)} getElapsedMs={speed.getElapsedMs} />
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-1.5 px-3 py-2",
          feedback === "incorrect" && "animate-shake"
        )}
      >
        <ComboText combo={speed.session.combo} />
        {/* 正解のたびに跳ねる。key を答えた数にして、毎回動きを最初から始める */}
        <span key={speed.session.answered} className={feedback === "correct" ? "block animate-spru-hop" : "block"}>
          <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={64} height={80} className="h-14 w-auto" />
        </span>
        {problem?.event === "mitori" && <MitoriSheet terms={problem.terms} />}
        {problem && problem.event !== "mitori" && <SorobanProblemText problem={problem} />}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-4xl font-black tabular-nums">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
        <PointsPopup gain={feedback === "correct" ? speed.lastGain : null} />
        {/* 問題が変わるたびに0へ戻す。採点には使わない、自分で計算するための道具。
            key は同じ Panel 内の珠（key={speed.session.answered}）と重ならないよう接頭辞を付ける */}
        <SorobanAbacus key={`abacus-${state.currentIndex}`} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null}
          maxLength={SOROBAN_MAX_ANSWER_LENGTH}
        />
      </div>
      <FeverBanner show={speed.banner} />
    </main>
  );
}
