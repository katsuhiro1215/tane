import { describe, expect, it } from "vitest";

import { colorForStage, NORMAL_COLORS, RARE_COLORS, SPRU_COLORS } from "@/data/stages/colors";

describe("色の出し方（ノーマルを先に、レアは4・8・12つ目）", () => {
  it("ノーマルとレアが、全部の色と重ならずに分かれている", () => {
    const all = [...NORMAL_COLORS, ...RARE_COLORS];
    expect(new Set(all).size).toBe(all.length);
    for (const color of all) expect(SPRU_COLORS).toContain(color);
  });

  it("1〜3つ目はノーマルだけ", () => {
    for (let mode = 0; mode < 6; mode++) {
      for (let index = 0; index < 3; index++) expect(NORMAL_COLORS).toContain(colorForStage(mode, index));
    }
  });

  it("4つ目が最初のレア、そのあとも4つごとにレアが混ざる", () => {
    for (let mode = 0; mode < 6; mode++) {
      expect(RARE_COLORS).toContain(colorForStage(mode, 3));
      const rare = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((i) => RARE_COLORS.includes(colorForStage(mode, i) as never));
      expect(rare).toEqual([3, 7, 11]);
    }
  });

  it("1つのあそびの中では、レアの色が重ならない", () => {
    for (let mode = 0; mode < 7; mode++) {
      const rares = [3, 7, 11, 15, 19, 23].map((i) => colorForStage(mode, i));
      expect(new Set(rares).size).toBe(rares.length);
    }
  });

  it("あそびごとに1つ目の色がちがう", () => {
    const firsts = [0, 1, 2, 3, 4, 5].map((mode) => colorForStage(mode, 0));
    expect(new Set(firsts).size).toBeGreaterThanOrEqual(5);
  });
});
