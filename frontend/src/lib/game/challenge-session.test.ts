import { expect, it } from "vitest";

import { answerChallenge, INITIAL_CHALLENGE, type ChallengeState } from "@/lib/game/challenge-session";

function run(answers: boolean[], from: ChallengeState = INITIAL_CHALLENGE): ChallengeState {
  return answers.reduce((state, correct) => answerChallenge(state, correct).state, from);
}

it("段1・0問から始まる", () => {
  expect(INITIAL_CHALLENGE).toEqual({ level: 1, streak: 0, topLevel: 1, correctCount: 0 });
});

it("2問続けて正解すると1段上がり、続けた数は0から数え直す", () => {
  const first = answerChallenge(INITIAL_CHALLENGE, true);
  expect(first).toEqual({ state: { level: 1, streak: 1, topLevel: 1, correctCount: 1 }, leveledUp: false, leveledDown: false });
  const second = answerChallenge(first.state, true);
  expect(second).toEqual({ state: { level: 2, streak: 0, topLevel: 2, correctCount: 2 }, leveledUp: true, leveledDown: false });
});

it("間違えると1段下がり、続けた数も0に戻る（いちばん高かった段と正解の数はそのまま）", () => {
  const from: ChallengeState = { level: 3, streak: 1, topLevel: 3, correctCount: 5 };
  expect(answerChallenge(from, false)).toEqual({
    state: { level: 2, streak: 0, topLevel: 3, correctCount: 5 },
    leveledUp: false,
    leveledDown: true,
  });
});

it("段1より下・段12より上にならない", () => {
  expect(answerChallenge(INITIAL_CHALLENGE, false)).toEqual({
    state: INITIAL_CHALLENGE,
    leveledUp: false,
    leveledDown: false,
  });
  const top: ChallengeState = { level: 12, streak: 1, topLevel: 12, correctCount: 30 };
  const step = answerChallenge(top, true);
  expect(step.state.level).toBe(12);
  expect(step.leveledUp).toBe(false);
});

it("いちばん高かった段を覚える", () => {
  const state = run([true, true, true, true, false, false]);
  expect(state.level).toBe(1);
  expect(state.topLevel).toBe(3);
  expect(state.correctCount).toBe(4);
});
