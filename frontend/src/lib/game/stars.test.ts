import { describe, expect, it } from "vitest";

import { getStage } from "@/data/stages/catalog";
import {
  growthForStage,
  growthForStars,
  missedThreeByMs,
  mistakesOf,
  starsForResult,
  type Stars,
  type StageResultInput,
} from "@/lib/game/stars";

const result = (overrides: Partial<StageResultInput>): StageResultInput => ({
  status: "cleared",
  mistakes: 0,
  elapsedMs: 50_000,
  targetMs: 80_000,
  ...overrides,
});

describe("starsForResult", () => {
  it("ミスなし かつ 目標タイム以内で★3（ちょうども含む）", () => {
    expect(starsForResult(result({}))).toBe(3);
    expect(starsForResult(result({ elapsedMs: 80_000 }))).toBe(3);
  });

  it("ミスなしでも目標タイムを過ぎたら★2", () => {
    expect(starsForResult(result({ elapsedMs: 80_001 }))).toBe(2);
  });

  it("ミス1〜2回は★2、3回以上は★1（時間は関係ない）", () => {
    expect(starsForResult(result({ mistakes: 1 }))).toBe(2);
    expect(starsForResult(result({ mistakes: 2, elapsedMs: 999_999 }))).toBe(2);
    expect(starsForResult(result({ mistakes: 3 }))).toBe(1);
    expect(starsForResult(result({ mistakes: 4 }))).toBe(1);
  });

  it("失敗・途中は★0", () => {
    expect(starsForResult(result({ status: "failed" }))).toBe(0);
    expect(starsForResult(result({ status: "in-progress" }))).toBe(0);
  });
});

describe("missedThreeByMs", () => {
  it("ミスなしでクリアして時間を過ぎたときだけ、超えたミリ秒を返す", () => {
    expect(missedThreeByMs(result({ elapsedMs: 83_500 }))).toBe(3_500);
    expect(missedThreeByMs(result({}))).toBeNull();
    expect(missedThreeByMs(result({ mistakes: 1, elapsedMs: 90_000 }))).toBeNull();
    expect(missedThreeByMs(result({ status: "failed", elapsedMs: 90_000 }))).toBeNull();
  });
});

it("mistakesOf は答えた数 − 正解の数", () => {
  expect(mistakesOf({ currentIndex: 20, correctCount: 17 })).toBe(3);
});

it("growthForStars はタネ→芽→つぼみ→花", () => {
  expect([0, 1, 2, 3].map((s) => growthForStars(s as 0 | 1 | 2 | 3))).toEqual(["seed", "sprout", "bud", "flower"]);
});

describe("時間なしのステージ（targetMs が null）", () => {
  it("ミスなしでクリアすれば、どれだけ時間がかかっても★3", () => {
    expect(starsForResult(result({ targetMs: null, elapsedMs: 9_999_999 }))).toBe(3);
  });

  it("ミスがあれば時間なしでも★2・★1、失敗は★0", () => {
    expect(starsForResult(result({ targetMs: null, mistakes: 1 }))).toBe(2);
    expect(starsForResult(result({ targetMs: null, mistakes: 3 }))).toBe(1);
    expect(starsForResult(result({ targetMs: null, status: "failed" }))).toBe(0);
  });

  it("「あと○びょう」は出ない", () => {
    expect(missedThreeByMs(result({ targetMs: null, elapsedMs: 9_999_999 }))).toBeNull();
  });
});

describe("growthForStage", () => {
  it("既存のステージは ★1芽・★2つぼみ・★3花", () => {
    const add = getStage("add-1")!;
    expect([0, 1, 2, 3].map((n) => growthForStage(add, n as Stars))).toEqual(["seed", "sprout", "bud", "flower"]);
  });
  it("しそくえんざんは ★1〜2芽・★3つぼみ・★4〜5花", () => {
    const seed = getStage("shisoku-1")!;
    expect([0, 1, 2, 3, 4, 5].map((n) => growthForStage(seed, n as Stars))).toEqual([
      "seed", "sprout", "sprout", "bud", "flower", "flower",
    ]);
  });
});
