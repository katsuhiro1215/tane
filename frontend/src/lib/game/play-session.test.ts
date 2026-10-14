import { describe, expect, it } from "vitest";

import { answer, INITIAL_SESSION, speedPoints, type AnswerInput, type PlaySession } from "@/lib/game/play-session";

const SLOW = 9000; // 目安(4秒)より遅い
const FAST = 1000; // 目安より速い
const input = (correct: boolean, elapsedMs: number, remainingAfter = 10): AnswerInput => ({
  correct,
  elapsedMs,
  secondsPerProblem: 4,
  remainingAfter,
});

/** 何回か答えたあとの状態 */
function play(answers: AnswerInput[], from: PlaySession = INITIAL_SESSION) {
  let session = from;
  const outcomes = answers.map((a) => {
    const outcome = answer(session, a);
    session = outcome.session;
    return outcome;
  });
  return { session, outcomes };
}

describe("speedPoints", () => {
  it("すぐ答えると100、目安ちょうど・それより遅いと0、半分なら50", () => {
    expect(speedPoints(0, 4)).toBe(100);
    expect(speedPoints(2000, 4)).toBe(50);
    expect(speedPoints(4000, 4)).toBe(0);
    expect(speedPoints(9000, 4)).toBe(0);
  });

  it("小数点以下は切り捨て", () => {
    expect(speedPoints(1000, 3)).toBe(66);
  });
});

describe("ゲージ", () => {
  it("正解で+10、速い正解で+15、不正解で−20（0未満にならない）", () => {
    expect(answer(INITIAL_SESSION, input(true, SLOW)).session.gauge).toBe(10);
    expect(answer(INITIAL_SESSION, input(true, FAST)).session.gauge).toBe(15);
    expect(answer({ ...INITIAL_SESSION, gauge: 30 }, input(false, FAST)).session.gauge).toBe(10);
    expect(answer({ ...INITIAL_SESSION, gauge: 5 }, input(false, FAST)).session.gauge).toBe(0);
  });

  it("100に届いたらフィーバーが始まり、5問続く", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW));
    expect(outcome.feverStarted).toBe(true);
    expect(outcome.inFever).toBe(false);
    expect(outcome.session.feverLeft).toBe(5);
    expect(outcome.session.gauge).toBe(100);
  });

  it("フィーバー中はゲージが増減せず、5問答えると終わって0に戻る", () => {
    const start = { ...INITIAL_SESSION, gauge: 100, feverLeft: 5 };
    const { session, outcomes } = play([input(true, FAST), input(false, FAST), input(true, SLOW), input(true, FAST), input(true, FAST)], start);
    expect(outcomes.map((o) => o.inFever)).toEqual([true, true, true, true, true]);
    expect(outcomes.slice(0, 4).map((o) => o.session.gauge)).toEqual([100, 100, 100, 100]);
    expect(outcomes[4].feverEnded).toBe(true);
    expect(session.feverLeft).toBe(0);
    expect(session.gauge).toBe(0);
  });

  it("残りの問題が5問より少なければ、残りの数だけ続く", () => {
    expect(answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW, 3)).session.feverLeft).toBe(3);
  });

  it("フィーバー中にステージが終わったら（失敗も含む）、フィーバーも終わる", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 100, feverLeft: 4 }, input(false, FAST, 0));
    expect(outcome.feverEnded).toBe(true);
    expect(outcome.session.feverLeft).toBe(0);
    expect(outcome.session.gauge).toBe(0);
  });

  it("最後の問題で満タンになってもフィーバーにはならない", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW, 0));
    expect(outcome.feverStarted).toBe(false);
    expect(outcome.session.feverLeft).toBe(0);
  });

  it("速く正解し続けると7問目で満タンになる（設計の目安）", () => {
    const { outcomes } = play(Array.from({ length: 7 }, () => input(true, FAST)));
    expect(outcomes.map((o) => o.feverStarted)).toEqual([false, false, false, false, false, false, true]);
  });
});

describe("点数・コンボ・時間", () => {
  it("正解は100＋速さの点、不正解は0", () => {
    expect(answer(INITIAL_SESSION, input(true, 2000)).gained).toBe(150);
    expect(answer(INITIAL_SESSION, input(false, 100)).gained).toBe(0);
  });

  it("フィーバー中は2倍", () => {
    expect(answer({ ...INITIAL_SESSION, gauge: 100, feverLeft: 3 }, input(true, 2000)).gained).toBe(300);
  });

  it("点数・時間・答えた数を足し上げ、コンボは不正解で0に戻る", () => {
    const { session, outcomes } = play([input(true, 2000), input(true, 4000), input(false, 1000), input(true, 4000)]);
    expect(session.score).toBe(150 + 100 + 0 + 100);
    expect(session.elapsedMs).toBe(11000);
    expect(session.answered).toBe(4);
    expect(outcomes.map((o) => o.session.combo)).toEqual([1, 2, 0, 1]);
  });
});
