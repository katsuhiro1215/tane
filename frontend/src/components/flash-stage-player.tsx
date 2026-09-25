"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/hp-gauge";
import { NumericKeypad } from "@/components/numeric-keypad";
import { growthStageFor, SpruCharacter } from "@/components/spru-character";
import { getFlashStageById, getNextFlashStage } from "@/data/problems/flash-stages";
import {
  generateFlashStageProblems,
  type FlashLevel,
  type FlashProblem,
} from "@/lib/game/flash-problem";
import { INITIAL_HP } from "@/lib/game/hp";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { markStageCleared } from "@/lib/storage";
import { useFlashSequence } from "@/lib/use-flash-sequence";

const FEEDBACK_DELAY_MS = 600;

const LEVEL_TIMING: Record<FlashLevel, { stepMs: number; gapMs: number }> = {
  1: { stepMs: 1200, gapMs: 300 },
  2: { stepMs: 900, gapMs: 250 },
  3: { stepMs: 700, gapMs: 200 },
};

// useFlashSequenceのフォールバック引数に毎回新しいリテラル[]を渡すと、
// useEffectの依存配列が毎レンダー変わり無限に再スケジュールされてしまう
// (storage.tsのgetServerSnapshotで踏んだのと同種のバグ)。
// モジュールスコープの定数配列を使い参照を安定させる。
const EMPTY_SEQUENCE: number[] = [];

function formatFlashNumber(value: number, index: number): string {
  if (index === 0) {
    return String(value);
  }
  return value >= 0 ? `+${value}` : String(value);
}

export function FlashStagePlayer({ stageId }: { stageId: string }) {
  const router = useRouter();
  const stageDefinition = getFlashStageById(stageId);

  // 問題生成にはMath.randomを使うため、サーバー側でレンダーすると
  // クライアントと異なる問題が焼き込まれハイドレーション不一致になる。
  // このコンポーネントはFlashStagePlayerLoader経由でssr:falseかつ
  // key={stageId}付きでマウントされる(既存のStagePlayerと同じパターン)。
  const [state, setState] = useState<StageState<FlashProblem> | null>(() => {
    if (!stageDefinition) {
      return null;
    }
    const problems = generateFlashStageProblems(stageDefinition.level);
    return createStage(problems);
  });
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const timing = stageDefinition ? LEVEL_TIMING[stageDefinition.level] : undefined;
  const problem =
    state && state.status === "in-progress" ? currentProblem(state) : null;
  const flash = useFlashSequence(
    problem?.sequence ?? EMPTY_SEQUENCE,
    timing?.stepMs ?? 0,
    timing?.gapMs ?? 0
  );

  if (!stageDefinition || !state) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p>ステージが見つかりません</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
        >
          ステージ一覧に戻る
        </button>
      </div>
    );
  }

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || flash.phase !== "answering") {
      return;
    }
    const currentProb = currentProblem(state);
    const isCorrect = Number(inputValue) === currentProb.answer;
    const next = submitAnswer(state, Number(inputValue));

    setFeedback(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status === "cleared") {
        markStageCleared(stageId);
      }
    }, FEEDBACK_DELAY_MS);
  }

  if (state.status !== "in-progress") {
    const nextStage = getNextFlashStage(stageId);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-40 w-40"
        />
        <p className="text-2xl font-bold">
          {state.status === "cleared" ? "ステージクリア！" : "また挑戦しよう！"}
        </p>
        <p>
          {state.correctCount} / {state.problems.length} 問正解
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-secondary px-6 py-3 text-secondary-foreground"
          >
            ステージ一覧に戻る
          </button>
          {state.status === "cleared" && nextStage && (
            <button
              type="button"
              onClick={() => router.push(`/flash/${nextStage.id}`)}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
            >
              次のステージへ
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex w-full items-center justify-between">
        <HpGauge value={state.hp} max={INITIAL_HP} />
        <span className="text-sm text-muted-foreground">
          {state.currentIndex + 1} / {state.problems.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-20 w-20 shrink-0"
        />

        {flash.phase === "flashing" ? (
          <p className="flex h-16 items-center text-5xl font-bold">
            {flash.currentNumber !== null
              ? formatFlashNumber(flash.currentNumber, flash.index)
              : " "}
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold">合計は？</p>
            <p className="h-10 text-4xl font-mono">{inputValue || " "}</p>
          </>
        )}

        <p
          className={`h-8 text-xl font-bold ${
            feedback === "correct"
              ? "text-emerald-600"
              : feedback === "incorrect"
                ? "text-rose-600"
                : "text-transparent"
          }`}
        >
          {feedback === "correct" ? "せいかい！" : feedback === "incorrect" ? "ざんねん" : " "}
        </p>
      </div>

      <div className="flex w-full justify-center pb-2">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null || flash.phase !== "answering"}
        />
      </div>
    </div>
  );
}
