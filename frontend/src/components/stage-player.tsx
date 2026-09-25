"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/hp-gauge";
import { NumericKeypad } from "@/components/numeric-keypad";
import { growthStageFor, SpruCharacter } from "@/components/spru-character";
import { getNextStage, getStageById } from "@/data/problems/stages";
import { INITIAL_HP } from "@/lib/game/hp";
import type { Operator } from "@/lib/game/problem-generator";
import { generateStageProblems } from "@/lib/game/problem-generator";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { markStageCleared } from "@/lib/storage";

const FEEDBACK_DELAY_MS = 600;

function operatorSymbol(operator: Operator): string {
  switch (operator) {
    case "add":
      return "+";
    case "sub":
      return "−";
    case "mul":
      return "×";
    case "div":
      return "÷";
  }
}

export function StagePlayer({ stageId }: { stageId: string }) {
  const router = useRouter();
  const stageDefinition = getStageById(stageId);

  // 問題生成にはMath.randomを使うため、サーバー側でレンダーすると
  // クライアントと異なる問題が焼き込まれハイドレーション不一致になる。
  // このコンポーネントはStagePlayerLoader経由でssr:falseかつ
  // key={stageId}付きでマウントされる(ステージが変わるたびに
  // 新しいインスタンスとして再マウントされる)ため、レンダー中に
  // 一度だけ生成するlazy initializerで安全に問題を確定できる。
  const [state, setState] = useState<StageState | null>(() => {
    if (!stageDefinition) {
      return null;
    }
    const problems = generateStageProblems(stageDefinition.operator, stageDefinition.level);
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

  if (!stageDefinition) {
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

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    );
  }

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null) {
      return;
    }
    const problem = currentProblem(state);
    const isCorrect = Number(inputValue) === problem.answer;
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
    const nextStage = getNextStage(stageId);
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
              onClick={() => router.push(`/stage/${nextStage.id}`)}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
            >
              次のステージへ
            </button>
          )}
        </div>
      </div>
    );
  }

  const problem = currentProblem(state);

  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <div className="flex w-full items-center justify-between">
        <HpGauge value={state.hp} max={INITIAL_HP} />
        <span className="text-sm text-muted-foreground">
          {state.currentIndex + 1} / {state.problems.length}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center gap-6">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-20 w-20 shrink-0"
        />

        <div className="flex flex-col items-center gap-2">
          <p className="text-3xl font-bold">
            {problem.operandA} {operatorSymbol(problem.operator)} {problem.operandB} = ?
          </p>

          <p className="h-10 text-4xl font-mono">{inputValue || " "}</p>

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

        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null}
        />
      </div>
    </div>
  );
}
