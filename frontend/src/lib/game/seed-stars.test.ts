import { describe, expect, it } from "vitest";

import { roundLabel, starsForSeedRun, type SeedThresholds } from "@/lib/game/seed-stars";

const t: SeedThresholds = [8, 14, 20, 26, 32];
const stars = (correct: number, mistakes = 0, defeated = false) =>
  starsForSeedRun({ correct, mistakes, defeated, thresholds: t });

describe("starsForSeedRun", () => {
  it("正解数が目標に届いた数が★になる", () => {
    expect(stars(7)).toBe(0);
    expect(stars(8)).toBe(1);
    expect(stars(20)).toBe(3);
    expect(stars(32)).toBe(5);
    expect(stars(40)).toBe(5);
  });
  it("ミス3回以上で★が1つ減る。2回までは減らない", () => {
    expect(stars(20, 2)).toBe(3);
    expect(stars(20, 3)).toBe(2);
    expect(stars(32, 9)).toBe(4);
  });
  it("★1はミスが多くても残る。1つも届かなければ0", () => {
    expect(stars(8, 9)).toBe(1);
    expect(stars(3, 9)).toBe(0);
  });
  it("HPが0で終わったら0", () => {
    expect(stars(40, 0, true)).toBe(0);
  });
});

it("roundLabel は 1ぷん / 2ふん と読む", () => {
  expect(roundLabel(60_000)).toBe("1ぷん");
  expect(roundLabel(120_000)).toBe("2ふん");
});
