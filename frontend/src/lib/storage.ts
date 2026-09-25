import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tane:cleared-stages";

// useSyncExternalStoreのgetSnapshotはキャッシュされた同一参照を返す必要がある
// (毎回新しい配列を返すと再レンダーが無限に続く)ため、生の文字列が変わって
// いない限り前回の結果をそのまま返す。
let cachedRaw: string | null = null;
let cachedResult: string[] = [];

export function getClearedStageIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) {
    return cachedResult;
  }
  cachedRaw = raw;
  try {
    if (!raw) {
      cachedResult = [];
    } else {
      const parsed = JSON.parse(raw) as unknown;
      cachedResult = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    }
  } catch {
    cachedResult = [];
  }
  return cachedResult;
}

export function markStageCleared(stageId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const cleared = new Set(getClearedStageIds());
  cleared.add(stageId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...cleared]));
}

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot(): string[] {
  return [];
}

export function useClearedStageIds(): string[] {
  return useSyncExternalStore(subscribeToStorage, getClearedStageIds, getServerSnapshot);
}
