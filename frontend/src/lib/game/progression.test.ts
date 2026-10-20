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
function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 | 4 | 5 = 3): StarMap {
  return Object.fromEntries(stagesOfMode(mode).slice(0, n).map((s) => [s.id, value]));
}

describe("しそくえんざん（★5・★3で次が開く）", () => {
  it("前のステージが★3になるまで、次は閉じたまま", () => {
    expect(isUnlocked(getStage("shisoku-2")!, { "shisoku-1": 2 })).toBe(false);
    expect(isUnlocked(getStage("shisoku-2")!, { "shisoku-1": 3 })).toBe(true);
  });

  it("★の合計の最大は、1ステージ5で数える", () => {
    expect(modeStarSummary("shisoku", {})).toEqual({ earned: 0, max: 60 });
    expect(modeStarSummary("shisoku", { "shisoku-1": 5, "shisoku-2": 4 })).toEqual({ earned: 9, max: 60 });
  });
});

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

  it("3. そのあそびが全部★3なら、次のあそびへ（フラッシュの次は、まだ遊んでいないしそくえんざん）", () => {
    expect(continueTarget(cleared("flash", 6), "flash").id).toBe("shisoku-1");
    expect(continueTarget({ ...cleared("flash", 6), ...cleared("shisoku", 12, 5) } as StarMap, "flash").id).toBe("add-1");
    expect(continueTarget(cleared("add", 12), "add").id).toBe("sub-1");
  });

  it("4. 全部★3なら、最後に遊んだあそびのボス", () => {
    const all = Object.assign(
      { ...cleared("shisoku", 12, 5) },
      ...(["add", "sub", "mul", "div", "flash"] as const).map((m) => cleared(m, 12))
    ) as StarMap;
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

describe("そろばん（設計書2.3・2.4）", () => {
  it("どの級もみとりざんが初めから開き、級の中は順番", () => {
    expect(isUnlocked(getStage("soroban-15")!, {})).toBe(true);
    expect(isUnlocked(getStage("soroban-1")!, {})).toBe(true);
    expect(isUnlocked(getStage("soroban-16")!, {})).toBe(false);
    expect(isUnlocked(getStage("soroban-16")!, { "soroban-15": 1 })).toBe(true);
  });

  it("初めて開くと10級のみとりざん", () => {
    expect(initialFocusStage("soroban", {}).id).toBe("soroban-1");
  });

  it("いちばん上の級の続きを選ぶ", () => {
    expect(initialFocusStage("soroban", { "soroban-1": 3, "soroban-15": 2 }).id).toBe("soroban-16");
    const all6 = { "soroban-15": 3, "soroban-16": 3, "soroban-17": 3, "soroban-18": 3 } as const;
    expect(initialFocusStage("soroban", all6).id).toBe("soroban-19");
  });

  it("級が全部★1以上なら、★3でない最初のステージ", () => {
    const stars = { "soroban-15": 1, "soroban-16": 3, "soroban-17": 3, "soroban-18": 3 } as const;
    expect(initialFocusStage("soroban", stars).id).toBe("soroban-15");
  });

  it("そろばんは、最後に遊んだあそびのときだけ続きを探す（四則演算・フラッシュは飛ばない）", () => {
    expect(continueTarget({ ...cleared("flash", 6), ...cleared("shisoku", 12, 5) } as StarMap, "flash").id).toBe("add-1");
    expect(continueTarget({}, undefined).id).toBe("add-1");
  });

  it("つづきからも同じ決め方", () => {
    expect(continueTarget({ "soroban-15": 2 }, "soroban").id).toBe("soroban-16");
  });

  it("要求されたステージ（URL）があればそれを優先する", () => {
    expect(initialFocusStage("soroban", {}, "soroban-23").id).toBe("soroban-23");
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
