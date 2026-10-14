import { getStage, isModeId, type ModeId } from "@/data/stages/catalog";
import type { StarMap } from "@/lib/game/progression";
import type { EarnedStars, Stars } from "@/lib/game/stars";
import { createLocalStore } from "@/lib/local-store";

export const PROGRESS_KEY = "tane:progress:v1";
export const LEGACY_KEYS = ["tane:cleared-stages"] as const;

export interface Progress {
  readonly stars: StarMap;
  readonly best: Readonly<Record<string, number>>;
  readonly lastModeId?: ModeId;
  readonly titleSeen: boolean;
}

export const EMPTY_PROGRESS: Progress = { stars: {}, best: {}, titleSeen: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEarnedStars(value: unknown): value is EarnedStars {
  return value === 1 || value === 2 || value === 3;
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return EMPTY_PROGRESS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (!isRecord(data)) return EMPTY_PROGRESS;

  const stars: Record<string, EarnedStars> = {};
  if (isRecord(data.stars)) {
    for (const [id, value] of Object.entries(data.stars)) {
      if (getStage(id) && isEarnedStars(value)) stars[id] = value;
    }
  }
  const best: Record<string, number> = {};
  if (isRecord(data.best)) {
    for (const [id, value] of Object.entries(data.best)) {
      if (getStage(id) && typeof value === "number" && Number.isInteger(value) && value >= 0) best[id] = value;
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  return { stars, best, titleSeen: data.titleSeen === true, ...(lastModeId ? { lastModeId } : {}) };
}

export function withResult(
  progress: Progress,
  stageId: string,
  stars: Stars,
  score: number | null = null
): { progress: Progress; improved: boolean; newBest: boolean } {
  const before = progress.stars[stageId] ?? 0;
  const improved = stars > 0 && stars > before;
  const bestBefore = progress.best[stageId];
  const newBest = score !== null && (bestBefore === undefined || score > bestBefore);
  if (!improved && !newBest) return { progress, improved, newBest };
  return {
    progress: {
      ...progress,
      stars: improved ? { ...progress.stars, [stageId]: stars as EarnedStars } : progress.stars,
      best: newBest ? { ...progress.best, [stageId]: score as number } : progress.best,
    },
    improved,
    newBest,
  };
}

const store = createLocalStore(PROGRESS_KEY, parseProgress, EMPTY_PROGRESS);

function removeLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 消せなくても遊ぶのに困らない
    }
  }
}

function save(next: Progress) {
  store.write(next);
  removeLegacyKeys();
}

export const readProgress = store.read;
export const useProgress = store.useValue;

export function recordStageResult(
  stageId: string,
  stars: Stars,
  score: number | null = null
): { improved: boolean; before: Stars; newBest: boolean; bestBefore: number | null } {
  const current = store.read();
  const before: Stars = current.stars[stageId] ?? 0;
  const bestBefore = current.best[stageId] ?? null;
  const { progress, improved, newBest } = withResult(current, stageId, stars, score);
  if (improved || newBest) save(progress);
  return { improved, before, newBest, bestBefore };
}

export function rememberLastMode(mode: ModeId): void {
  const current = store.read();
  if (current.lastModeId !== mode) save({ ...current, lastModeId: mode });
}

export function markTitleSeen(): void {
  const current = store.read();
  if (!current.titleSeen) save({ ...current, titleSeen: true });
}

export function resetProgress(): void {
  store.remove();
  removeLegacyKeys();
}
