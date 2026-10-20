import { describe, expect, it } from "vitest";

import { colorForStage, NORMAL_COLORS, RARE_COLORS, SPRU_COLORS } from "@/data/stages/colors";

describe("色の出し方（ノーマルを先に、レアは5つ目から）", () => {
  it("ノーマルとレアが、全部の色と重ならずに分かれている", () => {
    const all = [...NORMAL_COLORS, ...RARE_COLORS];
    expect(new Set(all).size).toBe(all.length);
    for (const color of all) expect(SPRU_COLORS).toContain(color);
  });

  it("1〜4つ目はノーマルだけ", () => {
    for (let mode = 0; mode < 6; mode++) {
      for (let index = 0; index < 4; index++) expect(NORMAL_COLORS).toContain(colorForStage(mode, index));
    }
  });

  it("5つ目が最初のレア、その後もときどきレアが混ざる", () => {
    for (let mode = 0; mode < 6; mode++) {
      expect(RARE_COLORS).toContain(colorForStage(mode, 4));
      const rare = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((i) => RARE_COLORS.includes(colorForStage(mode, i) as never));
      expect(rare).toEqual([4, 7, 10]);
    }
  });

  it("あそびごとに1つ目の色がちがう", () => {
    const firsts = [0, 1, 2, 3, 4, 5].map((mode) => colorForStage(mode, 0));
    expect(new Set(firsts).size).toBeGreaterThanOrEqual(5);
  });
});
