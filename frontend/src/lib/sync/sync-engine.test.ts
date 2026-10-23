import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/account/api";
import {
  EMPTY_PROGRESS,
  readProgress,
  readProgressFor,
  setProgressOwner,
  writeProgress,
} from "@/lib/progress-store";
import { createSyncEngine, PENDING_KEY } from "@/lib/sync/sync-engine";

function fakeTimers() {
  let id = 0;
  const pending = new Map<number, { fn: () => void; at: number }>();
  let now = 0;
  return {
    setTimeout: (fn: () => void, ms: number) => {
      id += 1;
      pending.set(id, { fn, at: now + ms });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (handle: ReturnType<typeof setTimeout>) => {
      pending.delete(handle as unknown as number);
    },
    advance(ms: number) {
      now += ms;
      for (const [key, { fn, at }] of [...pending.entries()]) {
        if (at <= now) {
          pending.delete(key);
          fn();
        }
      }
    },
  };
}

describe("createSyncEngine", () => {
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

  it("notifyChanged は2秒待って1回だけ送る。続けて呼んでも1回", async () => {
    const timers = fakeTimers();
    const putProgress = vi.fn(async () => ({ progress: { ...fromProgress(readProgress()) }, playDays: [] }));
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });

    await engine.start(1);
    engine.notifyChanged();
    timers.advance(1000);
    engine.notifyChanged();
    timers.advance(1000);
    engine.notifyChanged();
    expect(putProgress).not.toHaveBeenCalled();
    timers.advance(2000);
    await flushMicrotasks();
    expect(putProgress).toHaveBeenCalledTimes(1);
  });

  it("送るのに失敗すると印が残り、次の flush で同じ中身を送る。成功で印が消える", async () => {
    const timers = fakeTimers();
    let shouldFail = true;
    const putProgress = vi.fn(async (_id: number, payload: unknown) => {
      if (shouldFail) throw new ApiError(0, "network");
      return { progress: (payload as { progress: unknown }).progress, playDays: [] };
    });
    const api = { putProgress, getProgress: vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] })) } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });

    await engine.start(2);
    await engine.flush();
    expect(putProgress).toHaveBeenCalledTimes(1);

    shouldFail = false;
    await engine.flush();
    expect(putProgress).toHaveBeenCalledTimes(2);
    const secondPayload = putProgress.mock.calls[1][1] as { progress: unknown };
    expect(secondPayload).toEqual(putProgress.mock.calls[0][1]);
  });

  it("start はサーバーの★が多い記録を端末に入れる", async () => {
    setProgressOwner(3);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
    const getProgress = vi.fn(async () => ({
      progress: { stars: { "add-1": 3 }, best: {}, challengeBest: {}, endless: {}, garden: [], gardenChangedAt: null, lastModeId: null, lastModeAt: null },
      playDays: [],
    }));
    const api = { getProgress, putProgress: vi.fn() } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout: setTimeout, clearTimeout: clearTimeout });
    await engine.start(3);
    expect(readProgress().stars).toEqual({ "add-1": 3 });
  });

  it("401 では端末の記録が残り、onUnauthorized が呼ばれる", async () => {
    setProgressOwner(4);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 2 } });
    const onUnauthorized = vi.fn();
    const getProgress = vi.fn(async () => {
      throw new ApiError(401, "きれました");
    });
    const api = { getProgress, putProgress: vi.fn() } as never;
    const engine = createSyncEngine({
      api,
      now: () => new Date(),
      setTimeout,
      clearTimeout,
      onUnauthorized,
    });
    await engine.start(4);
    expect(readProgress().stars).toEqual({ "add-1": 2 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("403 では onProfileGone が呼ばれる", async () => {
    const onProfileGone = vi.fn();
    const putProgress = vi.fn(async () => {
      throw new ApiError(403, "だめ");
    });
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout, onProfileGone });
    await engine.start(5);
    await engine.flush();
    expect(onProfileGone).toHaveBeenCalledTimes(1);
  });

  it("403 + code=terms_outdated では onTermsOutdated が呼ばれ、onProfileGone は呼ばれず、未送信の印は残る", async () => {
    const onProfileGone = vi.fn();
    const onTermsOutdated = vi.fn();
    const putProgress = vi.fn(async () => {
      throw new ApiError(403, "だめ", undefined, "terms_outdated");
    });
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout, onProfileGone, onTermsOutdated });
    await engine.start(5);
    await engine.flush();
    expect(onTermsOutdated).toHaveBeenCalledTimes(1);
    expect(onProfileGone).not.toHaveBeenCalled();
    expect(JSON.parse(store.get(PENDING_KEY) ?? "[]")).toContain(5);
  });

  it("start で 403 + code=terms_outdated を受けても、onTermsOutdated が呼ばれ、onProfileGone は呼ばれない", async () => {
    const onProfileGone = vi.fn();
    const onTermsOutdated = vi.fn();
    const getProgress = vi.fn(async () => {
      throw new ApiError(403, "だめ", undefined, "terms_outdated");
    });
    const api = { getProgress, putProgress: vi.fn() } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout, onProfileGone, onTermsOutdated });
    await engine.start(7);
    expect(onTermsOutdated).toHaveBeenCalledTimes(1);
    expect(onProfileGone).not.toHaveBeenCalled();
  });

  it("429 では印が残り、flush をもう一度呼ぶまで自動では送り直さない", async () => {
    const putProgress = vi.fn(async () => {
      throw new ApiError(429, "まってね");
    });
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout });
    await engine.start(6);
    await engine.flush();
    expect(putProgress).toHaveBeenCalledTimes(1);
    // notifyChanged を呼ばない限り、勝手にもう一度送らない
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(putProgress).toHaveBeenCalledTimes(1);
  });

  it("setProgressOwner を切り替えると、読む記録が切り替わる", async () => {
    setProgressOwner(10);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
    setProgressOwner(11);
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
    setProgressOwner(10);
    expect(readProgress().stars).toEqual({ "add-1": 1 });
  });

  it("notifyChanged は呼んだ時点で印をつける（送る前に閉じても、次に開いたとき送り直せる）", async () => {
    const timers = fakeTimers();
    const putProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });

    await engine.start(50);
    engine.notifyChanged();
    // まだ送る前（2秒経っていない）でも、印はもう付いている
    expect(JSON.parse(window.localStorage.getItem(PENDING_KEY)!)).toEqual([50]);

    timers.advance(2000);
    await flushMicrotasks();
    expect(putProgress).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(PENDING_KEY)!)).toEqual([]);
  });

  it("stop の後に flush・notifyChanged を呼んでも何もしない", async () => {
    const timers = fakeTimers();
    const putProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });

    await engine.start(51);
    engine.stop();
    engine.notifyChanged();
    timers.advance(3000);
    await flushMicrotasks();
    await engine.flush();
    expect(putProgress).not.toHaveBeenCalled();
  });

  it("送信中に持ち主（今の画面）が別の子に切り替わっても、送った本人のキーだけに書く", async () => {
    setProgressOwner(20);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
    setProgressOwner(21);
    writeProgress({ ...EMPTY_PROGRESS, stars: { "add-9": 2 } });
    setProgressOwner(20);

    let resolvePut!: (value: { progress: ReturnType<typeof fromProgress>; playDays: string[] }) => void;
    const putProgress = vi.fn(
      () =>
        new Promise<{ progress: ReturnType<typeof fromProgress>; playDays: string[] }>((resolve) => {
          resolvePut = resolve;
        })
    );
    const getProgress = vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] }));
    const api = { putProgress, getProgress } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout });

    await engine.start(20);
    const flushPromise = engine.flush();

    // 送信中に、別の子（21）へ切り替わる
    setProgressOwner(21);

    resolvePut({ progress: fromProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 1 } }), playDays: [] });
    await flushPromise;

    expect(readProgressFor(21).stars).toEqual({ "add-9": 2 });
    expect(readProgressFor(20).stars).toEqual({ "add-1": 1 });
  });

  it("取得中に別の子を選び直しても、前の子の結果が今の子のキーに入らない", async () => {
    let resolveGetA!: (value: { progress: ReturnType<typeof fromProgress>; playDays: string[] }) => void;
    const getProgress = vi.fn((id: number) => {
      if (id === 30) {
        return new Promise<{ progress: ReturnType<typeof fromProgress>; playDays: string[] }>((resolve) => {
          resolveGetA = resolve;
        });
      }
      return Promise.resolve({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] });
    });
    const api = { getProgress, putProgress: vi.fn() } as never;
    const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout });

    const startA = engine.start(30);
    await engine.start(31);

    resolveGetA({ progress: fromProgress({ ...EMPTY_PROGRESS, stars: { "add-9": 3 } }), playDays: [] });
    await startA;

    expect(readProgressFor(31).stars).toEqual({});
  });
});

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function fromProgress(p: typeof EMPTY_PROGRESS) {
  return {
    stars: p.stars,
    best: p.best,
    challengeBest: p.challengeBest,
    endless: p.endless,
    garden: p.garden,
    gardenChangedAt: p.gardenChangedAt,
    lastModeId: p.lastModeId ?? null,
    lastModeAt: p.lastModeAt,
  };
}
