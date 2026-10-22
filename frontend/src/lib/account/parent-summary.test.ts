import { describe, expect, it } from "vitest";

import { parentSummary } from "@/lib/account/parent-summary";
import { EMPTY_PROGRESS, type Progress } from "@/lib/progress-store";

function progressWith(stars: Record<string, number>): Progress {
  return { ...EMPTY_PROGRESS, stars: stars as Progress["stars"] };
}

const SHISOKU_TO_9 = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`shisoku-${i + 1}`, 3]));

describe("parentSummary", () => {
  it("あそびごとの★の合計・最大・reached を出す", () => {
    const progress = progressWith({
      "add-1": 1,
      "add-2": 3,
      "add-3": 1,
      "add-6": 1,
      "sub-2": 1,
      ...SHISOKU_TO_9,
      "soroban-16": 2,
    });
    const { modes } = parentSummary(progress, [], "2026-10-22");

    const add = modes.find((m) => m.modeId === "add")!;
    expect(add.earned).toBe(6);
    expect(add.max).toBe(36);
    expect(add.reached).toBe("ステージ 4");

    const soroban = modes.find((m) => m.modeId === "soroban")!;
    expect(soroban.earned).toBe(2);
    expect(soroban.max).toBe(78);
    expect(soroban.reached).toBe("6きゅう");

    const shisoku = modes.find((m) => m.modeId === "shisoku")!;
    expect(shisoku.earned).toBe(27);
    expect(shisoku.max).toBe(500);
    expect(shisoku.reached).toBe("3-2");

    const div = modes.find((m) => m.modeId === "div")!;
    expect(div.earned).toBe(0);
    expect(div.max).toBe(36);
    expect(div.reached).toBeNull();
  });

  it("daysThisWeek は today を含む直近7日だけ（8日前は数えない）", () => {
    const { daysThisWeek, lastPlayed } = parentSummary(
      EMPTY_PROGRESS,
      ["2026-10-22", "2026-10-16", "2026-10-15"],
      "2026-10-22"
    );
    expect(daysThisWeek).toBe(2);
    expect(lastPlayed).toBe("2026-10-22");
  });

  it("遊んだ日が無ければ lastPlayed は null、daysThisWeek は0", () => {
    const { daysThisWeek, lastPlayed } = parentSummary(EMPTY_PROGRESS, [], "2026-10-22");
    expect(daysThisWeek).toBe(0);
    expect(lastPlayed).toBeNull();
  });

  it("stuck は★1以上で最大の半分未満のステージを、新しい順に3つまで", () => {
    const progress = progressWith({
      "add-1": 1,
      "add-2": 3,
      "add-3": 1,
      "add-6": 1,
      "sub-2": 1,
    });
    const { stuck } = parentSummary(progress, [], "2026-10-22");
    expect(stuck).toEqual(["ひきざん 2 10までのひきざん", "たしざん 6 2けた＋1けた", "たしざん 3 くりあがり"]);
  });

  it("stuck が無ければ空の配列", () => {
    const { stuck } = parentSummary(EMPTY_PROGRESS, [], "2026-10-22");
    expect(stuck).toEqual([]);
  });
});
