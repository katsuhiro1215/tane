import { describe, expect, it } from "vitest";

import { getStage } from "@/data/stages/catalog";
import {
  CHALLENGE_MODE_IDS,
  isChallengeModeId,
  isTimeUp,
  levelPoints,
  levelRule,
  MAX_LEVEL,
  medalFor,
  medalRank,
  nextMedalGoal,
  nextProblem,
  remainingMs,
  secondsFor,
} from "@/lib/game/challenge-rules";
import { satisfiesRule, type Operator, type Problem } from "@/lib/game/problem-rules";

function ruleOf(id: string) {
  const stage = getStage(id);
  if (stage?.kind !== "arithmetic") throw new Error(id);
  return stage.rule;
}

/** 決まった並びの乱数（mulberry32） */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const problem = (operator: Operator): Problem => ({ operator, operandA: 1, operandB: 1, answer: 0 });

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

it("isChallengeModeId は計算4つとまぜまぜだけ", () => {
  expect(CHALLENGE_MODE_IDS.every(isChallengeModeId)).toBe(true);
  expect(isChallengeModeId("mix")).toBe(true);
  expect(isChallengeModeId("flash")).toBe(false);
  expect(isChallengeModeId("foo")).toBe(false);
});

describe("levelRule", () => {
  it("段nは、そのあそびのステージnのルール（段12はボス）", () => {
    expect(levelRule("add", 3)).toBe(ruleOf("add-3"));
    expect(levelRule("div", 12)).toBe(ruleOf("div-12"));
  });

  it("まぜまぜの段nは、4つのあそびのステージnを混ぜたルール", () => {
    expect(levelRule("mix", 5)).toEqual({
      op: "mix",
      rules: [ruleOf("add-5"), ruleOf("sub-5"), ruleOf("mul-5"), ruleOf("div-5")],
    });
  });

  it("どのあそびの、どの段でもルールがある", () => {
    for (const mode of CHALLENGE_MODE_IDS) {
      for (const level of LEVELS) expect(() => levelRule(mode, level)).not.toThrow();
    }
  });
});

describe("secondsFor", () => {
  it("その段のステージの目安の秒数", () => {
    expect(secondsFor("add", 5, problem("add"))).toBe(6);
    expect(secondsFor("mul", 11, problem("mul"))).toBe(12);
    // まぜまぜでないあそびは、出た問題の計算に関係なくそのあそびの値（ボスの混ざった問題でも）
    expect(secondsFor("add", 12, problem("sub"))).toBe(8);
  });

  it("まぜまぜは、出た問題の計算のステージの値", () => {
    expect(secondsFor("mix", 1, problem("add"))).toBe(4);
    expect(secondsFor("mix", 1, problem("div"))).toBe(5);
    expect(secondsFor("mix", 11, problem("add"))).toBe(10);
    expect(secondsFor("mix", 11, problem("div"))).toBe(14);
  });
});

it("levelPoints は（段−1）×20", () => {
  expect(levelPoints(1)).toBe(0);
  expect(levelPoints(2)).toBe(20);
  expect(levelPoints(12)).toBe(220);
});

describe("nextProblem", () => {
  it("その段のルールに合う問題を作る", () => {
    for (const mode of CHALLENGE_MODE_IDS) {
      for (const level of LEVELS) {
        const made = nextProblem(mode, level, null, seeded(level));
        expect(satisfiesRule(made, levelRule(mode, level))).toBe(true);
      }
    }
  });

  it("まぜまぜでは4つの計算が混ざって出る", () => {
    const rng = seeded(1);
    const operators = new Set(Array.from({ length: 200 }, () => nextProblem("mix", 3, null, rng).operator));
    expect(operators.size).toBe(4);
  });

  it("前と同じ問題が続かない", () => {
    const rng = seeded(7);
    let previous: Problem | null = null;
    for (let i = 0; i < 200; i++) {
      const made = nextProblem("add", 1, previous, rng);
      if (previous) expect(made).not.toEqual(previous);
      previous = made;
    }
  });
});

describe("メダル", () => {
  it("medalFor は最高点で決まる（境目ちょうどで取れる）", () => {
    expect(medalFor("add", null)).toBeNull();
    expect(medalFor("add", 1499)).toBeNull();
    expect(medalFor("add", 1500)).toBe("bronze");
    expect(medalFor("add", 2999)).toBe("bronze");
    expect(medalFor("add", 3000)).toBe("silver");
    expect(medalFor("add", 4499)).toBe("silver");
    expect(medalFor("mix", 4500)).toBe("gold");
  });

  it("わりざんは低め", () => {
    expect(medalFor("div", 999)).toBeNull();
    expect(medalFor("div", 1000)).toBe("bronze");
    expect(medalFor("div", 2000)).toBe("silver");
    expect(medalFor("div", 3500)).toBe("gold");
  });

  it("medalRank は無し0・銅1・銀2・金3", () => {
    expect([null, "bronze", "silver", "gold"].map((m) => medalRank(m as never))).toEqual([0, 1, 2, 3]);
  });

  it("nextMedalGoal は次のメダルと、あと何点か。金なら無し", () => {
    expect(nextMedalGoal("add", 0)).toEqual({ medal: "bronze", pointsLeft: 1500 });
    expect(nextMedalGoal("add", 1200)).toEqual({ medal: "bronze", pointsLeft: 300 });
    expect(nextMedalGoal("add", 1500)).toEqual({ medal: "silver", pointsLeft: 1500 });
    expect(nextMedalGoal("add", 4499)).toEqual({ medal: "gold", pointsLeft: 1 });
    expect(nextMedalGoal("add", 4500)).toBeNull();
    expect(nextMedalGoal("div", 3400)).toEqual({ medal: "gold", pointsLeft: 100 });
  });
});

describe("残り時間", () => {
  it("60秒から使った時間を引く。0未満にならない", () => {
    expect(remainingMs(0)).toBe(60_000);
    expect(remainingMs(59_500)).toBe(500);
    expect(remainingMs(61_000)).toBe(0);
  });

  it("60秒ちょうどで時間切れ", () => {
    expect(isTimeUp(59_999)).toBe(false);
    expect(isTimeUp(60_000)).toBe(true);
  });
});
