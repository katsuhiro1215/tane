import { getStage, isModeId, maxStars, type ModeId } from "@/data/stages/catalog";
import { isChallengeModeId, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { GARDEN_LIMIT, type StarMap } from "@/lib/game/progression";
import type { EarnedStars, Stars } from "@/lib/game/stars";
import { createLocalStore } from "@/lib/local-store";
import { todayJst } from "@/lib/sync/jst-date";

export const PROGRESS_KEY = "tane:progress:v1";
export const LEGACY_KEYS = ["tane:cleared-stages"] as const;

/** 送る・合わせるときの、遊んだ日の記録の目安（設計書・Spra Go 引き継ぎ文書） */
export const MAX_PLAY_DAYS = 14;

export interface EndlessBest {
  readonly correct: number;
  readonly combo: number;
}

export interface Progress {
  readonly stars: StarMap;
  readonly best: Readonly<Record<string, number>>;
  readonly challengeBest: Readonly<Partial<Record<ChallengeModeId, number>>>;
  /** エンドレスの記録（しそくえんざん）。正解数と最長コンボを、それぞれ最高だけ残す */
  readonly endless: Readonly<Record<string, EndlessBest>>;
  readonly garden: readonly string[];
  /** にわを最後に変えた日時（ISO 8601）。サーバーとの合わせ方で使う */
  readonly gardenChangedAt: string | null;
  readonly lastModeId?: ModeId;
  /** lastModeId を最後に変えた日時（ISO 8601） */
  readonly lastModeAt: string | null;
  /** 遊んだ日（日本時間、YYYY-MM-DD）。新しい順ではなく昇順、直近 MAX_PLAY_DAYS 日ぶん */
  readonly playDays: readonly string[];
  readonly titleSeen: boolean;
}

export const EMPTY_PROGRESS: Progress = {
  stars: {},
  best: {},
  challengeBest: {},
  endless: {},
  garden: [],
  gardenChangedAt: null,
  lastModeAt: null,
  playDays: [],
  titleSeen: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEarnedStars(value: unknown): value is EarnedStars {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

const PLAY_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && value !== "" && !Number.isNaN(Date.parse(value));
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
      const stage = getStage(id);
      // 最大を超える★は、捨てずに最大まで下げる（設計書5-1。あとからステージの★の最大を下げても記録が消えない）
      if (stage && isEarnedStars(value)) stars[id] = Math.min(value, maxStars(stage)) as EarnedStars;
    }
  }
  const best: Record<string, number> = {};
  if (isRecord(data.best)) {
    for (const [id, value] of Object.entries(data.best)) {
      if (getStage(id) && isScore(value)) best[id] = value;
    }
  }
  const challengeBest: Partial<Record<ChallengeModeId, number>> = {};
  if (isRecord(data.challengeBest)) {
    for (const [id, value] of Object.entries(data.challengeBest)) {
      if (isChallengeModeId(id) && isScore(value)) challengeBest[id] = value;
    }
  }
  const endless: Record<string, EndlessBest> = {};
  if (isRecord(data.endless)) {
    for (const [id, value] of Object.entries(data.endless)) {
      if (getStage(id) && isRecord(value) && isCount(value.correct) && isCount(value.combo)) {
        endless[id] = { correct: value.correct, combo: value.combo };
      }
    }
  }
  const garden: string[] = [];
  if (Array.isArray(data.garden)) {
    for (const id of data.garden) {
      if (typeof id === "string" && getStage(id) && !garden.includes(id) && garden.length < GARDEN_LIMIT) garden.push(id);
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  const gardenChangedAt = isIsoDateTime(data.gardenChangedAt) ? data.gardenChangedAt : null;
  const lastModeAt = isIsoDateTime(data.lastModeAt) ? data.lastModeAt : null;
  const playDaySet = new Set<string>();
  if (Array.isArray(data.playDays)) {
    for (const d of data.playDays) {
      if (typeof d === "string" && PLAY_DAY_RE.test(d)) playDaySet.add(d);
    }
  }
  const playDays = [...playDaySet].sort().slice(-MAX_PLAY_DAYS);
  return {
    stars,
    best,
    challengeBest,
    endless,
    garden,
    gardenChangedAt,
    lastModeAt,
    playDays,
    titleSeen: data.titleSeen === true,
    ...(lastModeId ? { lastModeId } : {}),
  };
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

export function withChallengeScore(
  progress: Progress,
  mode: ChallengeModeId,
  score: number
): { progress: Progress; newBest: boolean } {
  const before = progress.challengeBest[mode];
  if (before !== undefined && score <= before) return { progress, newBest: false };
  return { progress: { ...progress, challengeBest: { ...progress.challengeBest, [mode]: score } }, newBest: true };
}

export type GardenToggle = "added" | "removed" | "full";

export function withGardenToggle(
  progress: Progress,
  stageId: string,
  now: Date = new Date()
): { progress: Progress; result: GardenToggle } {
  if (progress.garden.includes(stageId)) {
    return {
      progress: { ...progress, garden: progress.garden.filter((id) => id !== stageId), gardenChangedAt: now.toISOString() },
      result: "removed",
    };
  }
  if (progress.garden.length >= GARDEN_LIMIT) return { progress, result: "full" };
  return {
    progress: { ...progress, garden: [...progress.garden, stageId], gardenChangedAt: now.toISOString() },
    result: "added",
  };
}

/** 遊んだ日を足す。同じ日ならそのまま、直近 MAX_PLAY_DAYS 日ぶんだけ残す */
function withPlayDayToday(progress: Progress, now: Date): { progress: Progress; changed: boolean } {
  const today = todayJst(now);
  if (progress.playDays.includes(today)) return { progress, changed: false };
  const days = [...progress.playDays, today].sort();
  const playDays = days.length > MAX_PLAY_DAYS ? days.slice(days.length - MAX_PLAY_DAYS) : days;
  return { progress: { ...progress, playDays }, changed: true };
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
  score: number | null = null,
  now: Date = new Date()
): { improved: boolean; before: Stars; newBest: boolean; bestBefore: number | null } {
  const current = store.read();
  const before: Stars = current.stars[stageId] ?? 0;
  const bestBefore = current.best[stageId] ?? null;
  const { progress: afterResult, improved, newBest } = withResult(current, stageId, stars, score);
  const { progress: next, changed: playDayChanged } = withPlayDayToday(afterResult, now);
  if (improved || newBest || playDayChanged) save(next);
  return { improved, before, newBest, bestBefore };
}

export function recordChallengeResult(
  mode: ChallengeModeId,
  score: number,
  now: Date = new Date()
): { newBest: boolean; bestBefore: number | null } {
  const current = store.read();
  const bestBefore = current.challengeBest[mode] ?? null;
  const { progress: afterResult, newBest } = withChallengeScore(current, mode, score);
  const { progress: next, changed: playDayChanged } = withPlayDayToday(afterResult, now);
  if (newBest || playDayChanged) save(next);
  return { newBest, bestBefore };
}

export function recordEndlessResult(
  stageId: string,
  correct: number,
  combo: number,
  now: Date = new Date()
): { newBestCorrect: boolean; newBestCombo: boolean } {
  const current = store.read();
  const before = current.endless[stageId];
  const newBestCorrect = correct > 0 && (before === undefined || correct > before.correct);
  const newBestCombo = combo > 0 && (before === undefined || combo > before.combo);
  const { progress: afterPlayDay, changed: playDayChanged } = withPlayDayToday(current, now);
  if (newBestCorrect || newBestCombo) {
    const next: EndlessBest = {
      correct: Math.max(before?.correct ?? 0, correct),
      combo: Math.max(before?.combo ?? 0, combo),
    };
    // 片方が0のままだと次の読み込みで捨てられるので、最低1にしておく
    save({
      ...afterPlayDay,
      endless: { ...current.endless, [stageId]: { correct: Math.max(1, next.correct), combo: Math.max(1, next.combo) } },
    });
  } else if (playDayChanged) {
    save(afterPlayDay);
  }
  return { newBestCorrect, newBestCombo };
}

export function toggleGarden(stageId: string, now: Date = new Date()): GardenToggle {
  const { progress, result } = withGardenToggle(store.read(), stageId, now);
  if (result !== "full") save(progress);
  return result;
}

export function rememberLastMode(mode: ModeId, now: Date = new Date()): void {
  const current = store.read();
  if (current.lastModeId !== mode) save({ ...current, lastModeId: mode, lastModeAt: now.toISOString() });
}

export function markTitleSeen(): void {
  const current = store.read();
  if (!current.titleSeen) save({ ...current, titleSeen: true });
}

export function resetProgress(): void {
  store.remove();
  removeLegacyKeys();
}
