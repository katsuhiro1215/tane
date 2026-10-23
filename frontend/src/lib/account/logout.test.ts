import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveAuth } from "@/lib/account/auth-store";
import { logoutTane } from "@/lib/account/logout";
import { EMPTY_PROGRESS, readProgressFor, setProgressOwner, writeProgressFor } from "@/lib/progress-store";
import { PENDING_KEY } from "@/lib/sync/sync-engine";
import { toSynced } from "@/lib/sync/progress-merge";

const USER = { id: 1, name: "たろう", email: "t@example.com", emailVerified: false, termsOutdated: false };
const EMPTY_RESPONSE = { progress: toSynced(EMPTY_PROGRESS), playDays: [] };

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
  return store;
}

describe("logoutTane", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    setProgressOwner(null);
    vi.unstubAllGlobals();
  });

  it("この端末にある、ほかの子の記録も含めてすべて消す", async () => {
    writeProgressFor(5, { ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
    writeProgressFor(6, { ...EMPTY_PROGRESS, stars: { "add-2": 2 } });
    const putProgress = vi.fn(async () => EMPTY_RESPONSE);
    const logout = vi.fn(async () => null);

    await logoutTane({ logout, putProgress });

    expect(readProgressFor(5)).toEqual(EMPTY_PROGRESS);
    expect(readProgressFor(6)).toEqual(EMPTY_PROGRESS);
  });

  it("消す前に、今の子の送っていない記録を試しに送る", async () => {
    saveAuth({ token: "t", user: USER, profileId: 7, profileName: "ゆうた" });
    setProgressOwner(7);
    writeProgressFor(7, { ...EMPTY_PROGRESS, stars: { "add-3": 3 } });
    const putProgress = vi.fn(async () => EMPTY_RESPONSE);
    const logout = vi.fn(async () => null);

    await logoutTane({ logout, putProgress });

    expect(putProgress).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ progress: expect.objectContaining({ stars: { "add-3": 3 } }) })
    );
  });

  it("送るのに失敗しても、api.logout() が失敗しても、ログアウトは最後まで進める", async () => {
    setProgressOwner(8);
    writeProgressFor(8, { ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
    const putProgress = vi.fn(async () => {
      throw new Error("network");
    });
    const logout = vi.fn(async () => {
      throw new Error("network");
    });

    await expect(logoutTane({ logout, putProgress })).resolves.toBeUndefined();
    expect(readProgressFor(8)).toEqual(EMPTY_PROGRESS);
  });

  it("送っていない印（tane:sync:v1）も消す", async () => {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify([9]));
    const putProgress = vi.fn(async () => EMPTY_RESPONSE);
    const logout = vi.fn(async () => null);

    await logoutTane({ logout, putProgress });

    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });
});
