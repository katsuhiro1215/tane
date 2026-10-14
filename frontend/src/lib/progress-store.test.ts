import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_PROGRESS,
  markTitleSeen,
  parseProgress,
  PROGRESS_KEY,
  readProgress,
  recordStageResult,
  rememberLastMode,
  resetProgress,
  withResult,
} from "@/lib/progress-store";
import { SETTINGS_KEY } from "@/lib/settings-store";

describe("parseProgress", () => {
  it("空・JSONでない・形が違う値は空の記録", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("{oops")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("[1,2]")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('"text"')).toEqual(EMPTY_PROGRESS);
  });

  it("★は1〜3の整数だけ、知らないステージidは捨てる", () => {
    const raw = JSON.stringify({ stars: { "add-1": 3, "add-2": 0, "add-3": 4, "add-4": "2", "zzz-1": 3, "flash-6": 2 }, titleSeen: true });
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 3, "flash-6": 2 }, best: {}, titleSeen: true });
  });

  it("lastModeId は知っているあそびだけ、titleSeen は true のときだけ", () => {
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "mul", titleSeen: "yes" }))).toEqual({
      stars: {},
      best: {},
      lastModeId: "mul",
      titleSeen: false,
    });
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "challenge" })).lastModeId).toBeUndefined();
  });

  it("best は0以上の整数だけ、知らないステージidは捨てる", () => {
    const raw = JSON.stringify({ stars: {}, best: { "add-1": 1530, "add-2": -5, "add-3": 1.5, "zzz-1": 100, "flash-1": "200" } });
    expect(parseProgress(raw).best).toEqual({ "add-1": 1530 });
  });

  it("分割1の記録（best が無い）も★を残して読める", () => {
    const raw = JSON.stringify({ stars: { "add-1": 2 }, lastModeId: "add", titleSeen: true });
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 2 }, best: {}, lastModeId: "add", titleSeen: true });
  });
});

describe("withResult", () => {
  it("前より★が多いときだけ★を更新する", () => {
    const first = withResult(EMPTY_PROGRESS, "add-1", 2);
    expect(first).toEqual({ progress: { ...EMPTY_PROGRESS, stars: { "add-1": 2 } }, improved: true, newBest: false });
    expect(withResult(first.progress, "add-1", 2).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 1).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 3).progress.stars["add-1"]).toBe(3);
  });

  it("★0（失敗）は記録しない", () => {
    expect(withResult(EMPTY_PROGRESS, "add-1", 0)).toEqual({ progress: EMPTY_PROGRESS, improved: false, newBest: false });
  });

  it("点数は前の最高点を上回ったときだけ保存する（初めては最高記録）", () => {
    const first = withResult(EMPTY_PROGRESS, "add-1", 2, 1200);
    expect(first.newBest).toBe(true);
    expect(first.progress.best).toEqual({ "add-1": 1200 });

    const lower = withResult(first.progress, "add-1", 3, 1000);
    expect(lower.newBest).toBe(false);
    expect(lower.improved).toBe(true);
    expect(lower.progress.best).toEqual({ "add-1": 1200 });

    const same = withResult(first.progress, "add-1", 2, 1200);
    expect(same.newBest).toBe(false);

    const higher = withResult(first.progress, "add-1", 1, 1500);
    expect(higher).toMatchObject({ improved: false, newBest: true });
    expect(higher.progress.stars["add-1"]).toBe(2);
    expect(higher.progress.best["add-1"]).toBe(1500);
  });
});

describe("localStorage への読み書き", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recordStageResult は上がったときだけ保存し、前の★と前の最高点を返す", () => {
    expect(recordStageResult("add-1", 2, 900)).toEqual({ improved: true, before: 0, newBest: true, bestBefore: null });
    expect(recordStageResult("add-1", 1, 800)).toEqual({ improved: false, before: 2, newBest: false, bestBefore: 900 });
    expect(readProgress().stars).toEqual({ "add-1": 2 });
    expect(readProgress().best).toEqual({ "add-1": 900 });
  });

  it("点数を渡さない（失敗した回）は最高点を変えない", () => {
    recordStageResult("add-1", 2, 900);
    expect(recordStageResult("add-1", 0)).toEqual({ improved: false, before: 2, newBest: false, bestBefore: 900 });
    expect(readProgress().best).toEqual({ "add-1": 900 });
  });

  it("保存すると古いキーを消す", () => {
    store.set("tane:cleared-stages", '["add-1"]');
    markTitleSeen();
    expect(store.has("tane:cleared-stages")).toBe(false);
    expect(readProgress().titleSeen).toBe(true);
  });

  it("rememberLastMode", () => {
    rememberLastMode("div");
    expect(readProgress().lastModeId).toBe("div");
  });

  it("resetProgress は記録を消すが、音の設定は残す", () => {
    recordStageResult("add-1", 3, 1000);
    store.set(SETTINGS_KEY, JSON.stringify({ se: false, bgm: true }));
    resetProgress();
    expect(store.has(PROGRESS_KEY)).toBe(false);
    expect(store.get(SETTINGS_KEY)).toBe(JSON.stringify({ se: false, bgm: true }));
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("壊れた値が入っていても空の記録として読める", () => {
    store.set(PROGRESS_KEY, "not json");
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });
});
