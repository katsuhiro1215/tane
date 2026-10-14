import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  read: () => T;
  write: (value: T) => void;
  remove: () => void;
  useValue: () => T;
}

/**
 * localStorage の1つのキーを、useSyncExternalStore で読める形にする。
 * getSnapshot は同じ中身なら同じ参照を返す必要がある（毎回新しい値だと再描画が止まらない）ため、
 * 生の文字列が変わったときだけ parse し直す。
 */
export function createLocalStore<T>(key: string, parse: (raw: string | null) => T, fallback: T): LocalStore<T> {
  // "storage" イベントはほかのタブの変更でしか届かないため、同じタブ用に独自のイベントも出す
  const eventName = `tane:store-changed:${key}`;
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;
  // 保存できない環境（Cookieのブロック・容量いっぱいなど）でも、今の画面の中では遊び続けられるようにメモリに持つ
  let memoryRaw: string | null = null;
  let useMemory = false;

  function readRaw(): string | null {
    if (useMemory) return memoryRaw;
    try {
      return window.localStorage.getItem(key);
    } catch {
      useMemory = true;
      return memoryRaw;
    }
  }

  function read(): T {
    if (typeof window === "undefined") return fallback;
    const raw = readRaw();
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    cachedValue = parse(raw);
    return cachedValue;
  }

  function notify() {
    window.dispatchEvent(new Event(eventName));
  }

  function write(value: T) {
    memoryRaw = JSON.stringify(value);
    try {
      window.localStorage.setItem(key, memoryRaw);
    } catch {
      useMemory = true;
    }
    notify();
  }

  function remove() {
    memoryRaw = null;
    try {
      window.localStorage.removeItem(key);
    } catch {
      useMemory = true;
    }
    notify();
  }

  function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(eventName, callback);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, remove, useValue };
}
