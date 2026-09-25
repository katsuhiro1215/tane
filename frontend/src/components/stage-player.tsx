"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/hp-gauge";
import { LandscapeGuard } from "@/components/landscape-guard";
import { NumericKeypad } from "@/components/numeric-keypad";
import { growthStageFor, SpruCharacter } from "@/components/spru-character";
import { getStageById } from "@/data/problems/stages";
import { INITIAL_HP } from "@/lib/game/hp";
import type { Operator } from "@/lib/game/problem-generator";
import { generateStageProblems } from "@/lib/game/problem-generator";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { markStageCleared } from "@/lib/storage";

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

  const initialState = useMemo<StageState | null>(() => {
    if (!stageDefinition) {
      return null;
    }
    const problems = generateStageProblems(stageDefinition.operator, stageDefinition.level);
    return createStage(problems);
  }, [stageDefinition]);

  const [state, setState] = useState<StageState | null>(initialState);
  const [inputValue, setInputValue] = useState("");

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
    if (!state || inputValue === "") {
      return;
    }
    const next = submitAnswer(state, Number(inputValue));
    setState(next);
    setInputValue("");
    if (next.status === "cleared") {
      // stageDefinitionはこの関数に到達するまでの早期returnで保証済みだが、
      // TypeScriptはネストした関数宣言をまたいだナローイングを行わないため明示する。
      markStageCleared(stageDefinition!.id);
    }
  }

  if (state.status !== "in-progress") {
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

  const problem = currentProblem(state);

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-4 p-4">
      <LandscapeGuard />
      <div className="flex w-full items-center justify-between">
        <HpGauge value={state.hp} max={INITIAL_HP} />
        <span className="text-sm text-muted-foreground">
          {state.currentIndex + 1} / {state.problems.length}
        </span>
      </div>

      <SpruCharacter
        stage={growthStageFor(state.correctCount, state.problems.length)}
        className="h-24 w-24"
      />

      <p className="text-3xl font-bold">
        {problem.operandA} {operatorSymbol(problem.operator)} {problem.operandB} = ?
      </p>

      <p className="h-10 text-4xl font-mono">{inputValue || " "}</p>

      <NumericKeypad value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
    </div>
  );
}
