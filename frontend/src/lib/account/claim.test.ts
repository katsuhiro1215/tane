import { beforeEach, describe, expect, it, vi } from "vitest";

import { claimGuestProgress, needsClaim } from "@/lib/account/claim";
import { ApiError } from "@/lib/account/api";
import { EMPTY_PROGRESS, readGuestProgress, writeProgress } from "@/lib/progress-store";
import { toSynced } from "@/lib/sync/progress-merge";

function stubLocalStorage() {
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
}

describe("needsClaim", () => {
  it("ゲストが空なら聞かない", () => {
    expect(needsClaim(EMPTY_PROGRESS)).toBe(false);
  });

  it("★があれば聞く", () => {
    expect(needsClaim({ ...EMPTY_PROGRESS, stars: { "add-1": 2 } })).toBe(true);
  });

  it("遊んだ日があれば聞く", () => {
    expect(needsClaim({ ...EMPTY_PROGRESS, playDays: ["2026-10-20"] })).toBe(true);
  });
});

describe("claimGuestProgress", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it("ゲストが空なら API を呼ばない", async () => {
    const getProgress = vi.fn();
    const putProgress = vi.fn();
    await claimGuestProgress(1, { api: { getProgress, putProgress } });
    expect(getProgress).not.toHaveBeenCalled();
    expect(putProgress).not.toHaveBeenCalled();
  });

  it("引き継ぐと、その子に合わさり、ゲストが空になる", async () => {
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 2 }, playDays: ["2026-10-20"] });
    const getProgress = vi.fn(async () => ({ progress: toSynced(EMPTY_PROGRESS), playDays: [] }));
    const putProgress = vi.fn(async (_id: number, payload: unknown) => payload as never);

    await claimGuestProgress(5, { api: { getProgress, putProgress } });

    expect(getProgress).toHaveBeenCalledWith(5);
    expect(putProgress).toHaveBeenCalledTimes(1);
    const [calledId, payload] = putProgress.mock.calls[0] as [number, { progress: { stars: Record<string, number> }; playDays: string[] }];
    expect(calledId).toBe(5);
    expect(payload.progress.stars).toEqual({ "add-1": 2 });
    expect(payload.playDays).toEqual(["2026-10-20"]);
    expect(readGuestProgress().stars).toEqual({});
  });

  it("PUT に失敗したらゲストを消さない", async () => {
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 2 } });
    const getProgress = vi.fn(async () => ({ progress: toSynced(EMPTY_PROGRESS), playDays: [] }));
    const putProgress = vi.fn(async () => {
      throw new ApiError(0, "network");
    });

    await expect(claimGuestProgress(5, { api: { getProgress, putProgress } })).rejects.toThrow();
    expect(readGuestProgress().stars).toEqual({ "add-1": 2 });
  });
});
