import { useSyncExternalStore } from "react";

import { AUTH_KEY } from "@/lib/account/auth-store";
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

/** プロフィールごとの保存キー。null はゲスト（ログイン前・端末だけの記録） */
export function progressKeyFor(profileId: number | null): string {
  return profileId === null ? PROGRESS_KEY : `${PROGRESS_KEY}:p${profileId}`;
}

const storeCache = new Map<string, ReturnType<typeof createLocalStore<Progress>>>();

function storeFor(key: string) {
  let s = storeCache.get(key);
  if (!s) {
    s = createLocalStore(key, parseProgress, EMPTY_PROGRESS);
    storeCache.set(key, s);
  }
  return s;
}

/**
 * ログイン中なら、保存ずみのプロフィールのキーから始める（モジュール読み込み時の1回だけ）。
 * これをしないと、再読み込みの最初の一瞬だけゲストの記録が出てしまう
 */
function initialOwnerKey(): string {
  if (typeof window === "undefined") return PROGRESS_KEY;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return PROGRESS_KEY;
    const data = JSON.parse(raw) as { profileId?: unknown };
    return typeof data.profileId === "number" ? progressKeyFor(data.profileId) : PROGRESS_KEY;
  } catch {
    return PROGRESS_KEY;
  }
}

// 今、画面が読み書きしている先。ログインして子を選ぶと setProgressOwner で切り替わる
let currentKey = initialOwnerKey();
// useSyncExternalStore 用の、持ち主の切り替え・値の変化をまとめて知らせるイベント（local-store.ts の per-key イベントとは別）
const PROGRESS_CHANGED_EVENT = "tane:progress-changed";

function dispatchProgressChanged() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT));
  } catch {
    // テスト環境などで dispatchEvent が無くても遊ぶのに困らない
  }
}

/** 記録の持ち主を切り替える（ログイン後、プロフィールを選んだとき／ログアウトしたとき） */
export function setProgressOwner(profileId: number | null): void {
  const key = progressKeyFor(profileId);
  if (key === currentKey) return;
  currentKey = key;
  dispatchProgressChanged();
}

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
  storeFor(currentKey).write(next);
  removeLegacyKeys();
  dispatchProgressChanged();
}

/** 記録をまるごと置き換える（同期で、サーバーと合わせた結果を書き込むときに使う） */
export function writeProgress(next: Progress): void {
  save(next);
}

export function readProgress(): Progress {
  return storeFor(currentKey).read();
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener(PROGRESS_CHANGED_EVENT, callback);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener(PROGRESS_CHANGED_EVENT, callback);
        window.removeEventListener("storage", callback);
      };
    },
    readProgress,
    () => EMPTY_PROGRESS
  );
}

/** ログイン前・端末だけの記録（持ち主に関係なく、いつもゲストのキー） */
export function readGuestProgress(): Progress {
  return storeFor(PROGRESS_KEY).read();
}

/** ゲストの記録を空にする（引き継ぎが終わったあと） */
export function clearGuestProgress(): void {
  storeFor(PROGRESS_KEY).remove();
  if (currentKey === PROGRESS_KEY) dispatchProgressChanged();
}

/**
 * 指定したプロフィールの記録を、今の持ち主に関係なく読み書きする（同期エンジン用）。
 * 持ち主が送信中に切り替わっても、ここで指定した相手のキーだけを読み書きするので、
 * 別の子・ゲストの記録と混ざらない
 */
export function readProgressFor(profileId: number): Progress {
  return storeFor(progressKeyFor(profileId)).read();
}

export function writeProgressFor(profileId: number, next: Progress): void {
  storeFor(progressKeyFor(profileId)).write(next);
  if (currentKey === progressKeyFor(profileId)) dispatchProgressChanged();
}

/** この端末にある、プロフィールごとの記録をすべて消す（ログアウト。設計書6-5。ゲストの記録は残す） */
export function clearAllProfileProgress(): void {
  if (typeof window === "undefined") return;
  const prefix = `${PROGRESS_KEY}:p`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // 消せなくても遊ぶのに困らない
  }
  if (currentKey.startsWith(prefix)) dispatchProgressChanged();
}

export function recordStageResult(
  stageId: string,
  stars: Stars,
  score: number | null = null,
  now: Date = new Date()
): { improved: boolean; before: Stars; newBest: boolean; bestBefore: number | null } {
  const current = storeFor(currentKey).read();
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
  const current = storeFor(currentKey).read();
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
  const current = storeFor(currentKey).read();
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
  const { progress, result } = withGardenToggle(storeFor(currentKey).read(), stageId, now);
  if (result !== "full") save(progress);
  return result;
}

export function rememberLastMode(mode: ModeId, now: Date = new Date()): void {
  const current = storeFor(currentKey).read();
  if (current.lastModeId !== mode) save({ ...current, lastModeId: mode, lastModeAt: now.toISOString() });
}

export function markTitleSeen(): void {
  const current = storeFor(currentKey).read();
  if (!current.titleSeen) save({ ...current, titleSeen: true });
}

export function resetProgress(): void {
  storeFor(currentKey).remove();
  removeLegacyKeys();
  dispatchProgressChanged();
}
