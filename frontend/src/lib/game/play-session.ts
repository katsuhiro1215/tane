import {
  BASE_POINTS,
  FEVER_MULTIPLIER,
  FEVER_PROBLEMS,
  GAUGE_CORRECT,
  GAUGE_FAST_BONUS,
  GAUGE_MAX,
  GAUGE_WRONG,
  MAX_SPEED_POINTS,
} from "@/lib/game/play-rules";

export interface PlaySession {
  gauge: number;
  feverLeft: number;
  score: number;
  combo: number;
  elapsedMs: number;
  answered: number;
}

export const INITIAL_SESSION: PlaySession = { gauge: 0, feverLeft: 0, score: 0, combo: 0, elapsedMs: 0, answered: 0 };

export interface AnswerInput {
  correct: boolean;
  elapsedMs: number;
  secondsPerProblem: number;
  remainingAfter: number;
}

export interface AnswerOutcome {
  session: PlaySession;
  gained: number;
  inFever: boolean;
  feverStarted: boolean;
  feverEnded: boolean;
}

export function speedPoints(elapsedMs: number, secondsPerProblem: number): number {
  const targetMs = secondsPerProblem * 1000;
  const points = Math.floor((MAX_SPEED_POINTS * (targetMs - elapsedMs)) / targetMs);
  return Math.max(0, Math.min(MAX_SPEED_POINTS, points));
}

export function answer(session: PlaySession, input: AnswerInput): AnswerOutcome {
  const inFever = session.feverLeft > 0;
  const base = input.correct ? BASE_POINTS + speedPoints(input.elapsedMs, input.secondsPerProblem) : 0;
  const gained = inFever ? base * FEVER_MULTIPLIER : base;
  const common = {
    score: session.score + gained,
    combo: input.correct ? session.combo + 1 : 0,
    elapsedMs: session.elapsedMs + input.elapsedMs,
    answered: session.answered + 1,
  };

  if (inFever) {
    const feverLeft = session.feverLeft - 1;
    const feverEnded = feverLeft === 0;
    return {
      session: { ...common, gauge: feverEnded ? 0 : session.gauge, feverLeft },
      gained,
      inFever,
      feverStarted: false,
      feverEnded,
    };
  }

  const fast = input.elapsedMs < input.secondsPerProblem * 1000;
  const delta = input.correct ? GAUGE_CORRECT + (fast ? GAUGE_FAST_BONUS : 0) : GAUGE_WRONG;
  const gauge = Math.max(0, Math.min(GAUGE_MAX, session.gauge + delta));
  // 最後の問題で満タンになっても、続く問題が無いのでフィーバーにはしない
  const feverStarted = gauge >= GAUGE_MAX && input.remainingAfter > 0;
  return {
    session: { ...common, gauge, feverLeft: feverStarted ? Math.min(FEVER_PROBLEMS, input.remainingAfter) : 0 },
    gained,
    inFever,
    feverStarted,
    feverEnded: false,
  };
}
