import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";
import type { Problem } from "@/lib/game/problem-generator";

export type StageStatus = "in-progress" | "cleared" | "failed";

export interface StageState {
  problems: Problem[];
  currentIndex: number;
  hp: number;
  correctCount: number;
  status: StageStatus;
}

export function createStage(problems: Problem[]): StageState {
  if (problems.length === 0) {
    throw new Error("problems must not be empty");
  }
  return {
    problems,
    currentIndex: 0,
    hp: INITIAL_HP,
    correctCount: 0,
    status: "in-progress",
  };
}

export function currentProblem(state: StageState): Problem {
  return state.problems[state.currentIndex];
}

export function submitAnswer(state: StageState, answer: number): StageState {
  if (state.status !== "in-progress") {
    return state;
  }

  const problem = currentProblem(state);
  const correct = answer === problem.answer;
  const hp = correct ? state.hp : applyDamage(state.hp);
  const correctCount = correct ? state.correctCount + 1 : state.correctCount;
  const nextIndex = state.currentIndex + 1;

  // HPが0になった場合は、全問終了と同時であってもfailedを優先する。
  let status: StageStatus = "in-progress";
  if (isDefeated(hp)) {
    status = "failed";
  } else if (nextIndex >= state.problems.length) {
    status = "cleared";
  }

  return {
    problems: state.problems,
    currentIndex: nextIndex,
    hp,
    correctCount,
    status,
  };
}
