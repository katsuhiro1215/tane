import { describe, expect, it } from "vitest";

import { roundLabel, seedResultNotes, starsForSeedRun, type SeedThresholds } from "@/lib/game/seed-stars";

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

describe("seedResultNotes（結果画面の見出しと案内）", () => {
  const base = { correct: 0, mistakes: 0, defeated: false, thresholds: t, unlockStars: 3 };

  it("★3以上だけ「ステージクリア！」。★1〜2は、★3で次が開くことを伝える", () => {
    expect(seedResultNotes({ ...base, stars: 3, correct: 20 }).title).toBe("ステージクリア！");
    const two = seedResultNotes({ ...base, stars: 2, correct: 14 });
    expect(two.title).not.toBe("ステージクリア！");
    expect(two.hints).toContain("★3で つぎの ステージが ひらくよ");
  });

  it("あと何問で次の★かを出す。ミスで★が減っているときは、数ではなくミスを減らすよう伝える", () => {
    expect(seedResultNotes({ ...base, stars: 1, correct: 10 }).hints).toContain("あと 4もんで ★2！");
    const penalized = seedResultNotes({ ...base, stars: 1, correct: 14, mistakes: 3 }).hints;
    expect(penalized.some((h) => h.startsWith("あと"))).toBe(false);
    expect(penalized).toContain("ミスを 2かいまでに すると ★が ふえるよ");
  });

  it("HPが0で終わったときは「ざんねん…」で、★の案内は出さない", () => {
    const notes = seedResultNotes({ ...base, stars: 0, correct: 30, defeated: true });
    expect(notes.title).toBe("ざんねん…");
    expect(notes.hints).toEqual(["HPが なくなると ★は もらえないよ"]);
  });

  it("★5は案内なし", () => {
    expect(seedResultNotes({ ...base, stars: 5, correct: 40 }).hints).toEqual([]);
  });
});
