import { describe, expect, it } from "vitest";

import { getStage, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { favoriteText, modeBloom, nextGrowthText, unlockHint } from "@/lib/game/friends";
import type { StarMap } from "@/lib/game/progression";

function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 = 3): StarMap {
  return Object.fromEntries(stagesOfMode(mode).slice(0, n).map((s) => [s.id, value]));
}

it("nextGrowthText は次の段階を出し、花なら まんかい", () => {
  expect(nextGrowthText(0)).toBeNull();
  expect(nextGrowthText(1)).toBe("★2で つぼみに なるよ");
  expect(nextGrowthText(2)).toBe("★3で はなが さくよ");
  expect(nextGrowthText(3)).toBe("まんかい！");
});

describe("modeBloom", () => {
  it("★3の子の数と、コンプリートまでの残り", () => {
    expect(modeBloom("add", {})).toEqual({ bloomed: 0, total: 12, complete: false, left: 12 });
    expect(modeBloom("add", { ...cleared("add", 8), "add-9": 2 })).toEqual({ bloomed: 8, total: 12, complete: false, left: 4 });
  });

  it("全員★3でコンプリート。フラッシュは6体", () => {
    expect(modeBloom("add", cleared("add", 12))).toEqual({ bloomed: 12, total: 12, complete: true, left: 0 });
    expect(modeBloom("flash", cleared("flash", 6))).toEqual({ bloomed: 6, total: 6, complete: true, left: 0 });
  });

  it("ほかのあそびの★は数えない", () => {
    expect(modeBloom("sub", cleared("add", 12)).bloomed).toBe(0);
  });
});

it("favoriteText と unlockHint はステージの名前・あそび・番号から作る", () => {
  expect(favoriteText(getStage("add-3")!)).toBe("くりあがり（たしざん 3）");
  expect(favoriteText(getStage("flash-6")!)).toBe("ボス 2けた（フラッシュ 6）");
  expect(unlockHint(getStage("mul-4")!)).toBe("かけざん 4を クリアすると なかまに なるよ");
});
