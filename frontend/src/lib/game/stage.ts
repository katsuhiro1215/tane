import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";

export type StageStatus = "in-progress" | "cleared" | "failed";

export interface StageState<T extends { answer: number }> {
  problems: T[];
  currentIndex: number;
  hp: number;
  correctCount: number;
  status: StageStatus;
}

export function createStage<T extends { answer: number }>(problems: T[]): StageState<T> {
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

export function currentProblem<T extends { answer: number }>(state: StageState<T>): T {
  return state.problems[state.currentIndex];
}

export function submitAnswer<T extends { answer: number }>(
  state: StageState<T>,
  answer: number
): StageState<T> {
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
