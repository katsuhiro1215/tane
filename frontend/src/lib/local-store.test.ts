import { afterEach, describe, expect, it, vi } from "vitest";

import { createLocalStore } from "@/lib/local-store";

const parse = (raw: string | null) => (raw ? (JSON.parse(raw) as { n: number }) : { n: 0 });

function stubWindow(localStorage: unknown) {
  vi.stubGlobal("window", {
    get localStorage() {
      if (localStorage instanceof Error) throw localStorage;
      return localStorage;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
}

describe("localStorage が使えないとき", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("触れただけで例外になる環境でも、書いた値をその画面の中では読める", () => {
    stubWindow(new Error("SecurityError"));
    const store = createLocalStore("test:a", parse, { n: 0 });
    store.write({ n: 1 });
    expect(store.read()).toEqual({ n: 1 });
  });

  it("書き込みだけ失敗する環境（容量いっぱいなど）でも、書いた値を読める", () => {
    stubWindow({
      getItem: () => JSON.stringify({ n: 5 }),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    });
    const store = createLocalStore("test:b", parse, { n: 0 });
    expect(store.read()).toEqual({ n: 5 });
    store.write({ n: 6 });
    expect(store.read()).toEqual({ n: 6 });
  });

  it("消したあとは既定値に戻る", () => {
    stubWindow(new Error("SecurityError"));
    const store = createLocalStore("test:c", parse, { n: 0 });
    store.write({ n: 1 });
    store.remove();
    expect(store.read()).toEqual({ n: 0 });
  });
});
