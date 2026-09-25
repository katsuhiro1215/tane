const STORAGE_KEY = "tane:cleared-stages";

export function getClearedStageIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function markStageCleared(stageId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const cleared = new Set(getClearedStageIds());
  cleared.add(stageId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...cleared]));
}
