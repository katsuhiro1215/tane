import { describe, expect, it } from "vitest";

import { growthForStars, mistakesOf, starsForResult } from "@/lib/game/stars";

describe("starsForResult", () => {
  it("ミス0で★3、2回まで★2、それ以上は★1", () => {
    expect(starsForResult("cleared", 0)).toBe(3);
    expect(starsForResult("cleared", 1)).toBe(2);
    expect(starsForResult("cleared", 2)).toBe(2);
    expect(starsForResult("cleared", 3)).toBe(1);
    expect(starsForResult("cleared", 4)).toBe(1);
  });

  it("失敗・途中は★0", () => {
    expect(starsForResult("failed", 0)).toBe(0);
    expect(starsForResult("in-progress", 0)).toBe(0);
  });
});

it("mistakesOf は答えた数 − 正解の数", () => {
  expect(mistakesOf({ currentIndex: 20, correctCount: 17 })).toBe(3);
});

it("growthForStars はタネ→芽→つぼみ→花", () => {
  expect([0, 1, 2, 3].map((s) => growthForStars(s as 0 | 1 | 2 | 3))).toEqual(["seed", "sprout", "bud", "flower"]);
});
