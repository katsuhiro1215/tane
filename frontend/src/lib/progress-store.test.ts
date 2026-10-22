import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearGuestProgress,
  EMPTY_PROGRESS,
  markTitleSeen,
  parseProgress,
  PROGRESS_KEY,
  progressKeyFor,
  readGuestProgress,
  readProgress,
  recordChallengeResult,
  recordEndlessResult,
  recordStageResult,
  rememberLastMode,
  resetProgress,
  setProgressOwner,
  toggleGarden,
  withChallengeScore,
  withGardenToggle,
  withResult,
  writeProgress,
} from "@/lib/progress-store";
import { SETTINGS_KEY } from "@/lib/settings-store";

describe("parseProgress", () => {
  it("空・JSONでない・形が違う値は空の記録", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("{oops")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("[1,2]")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('"text"')).toEqual(EMPTY_PROGRESS);
  });

  it("★は1〜3の整数だけ、知らないステージidは捨てる。最大を超えるものは最大まで下げる", () => {
    const raw = JSON.stringify({ stars: { "add-1": 3, "add-2": 0, "add-3": 4, "add-4": "2", "zzz-1": 3, "flash-6": 2 }, titleSeen: true });
    expect(parseProgress(raw)).toEqual({
      ...EMPTY_PROGRESS,
      stars: { "add-1": 3, "add-3": 3, "flash-6": 2 },
      titleSeen: true,
    });
  });

  it("lastModeId は知っているあそびだけ、titleSeen は true のときだけ", () => {
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "mul", titleSeen: "yes" }))).toEqual({
      ...EMPTY_PROGRESS,
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
    expect(parseProgress(raw)).toEqual({ ...EMPTY_PROGRESS, stars: { "add-1": 2 }, lastModeId: "add", titleSeen: true });
  });

  it("gardenChangedAt・lastModeAt は日時の文字列（壊れていれば null）、playDays は YYYY-MM-DD の重なりなし配列（直近14件）", () => {
    const raw = JSON.stringify({
      stars: {},
      gardenChangedAt: "2026-10-21T10:00:00+09:00",
      lastModeAt: "not-a-date",
      playDays: ["2026-10-20", "2026-10-20", "2026-10-21", "bad", 123, "2026-10-22"],
    });
    const parsed = parseProgress(raw);
    expect(parsed.gardenChangedAt).toBe("2026-10-21T10:00:00+09:00");
    expect(parsed.lastModeAt).toBeNull();
    expect(parsed.playDays).toEqual(["2026-10-20", "2026-10-21", "2026-10-22"]);
  });

  it("challengeBest は知っているチャレンジのあそびの、0以上の整数だけ", () => {
    const raw = JSON.stringify({
      stars: {},
      challengeBest: { add: 3200, mix: 0, flash: 100, div: -1, mul: 1.5, sub: "9" },
    });
    expect(parseProgress(raw).challengeBest).toEqual({ add: 3200, mix: 0 });
  });

  it("garden は知っているステージidの文字列だけ、重なりを除いて8こまで", () => {
    const ids = ["add-1", "add-1", "zzz-1", 3, "sub-2", "add-2", "add-3", "add-4", "add-5", "add-6", "add-7", "add-8"];
    expect(parseProgress(JSON.stringify({ stars: {}, garden: ids })).garden).toEqual([
      "add-1",
      "sub-2",
      "add-2",
      "add-3",
      "add-4",
      "add-5",
      "add-6",
      "add-7",
    ]);
    expect(parseProgress(JSON.stringify({ stars: { "add-1": 1 }, garden: "add-1" }))).toMatchObject({
      stars: { "add-1": 1 },
      garden: [],
    });
  });

  it("challengeBest が無い・形が違う記録は空で、★は残る", () => {
    expect(parseProgress(JSON.stringify({ stars: { "add-1": 1 }, challengeBest: [1, 2] }))).toMatchObject({
      stars: { "add-1": 1 },
      challengeBest: {}, endless: {},
    });
  });
});

describe("★5とエンドレスの記録", () => {
  it("★はそのステージの最大まで下げる。しそくえんざんは5、ほかは3", () => {
    const raw = JSON.stringify({ stars: { "shisoku-1": 5, "shisoku-2": 6, "add-1": 5, "add-2": 3 } });
    expect(parseProgress(raw).stars).toEqual({ "shisoku-1": 5, "add-1": 3, "add-2": 3 });
  });

  it("endless は正の整数だけ、知っているステージだけ。無い古い記録は空", () => {
    const raw = JSON.stringify({
      endless: { "shisoku-1": { correct: 12, combo: 7 }, "zzz-1": { correct: 1, combo: 1 }, "shisoku-2": { correct: -1, combo: 2 }, "shisoku-3": "x" },
    });
    expect(parseProgress(raw).endless).toEqual({ "shisoku-1": { correct: 12, combo: 7 } });
    expect(parseProgress(JSON.stringify({ stars: {} })).endless).toEqual({});
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

describe("withChallengeScore", () => {
  it("前の最高点を上回ったときだけ保存する（初めては0点でも最高記録）", () => {
    const first = withChallengeScore(EMPTY_PROGRESS, "add", 0);
    expect(first.newBest).toBe(true);
    expect(first.progress.challengeBest).toEqual({ add: 0 });

    const higher = withChallengeScore(first.progress, "add", 2400);
    expect(higher.newBest).toBe(true);
    expect(higher.progress.challengeBest).toEqual({ add: 2400 });

    const lower = withChallengeScore(higher.progress, "add", 1800);
    expect(lower).toEqual({ progress: higher.progress, newBest: false });
    expect(withChallengeScore(higher.progress, "add", 2400).newBest).toBe(false);
  });

  it("ほかのあそびの最高点と★には触らない", () => {
    const base = { ...EMPTY_PROGRESS, stars: { "add-1": 3 as const }, challengeBest: { mix: 500 } };
    expect(withChallengeScore(base, "div", 900).progress).toEqual({ ...base, challengeBest: { mix: 500, div: 900 } });
  });
});

describe("withGardenToggle", () => {
  it("入っていなければ足し、入っていれば外す", () => {
    const added = withGardenToggle(EMPTY_PROGRESS, "add-1");
    expect(added.result).toBe("added");
    expect(added.progress.garden).toEqual(["add-1"]);
    const removed = withGardenToggle(added.progress, "add-1");
    expect(removed.result).toBe("removed");
    expect(removed.progress.garden).toEqual([]);
  });

  it("8体のときに足そうとすると full で、何も変えない（外すことはできる）", () => {
    const full = { ...EMPTY_PROGRESS, garden: ["add-1", "add-2", "add-3", "add-4", "add-5", "add-6", "add-7", "add-8"] };
    expect(withGardenToggle(full, "add-9")).toEqual({ progress: full, result: "full" });
    expect(withGardenToggle(full, "add-3").result).toBe("removed");
  });

  it("変えると gardenChangedAt に日時が入る", () => {
    const now = new Date("2026-10-21T10:00:00+09:00");
    const added = withGardenToggle(EMPTY_PROGRESS, "add-1", now);
    expect(added.progress.gardenChangedAt).toBe(now.toISOString());
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

  it("recordEndlessResult は正解数と最長コンボを、それぞれ大きいほうだけ残す", () => {
    expect(recordEndlessResult("shisoku-1", 10, 5)).toEqual({ newBestCorrect: true, newBestCombo: true });
    expect(recordEndlessResult("shisoku-1", 8, 9)).toEqual({ newBestCorrect: false, newBestCombo: true });
    expect(recordEndlessResult("shisoku-1", 12, 4)).toEqual({ newBestCorrect: true, newBestCombo: false });
    expect(readProgress().endless["shisoku-1"]).toEqual({ correct: 12, combo: 9 });
  });

  it("保存すると古いキーを消す", () => {
    store.set("tane:cleared-stages", '["add-1"]');
    markTitleSeen();
    expect(store.has("tane:cleared-stages")).toBe(false);
    expect(readProgress().titleSeen).toBe(true);
  });

  it("rememberLastMode", () => {
    const now = new Date("2026-10-21T10:00:00+09:00");
    rememberLastMode("div", now);
    expect(readProgress().lastModeId).toBe("div");
    expect(readProgress().lastModeAt).toBe(now.toISOString());
  });

  it("recordStageResult・recordChallengeResult・recordEndlessResult のあと、playDays に今日（日本時間）が1つだけ入る", () => {
    const now = new Date("2026-10-21T01:00:00Z"); // JST 10:00
    recordStageResult("add-1", 1, null, now);
    expect(readProgress().playDays).toEqual(["2026-10-21"]);
    // 同じ日に何度やっても増えない。前と同じ★・点数で改善が無くても、遊んだ日は残る
    recordStageResult("add-1", 1, null, now);
    expect(readProgress().playDays).toEqual(["2026-10-21"]);
    const nextDay = new Date("2026-10-22T01:00:00Z");
    recordChallengeResult("add", 100, nextDay);
    expect(readProgress().playDays).toEqual(["2026-10-21", "2026-10-22"]);
    const thirdDay = new Date("2026-10-23T01:00:00Z");
    recordEndlessResult("shisoku-1", 1, 1, thirdDay);
    expect(readProgress().playDays).toEqual(["2026-10-21", "2026-10-22", "2026-10-23"]);
  });

  it("resetProgress は記録を消すが、音の設定は残す", () => {
    recordStageResult("add-1", 3, 1000);
    store.set(SETTINGS_KEY, JSON.stringify({ se: false, bgm: true }));
    resetProgress();
    expect(store.has(PROGRESS_KEY)).toBe(false);
    expect(store.get(SETTINGS_KEY)).toBe(JSON.stringify({ se: false, bgm: true }));
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("recordChallengeResult は上回ったときだけ保存し、前の最高点を返す", () => {
    expect(recordChallengeResult("add", 1500)).toEqual({ newBest: true, bestBefore: null });
    expect(recordChallengeResult("add", 900)).toEqual({ newBest: false, bestBefore: 1500 });
    expect(readProgress().challengeBest).toEqual({ add: 1500 });
  });

  it("resetProgress でチャレンジの最高点も消える", () => {
    recordChallengeResult("mix", 2000);
    resetProgress();
    expect(readProgress().challengeBest).toEqual({});
  });

  it("toggleGarden は保存し、resetProgress で消える", () => {
    expect(toggleGarden("add-2")).toBe("added");
    expect(toggleGarden("add-1")).toBe("added");
    expect(readProgress().garden).toEqual(["add-2", "add-1"]);
    expect(toggleGarden("add-2")).toBe("removed");
    expect(readProgress().garden).toEqual(["add-1"]);
    resetProgress();
    expect(readProgress().garden).toEqual([]);
  });

  it("壊れた値が入っていても空の記録として読める", () => {
    store.set(PROGRESS_KEY, "not json");
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });
});

describe("プロフィールごとの記録の持ち主（progressKeyFor / setProgressOwner / writeProgress）", () => {
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
    setProgressOwner(null);
    vi.unstubAllGlobals();
  });

  it("progressKeyFor: ゲストは tane:progress:v1、プロフィールは末尾に :p<id>", () => {
    expect(progressKeyFor(null)).toBe(PROGRESS_KEY);
    expect(progressKeyFor(5)).toBe(`${PROGRESS_KEY}:p5`);
  });

  it("setProgressOwner を切り替えると、readProgress・recordStageResult が別のキーを使う", () => {
    recordStageResult("add-1", 1); // ゲストの記録
    expect(store.get(PROGRESS_KEY)).toBeDefined();

    setProgressOwner(5);
    expect(readProgress()).toEqual(EMPTY_PROGRESS); // 子5の記録はまだ無い
    recordStageResult("add-2", 1);
    expect(store.get(`${PROGRESS_KEY}:p5`)).toBeDefined();
    expect(JSON.parse(store.get(`${PROGRESS_KEY}:p5`)!).stars).toEqual({ "add-2": 1 });

    // ゲストの記録は、子5の記録とは混ざらない
    expect(JSON.parse(store.get(PROGRESS_KEY)!).stars).toEqual({ "add-1": 1 });

    setProgressOwner(null);
    expect(readProgress().stars).toEqual({ "add-1": 1 });
  });

  it("writeProgress は今の持ち主のキーに、まるごと書く", () => {
    setProgressOwner(7);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-3": 2 } });
    expect(readProgress().stars).toEqual({ "add-3": 2 });
    expect(JSON.parse(store.get(`${PROGRESS_KEY}:p7`)!).stars).toEqual({ "add-3": 2 });
  });

  it("readGuestProgress・clearGuestProgress は、今の持ち主に関係なく、いつもゲストのキー", () => {
    recordStageResult("add-1", 2); // ゲストに書く
    setProgressOwner(9);
    expect(readGuestProgress().stars).toEqual({ "add-1": 2 });
    clearGuestProgress();
    expect(readGuestProgress()).toEqual(EMPTY_PROGRESS);
    // 持ち主（プロフィール9）の記録には影響しない
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });
});
