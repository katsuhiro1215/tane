import { MAX_LEVEL, STREAK_TO_LEVEL_UP } from "@/lib/game/challenge-rules";

export interface ChallengeState {
  level: number;
  streak: number;
  topLevel: number;
  correctCount: number;
}

export const INITIAL_CHALLENGE: ChallengeState = { level: 1, streak: 0, topLevel: 1, correctCount: 0 };

export interface ChallengeStep {
  state: ChallengeState;
  leveledUp: boolean;
  leveledDown: boolean;
}

export function answerChallenge(state: ChallengeState, correct: boolean): ChallengeStep {
  if (!correct) {
    const level = Math.max(1, state.level - 1);
    return { state: { ...state, level, streak: 0 }, leveledUp: false, leveledDown: level < state.level };
  }
  const streak = state.streak + 1;
  const leveledUp = streak >= STREAK_TO_LEVEL_UP && state.level < MAX_LEVEL;
  const level = leveledUp ? state.level + 1 : state.level;
  return {
    state: {
      level,
      streak: leveledUp ? 0 : streak,
      topLevel: Math.max(state.topLevel, level),
      correctCount: state.correctCount + 1,
    },
    leveledUp,
    leveledDown: false,
  };
}
