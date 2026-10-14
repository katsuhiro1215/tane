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
import { getStage, PROBLEMS_PER_STAGE, type ArithmeticStage } from "@/data/stages/catalog";
import { generateProblems, type Operator, type Problem } from "@/lib/game/problem-rules";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { mistakesOf, starsForResult } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";
import { recordStageResult, rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";

const FEEDBACK_DELAY_MS = 600;

const OPERATOR_SYMBOL: Record<Operator, string> = { add: "＋", sub: "−", mul: "×", div: "÷" };

function newStage(stage: ArithmeticStage): StageState<Problem> {
  return createStage(generateProblems(stage.rule, PROBLEMS_PER_STAGE));
}

export function StagePlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "arithmetic" ? found : undefined;
  const { play } = useSound();

  // 問題は Math.random で作るため、StagePlayerLoader が ssr: false・key={stageId} で読み込む
  const [state, setState] = useState<StageState<Problem> | null>(() => (stage ? newStage(stage) : null));
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

  if (!stage || !state) return <StageNotFound />;
  const current = stage;

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || state.status !== "in-progress") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        const stars = starsForResult(next.status, mistakesOf(next));
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

  const problem = currentProblem(state);

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
        {problem && (
          <p className="font-display text-4xl font-black tracking-wide">
            {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
          </p>
        )}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} disabled={feedback !== null} />
      </div>
    </main>
  );
}
