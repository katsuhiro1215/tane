import { describe, expect, it } from "vitest";

import { fromSynced, mergeProgress, toSynced, type SyncedProgress } from "@/lib/sync/progress-merge";
import { EMPTY_PROGRESS, type Progress } from "@/lib/progress-store";

import cases from "./tane-merge-cases.json";

type Case = {
  name: string;
  a: SyncedProgress;
  b: SyncedProgress;
  expected: SyncedProgress;
  order_sensitive?: boolean;
};

describe("mergeProgress（Spra Go 側と同じ固定の例）", () => {
  for (const c of cases as Case[]) {
    it(c.name, () => {
      expect(mergeProgress(c.a, c.b)).toEqual(c.expected);
      if (!c.order_sensitive) {
        expect(mergeProgress(c.b, c.a)).toEqual(c.expected);
      }
      expect(mergeProgress(c.expected, c.expected)).toEqual(c.expected);
    });
  }
});

describe("toSynced", () => {
  it("Progress を SyncedProgress の形にする", () => {
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      stars: { "add-1": 3 },
      best: { "add-1": 2400 },
      challengeBest: { add: 3200 },
      endless: { "shisoku-1": { correct: 12, combo: 7 } },
      garden: ["add-1"],
      gardenChangedAt: "2026-10-21T10:00:00+09:00",
      lastModeId: "add",
      lastModeAt: "2026-10-21T10:00:00+09:00",
    };
    expect(toSynced(progress)).toEqual({
      stars: { "add-1": 3 },
      best: { "add-1": 2400 },
      challengeBest: { add: 3200 },
      endless: { "shisoku-1": { correct: 12, combo: 7 } },
      garden: ["add-1"],
      gardenChangedAt: "2026-10-21T10:00:00+09:00",
      lastModeId: "add",
      lastModeAt: "2026-10-21T10:00:00+09:00",
    });
  });

  it("stars が無いステージの best は含めない（サーバーが黙って捨てる規則に合わせる）", () => {
    const progress: Progress = { ...EMPTY_PROGRESS, stars: { "add-1": 3 }, best: { "add-1": 2400, "add-2": 900 } };
    expect(toSynced(progress).best).toEqual({ "add-1": 2400 });
  });

  it("lastModeId が無ければ null、ある場合はそのまま", () => {
    expect(toSynced(EMPTY_PROGRESS).lastModeId).toBeNull();
  });
});

describe("fromSynced", () => {
  it("SyncedProgress を Progress へ戻す。★は最大まで下げ、知らないステージは捨てる", () => {
    const synced: SyncedProgress = {
      stars: { "add-1": 5, "zzz-1": 3, "shisoku-1": 5 },
      best: { "add-1": 100 },
      challengeBest: { add: 900 },
      endless: {},
      garden: ["add-1"],
      gardenChangedAt: "2026-10-21T10:00:00+09:00",
      lastModeId: "add",
      lastModeAt: "2026-10-21T10:00:00+09:00",
    };
    const next = fromSynced(synced, EMPTY_PROGRESS);
    expect(next.stars).toEqual({ "add-1": 3, "shisoku-1": 5 });
    expect(next.best).toEqual({ "add-1": 100 });
    expect(next.challengeBest).toEqual({ add: 900 });
    expect(next.garden).toEqual(["add-1"]);
    expect(next.gardenChangedAt).toBe("2026-10-21T10:00:00+09:00");
    expect(next.lastModeId).toBe("add");
    expect(next.lastModeAt).toBe("2026-10-21T10:00:00+09:00");
  });

  it("同期しないもの（titleSeen）は local のまま。lastModeId が null なら local から消す", () => {
    const local: Progress = { ...EMPTY_PROGRESS, titleSeen: true, lastModeId: "sub" };
    const synced: SyncedProgress = {
      stars: {}, best: {}, challengeBest: {}, endless: {}, garden: [],
      gardenChangedAt: null, lastModeId: null, lastModeAt: null,
    };
    const next = fromSynced(synced, local);
    expect(next.titleSeen).toBe(true);
    expect(next.lastModeId).toBeUndefined();
  });
});
