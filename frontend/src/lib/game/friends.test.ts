import { describe, expect, it } from "vitest";

import { getStage, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { continueLabel, favoriteText, modeBloom, nextGrowthText, stageLabel, unlockHint } from "@/lib/game/friends";
import type { StarMap } from "@/lib/game/progression";

function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 | 4 | 5 = 3): StarMap {
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

it("そろばんは番号ではなく級と種目で呼ぶ（画面に番号を出していないため）", () => {
  const kake6 = getStage("soroban-16")!;
  expect(stageLabel(kake6)).toBe("6きゅう かけざん");
  expect(unlockHint(kake6)).toBe("6きゅう かけざんを クリアすると なかまに なるよ");
  expect(favoriteText(kake6)).toBe("6きゅう かけざん（あわせて 5けた）");
  expect(continueLabel(kake6)).toBe("そろばん ・ 6きゅう かけざん");
});

it("ほかのあそびの呼び方は今のまま", () => {
  expect(stageLabel(getStage("add-3")!)).toBe("たしざん 3");
  expect(continueLabel(getStage("add-3")!)).toBe("たしざん ステージ3 ・ くりあがり");
});

it("しそくえんざんは 1-1 の形で呼び、育ちの文も★5まで", () => {
  const stage = getStage("shisoku-2")!;
  expect(stageLabel(stage)).toBe("たねまき 1-2");
  expect(continueLabel(stage)).toBe("たねまき ステージ1-2 ・ こたえが10まで");
  expect(unlockHint(stage)).toBe("たねまき 1-2を クリアすると なかまに なるよ");
  expect(nextGrowthText(1, stage)).toBe("★3で つぼみに なるよ");
  expect(nextGrowthText(3, stage)).toBe("★4で はなが さくよ");
  expect(nextGrowthText(5, stage)).toBe("まんかい！");
});

it("しそくえんざんの はなは ★4から。★3はつぼみ", () => {
  expect(modeBloom("shisoku", cleared("shisoku", 4, 3)).bloomed).toBe(0);
  const allShisoku = stagesOfMode("shisoku").length;
  expect(modeBloom("shisoku", cleared("shisoku", allShisoku, 4))).toEqual({
    bloomed: allShisoku,
    total: allShisoku,
    complete: true,
    left: 0,
  });
});
