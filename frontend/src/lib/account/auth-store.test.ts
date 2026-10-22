import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_KEY, clearAuth, parseAuth, readAuth, saveAuth, type AuthState } from "@/lib/account/auth-store";

describe("parseAuth", () => {
  it("形が正しければそのまま読める", () => {
    const state: AuthState = {
      token: "abc",
      user: { id: 1, name: "たろう", email: "t@example.com", emailVerified: false },
      profileId: null,
      profileName: null,
    };
    expect(parseAuth(JSON.stringify(state))).toEqual(state);
  });

  it("空・壊れた・形が違うものは null", () => {
    expect(parseAuth(null)).toBeNull();
    expect(parseAuth("{oops")).toBeNull();
    expect(parseAuth("[1,2]")).toBeNull();
    expect(parseAuth(JSON.stringify({ token: "abc" }))).toBeNull();
    expect(parseAuth(JSON.stringify({ token: "", user: { id: 1, name: "a", email: "a@b.c", emailVerified: true }, profileId: null }))).toBeNull();
  });

  it("profileId は数字か null", () => {
    const base = { token: "abc", user: { id: 1, name: "a", email: "a@b.c", emailVerified: true } };
    expect(parseAuth(JSON.stringify({ ...base, profileId: 5 }))?.profileId).toBe(5);
    expect(parseAuth(JSON.stringify({ ...base, profileId: "5" }))).toBeNull();
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

  it("saveAuth・readAuth・clearAuth", () => {
    expect(readAuth()).toBeNull();
    const state: AuthState = {
      token: "abc",
      user: { id: 1, name: "たろう", email: "t@example.com", emailVerified: false },
      profileId: null,
      profileName: null,
    };
    saveAuth(state);
    expect(readAuth()).toEqual(state);
    expect(store.has(AUTH_KEY)).toBe(true);
    clearAuth();
    expect(readAuth()).toBeNull();
    expect(store.has(AUTH_KEY)).toBe(false);
  });
});
