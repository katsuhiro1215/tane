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

const CLEARED_STAGES_CHANGED_EVENT = "tane:cleared-stages-changed";

export function markStageCleared(stageId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const cleared = new Set(getClearedStageIds());
  cleared.add(stageId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...cleared]));
  // "storage"イベントは他タブでの変更にしか発火せず、同一タブ内で
  // markStageClearedを呼んでもuseSyncExternalStoreの購読者に通知されない。
  // 同一タブでの再読み込みが必要な画面(将来トップに戻らず結果表示だけ
  // 更新するUI等)のために独自イベントも発行しておく。
  window.dispatchEvent(new Event(CLEARED_STAGES_CHANGED_EVENT));
}

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CLEARED_STAGES_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CLEARED_STAGES_CHANGED_EVENT, callback);
  };
}

function getServerSnapshot(): string[] {
  return [];
}

export function useClearedStageIds(): string[] {
  return useSyncExternalStore(subscribeToStorage, getClearedStageIds, getServerSnapshot);
}
