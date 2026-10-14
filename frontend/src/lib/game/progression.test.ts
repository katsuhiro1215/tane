import { describe, expect, it } from "vitest";

import { getStage, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import {
  continueTarget,
  friendsCount,
  gardenFriends,
  initialFocusStage,
  isChallengeUnlocked,
  isUnlocked,
  modeStarSummary,
  totalStars,
  type StarMap,
} from "@/lib/game/progression";

/** あそび mode の1〜n番目に★value を付けた記録 */
function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 = 3): StarMap {
  return Object.fromEntries(stagesOfMode(mode).slice(0, n).map((s) => [s.id, value]));
}

describe("isUnlocked", () => {
  it("1つ目はいつも開いている", () => {
    expect(isUnlocked(getStage("mul-1")!, {})).toBe(true);
  });

  it("前のステージが★1以上なら開く", () => {
    expect(isUnlocked(getStage("add-2")!, {})).toBe(false);
    expect(isUnlocked(getStage("add-2")!, { "add-1": 1 })).toBe(true);
  });

  it("ほかのあそびの★は関係ない", () => {
    expect(isUnlocked(getStage("sub-2")!, { "add-1": 3 })).toBe(false);
  });
});

describe("★の合計・なかま・あそびごと", () => {
  const stars: StarMap = { "add-1": 3, "add-2": 1, "flash-1": 2, "unknown-1": 3 } as StarMap;

  it("知らないidは数えない", () => {
    expect(totalStars(stars)).toBe(6);
    expect(friendsCount(stars)).toBe(3);
  });

  it("modeStarSummary は獲得数と最大数", () => {
    expect(modeStarSummary("add", stars)).toEqual({ earned: 4, max: 36 });
    expect(modeStarSummary("flash", stars)).toEqual({ earned: 2, max: 18 });
  });
});

describe("isChallengeUnlocked", () => {
  it("★29では閉じていて、30で開く", () => {
    const nine = cleared("add", 9); // 27
    expect(isChallengeUnlocked({ ...nine, "add-10": 2 })).toBe(false); // 29
    expect(isChallengeUnlocked({ ...nine, "add-10": 3 })).toBe(true); // 30
  });
});

describe("continueTarget（設計書3.5）", () => {
  it("記録がなければ たしざん1", () => {
    expect(continueTarget({}).id).toBe("add-1");
  });

  it("1. 最後に遊んだあそびの、開いていて★0の最初", () => {
    expect(continueTarget({ ...cleared("sub", 3) }, "sub").id).toBe("sub-4");
  });

  it("2. ★0が無ければ、★3でない最初", () => {
    const stars = { ...cleared("flash", 6), "flash-2": 1 } as StarMap;
    expect(continueTarget(stars, "flash").id).toBe("flash-2");
  });

  it("3. そのあそびが全部★3なら、次のあそびへ（フラッシュの次はたしざん）", () => {
    expect(continueTarget(cleared("flash", 6), "flash").id).toBe("add-1");
    expect(continueTarget(cleared("add", 12), "add").id).toBe("sub-1");
  });

  it("4. 全部★3なら、最後に遊んだあそびのボス", () => {
    const all = Object.assign({}, ...(["add", "sub", "mul", "div", "flash"] as const).map((m) => cleared(m, 12))) as StarMap;
    expect(continueTarget(all, "mul").id).toBe("mul-12");
  });
});

describe("initialFocusStage", () => {
  it("開いているいちばん後ろ", () => {
    expect(initialFocusStage("add", cleared("add", 3, 1)).id).toBe("add-4");
    expect(initialFocusStage("add", {}).id).toBe("add-1");
    expect(initialFocusStage("add", cleared("add", 12)).id).toBe("add-12");
  });

  it("指定されたステージが同じあそびならそれ、違うあそび・知らないidは無視", () => {
    expect(initialFocusStage("add", {}, "add-7").id).toBe("add-7");
    expect(initialFocusStage("add", {}, "sub-3").id).toBe("add-1");
    expect(initialFocusStage("add", {}, "nope").id).toBe("add-1");
  });
});

describe("gardenFriends", () => {
  it("★1以上だけを★の多い順、同じなら後ろのステージから、最大8体", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3, "add-3": 3, "sub-1": 2 };
    expect(gardenFriends(stars).map((s) => s.id)).toEqual(["add-3", "add-2", "sub-1", "add-1"]);
    expect(gardenFriends(cleared("add", 12))).toHaveLength(8);
  });

  it("選んだ子を選んだ順に先に並べ、足りない分を自動で埋める（重ならない）", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3, "add-3": 3, "sub-1": 2 };
    expect(gardenFriends(stars, ["add-1"]).map((s) => s.id)).toEqual(["add-1", "add-3", "add-2", "sub-1"]);
    expect(gardenFriends(stars, ["sub-1", "add-1"]).map((s) => s.id)).toEqual(["sub-1", "add-1", "add-3", "add-2"]);
  });

  it("会えていない子・知らないidは選んでいても出さない", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3 };
    expect(gardenFriends(stars, ["mul-1", "zzz-1", "add-1"]).map((s) => s.id)).toEqual(["add-1", "add-2"]);
  });

  it("8体選んでいれば、その8体だけ", () => {
    const chosen = stagesOfMode("add").slice(0, 8).map((s) => s.id);
    expect(gardenFriends(cleared("add", 12), chosen).map((s) => s.id)).toEqual(chosen);
  });
});
