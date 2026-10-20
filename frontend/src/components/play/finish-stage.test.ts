import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { finishStage } from "@/components/play/finish-stage";
import { getStage } from "@/data/stages/catalog";
import { INITIAL_SESSION } from "@/lib/game/play-session";
import { readProgress } from "@/lib/progress-store";

const add1 = getStage("add-1")!; // 目標タイム 80秒

beforeEach(() => {
  const store = new Map<string, string>();
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

describe("finishStage", () => {
  it("ミスなし・時間内のクリアは★3と点数を保存する", () => {
    const outcome = finishStage(add1, { status: "cleared", currentIndex: 20, correctCount: 20 }, { ...INITIAL_SESSION, score: 3200, elapsedMs: 50_000 });
    expect(outcome).toEqual({
      stars: 3,
      improved: true,
      before: 0,
      score: 3200,
      newBest: true,
      elapsedMs: 50_000,
      targetMs: 80_000,
      missedThreeByMs: null,
    });
    expect(readProgress().best["add-1"]).toBe(3200);
  });

  it("ミスなしでも時間を過ぎたら★2と、超えた時間を返す", () => {
    const outcome = finishStage(add1, { status: "cleared", currentIndex: 20, correctCount: 20 }, { ...INITIAL_SESSION, score: 2000, elapsedMs: 83_400 });
    expect(outcome.stars).toBe(2);
    expect(outcome.missedThreeByMs).toBe(3_400);
  });

  it("時間なしのステージ（そろばんのみとりざん）は、遅くてもミスなしで★3", () => {
    const outcome = finishStage(getStage("soroban-15")!, { status: "cleared", currentIndex: 10, correctCount: 10 }, { ...INITIAL_SESSION, score: 1500, elapsedMs: 900_000 });
    expect(outcome).toMatchObject({ stars: 3, targetMs: null, missedThreeByMs: null });
  });

  it("失敗した回は★も点数も保存しない", () => {
    const outcome = finishStage(add1, { status: "failed", currentIndex: 7, correctCount: 2 }, { ...INITIAL_SESSION, score: 500, elapsedMs: 9_000 });
    expect(outcome).toMatchObject({ stars: 0, improved: false, newBest: false });
    expect(readProgress().best).toEqual({});
  });
});
