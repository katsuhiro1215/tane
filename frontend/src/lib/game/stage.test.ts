import { describe, expect, it } from "vitest";

import type { Problem } from "@/lib/game/problem-rules";
import { createStage, currentProblem, submitAnswer } from "@/lib/game/stage";

function makeProblems(count: number): Problem[] {
  return Array.from({ length: count }, (_, i) => ({
    operator: "add" as const,
    operandA: i + 1,
    operandB: 1,
    answer: i + 2,
  }));
}

describe("createStage", () => {
  it("初期状態を作る", () => {
    const state = createStage(makeProblems(20));
    expect(state.currentIndex).toBe(0);
    expect(state.hp).toBe(5);
    expect(state.correctCount).toBe(0);
    expect(state.status).toBe("in-progress");
  });

  it("空の問題配列を渡すとエラーになる", () => {
    expect(() => createStage([])).toThrow();
  });
});

describe("submitAnswer", () => {
  it("正解すると次の問題に進み、HPは減らない", () => {
    const state = createStage(makeProblems(20));
    const problem = currentProblem(state);
    const next = submitAnswer(state, problem.answer);
    expect(next.currentIndex).toBe(1);
    expect(next.hp).toBe(5);
    expect(next.correctCount).toBe(1);
    expect(next.status).toBe("in-progress");
  });

  it("誤答するとHPが1減る", () => {
    const state = createStage(makeProblems(20));
    const next = submitAnswer(state, -999);
    expect(next.hp).toBe(4);
    expect(next.correctCount).toBe(0);
    expect(next.status).toBe("in-progress");
  });

  it("20問全問正解でclearedになる", () => {
    let state = createStage(makeProblems(20));
    for (let i = 0; i < 20; i++) {
      state = submitAnswer(state, currentProblem(state).answer);
    }
    expect(state.status).toBe("cleared");
    expect(state.correctCount).toBe(20);
  });

  it("HPが0になるとfailedになる", () => {
    let state = createStage(makeProblems(20));
    for (let i = 0; i < 5; i++) {
      state = submitAnswer(state, -999);
    }
    expect(state.hp).toBe(0);
    expect(state.status).toBe("failed");
  });

  it("最後の問題を誤答してHPが同時に0になった場合、clearedより先にfailedになる", () => {
    const lastProblemState = { ...createStage(makeProblems(1)), hp: 1 };
    const result = submitAnswer(lastProblemState, -999);
    expect(result.hp).toBe(0);
    expect(result.currentIndex).toBe(1);
    expect(result.status).toBe("failed");
  });

  it("in-progress以外の状態でsubmitAnswerを呼んでも状態は変化しない", () => {
    let state = createStage(makeProblems(1));
    state = submitAnswer(state, currentProblem(state).answer);
    expect(state.status).toBe("cleared");
    const after = submitAnswer(state, 0);
    expect(after).toEqual(state);
  });
});
