"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { PlayHeader } from "@/components/play/play-header";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { getStage, PROBLEMS_PER_STAGE, targetMs, type FlashStage } from "@/data/stages/catalog";
import { generateFlashStageProblems, type FlashProblem } from "@/lib/game/flash-problem";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { mistakesOf, starsForResult } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";
import { recordStageResult, rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { useFlashSequence } from "@/lib/use-flash-sequence";

const FEEDBACK_DELAY_MS = 600;

// useFlashSequence に毎回新しい [] を渡すと effect の依存が毎回変わり、表示が止まらなくなる
const EMPTY_SEQUENCE: number[] = [];

function formatFlashNumber(value: number, index: number): string {
  if (index === 0) return String(value);
  return value >= 0 ? `+${value}` : String(value);
}

function newStage(stage: FlashStage): StageState<FlashProblem> {
  return createStage(generateFlashStageProblems(stage.rule, PROBLEMS_PER_STAGE));
}

export function FlashStagePlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "flash" ? found : undefined;
  const { play } = useSound();

  // 問題は Math.random で作るため、FlashStagePlayerLoader が ssr: false・key={stageId} で読み込む
  const [state, setState] = useState<StageState<FlashProblem> | null>(() => (stage ? newStage(stage) : null));
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [outcome, setOutcome] = useState<StageOutcome | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage) rememberLastMode(stage.mode);
  }, [stage]);

  const problem = state && state.status === "in-progress" ? currentProblem(state) : null;
  const flash = useFlashSequence(
    problem?.sequence ?? EMPTY_SEQUENCE,
    stage?.rule.stepMs ?? 0,
    stage?.rule.gapMs ?? 0
  );

  if (!stage || !state) return <StageNotFound />;
  const current = stage;

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || flash.phase !== "answering") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        const stars = starsForResult({
          status: next.status,
          mistakes: mistakesOf(next),
          elapsedMs: 0,
          targetMs: targetMs(current),
        });
        const { improved, before } = recordStageResult(current.id, stars);
        setOutcome({ stars, improved, before });
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
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

  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <Panel className="mx-4 flex flex-1 flex-col items-center justify-center gap-2">
        <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        {flash.phase === "flashing" ? (
          <p className="flex h-24 items-center font-display text-6xl font-black">
            {flash.currentNumber !== null ? formatFlashNumber(flash.currentNumber, flash.index) : " "}
          </p>
        ) : (
          <>
            <p className="font-display text-2xl font-black">ぜんぶで いくつ？</p>
            <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
              {inputValue || " "}
            </p>
          </>
        )}
        <FeedbackText feedback={feedback} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null || flash.phase !== "answering"}
        />
      </div>
    </main>
  );
}
