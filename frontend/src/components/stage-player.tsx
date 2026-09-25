"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/hp-gauge";
import { NumericKeypad } from "@/components/numeric-keypad";
import { growthStageFor, SpruCharacter } from "@/components/spru-character";
import { getNextStage, getStageById } from "@/data/problems/stages";
import { INITIAL_HP } from "@/lib/game/hp";
import type { Operator, Problem } from "@/lib/game/problem-generator";
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
  const [state, setState] = useState<StageState<Problem> | null>(() => {
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-foreground">ステージが見つかりません</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border-b-4 border-[#C98A1B] bg-accent px-6 py-3 font-bold text-accent-foreground transition active:translate-y-[2px] active:border-b-2"
        >
          ステージ一覧に戻る
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-6">
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-6">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-40 w-40"
        />
        <p className="text-2xl font-bold text-foreground">
          {state.status === "cleared" ? "ステージクリア！" : "また挑戦しよう！"}
        </p>
        <p className="text-foreground">
          {state.correctCount} / {state.problems.length} 問正解
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border-b-4 border-border bg-secondary px-6 py-3 font-bold text-secondary-foreground transition active:translate-y-[2px] active:border-b-2"
          >
            ステージ一覧に戻る
          </button>
          {state.status === "cleared" && nextStage && (
            <button
              type="button"
              onClick={() => router.push(`/stage/${nextStage.id}`)}
              className="rounded-full border-b-4 border-[#C98A1B] bg-accent px-6 py-3 font-bold text-accent-foreground transition active:translate-y-[2px] active:border-b-2"
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
    <div className="flex flex-1 flex-col gap-4 bg-background p-4">
      <div className="flex w-full items-center justify-between">
        <HpGauge value={state.hp} max={INITIAL_HP} />
        <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-bold text-foreground">
          {state.currentIndex + 1} / {state.problems.length}
        </span>
      </div>

      {/* チョークボード風パネル。問題まわりは残りスペースの中で縦中央に
          配置し、キーパッドとの間に不自然な空白ができないようにする */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[28px] border-[6px] border-[#6B4226] bg-primary p-4">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-20 w-20 shrink-0"
        />

        <p className="text-3xl font-bold text-primary-foreground">
          {problem.operandA} {operatorSymbol(problem.operator)} {problem.operandB} = ?
        </p>

        <p className="h-10 text-4xl font-mono text-primary-foreground">{inputValue || " "}</p>

        <p
          className={`h-8 text-xl font-bold ${
            feedback === "correct"
              ? "text-emerald-300"
              : feedback === "incorrect"
                ? "text-rose-300"
                : "text-transparent"
          }`}
        >
          {feedback === "correct" ? "せいかい！" : feedback === "incorrect" ? "ざんねん" : " "}
        </p>
      </div>

      {/* キーパッドは画面下部、縦持ちで親指が届く位置に配置する */}
      <div className="flex w-full justify-center pb-2">
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
