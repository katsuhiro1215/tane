import { getStage, isModeId, maxStars } from "@/data/stages/catalog";
import { isChallengeModeId, type ChallengeModeId } from "@/lib/game/challenge-rules";
import type { EarnedStars } from "@/lib/game/stars";
import type { EndlessBest, Progress } from "@/lib/progress-store";

/**
 * Spra Go のサーバーと受け渡しする記録の形（設計書・Spra Go 引き継ぎ文書）。
 * 空のマップは {}、空の配列は []。日時は null か ISO 8601 の文字列。
 */
export interface SyncedProgress {
  stars: Record<string, number>;
  best: Record<string, number>;
  challengeBest: Partial<Record<ChallengeModeId, number>>;
  endless: Record<string, EndlessBest>;
  garden: string[];
  gardenChangedAt: string | null;
  lastModeId: string | null;
  lastModeAt: string | null;
}

/** Progress → SyncedProgress。stars の無いステージの best は含めない（サーバーの規則に合わせる） */
export function toSynced(progress: Progress): SyncedProgress {
  const best: Record<string, number> = {};
  for (const [stageId, score] of Object.entries(progress.best)) {
    if (progress.stars[stageId] !== undefined) best[stageId] = score;
  }
  return {
    stars: { ...progress.stars } as Record<string, number>,
    best,
    challengeBest: { ...progress.challengeBest },
    endless: { ...progress.endless },
    garden: [...progress.garden],
    gardenChangedAt: progress.gardenChangedAt,
    lastModeId: progress.lastModeId ?? null,
    lastModeAt: progress.lastModeAt,
  };
}

function newer(aAt: string | null, bAt: string | null): "a" | "b" {
  if (aAt === null && bAt === null) return "a";
  if (aAt === null) return "b";
  if (bAt === null) return "a";
  const aTime = Date.parse(aAt);
  const bTime = Date.parse(bAt);
  // 同じ時刻なら a を残す（先に渡したほう）
  return bTime > aTime ? "b" : "a";
}

function mergeRecordMax(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = out[key] === undefined ? value : Math.max(out[key], value);
  }
  return out;
}

function mergeEndless(a: Record<string, EndlessBest>, b: Record<string, EndlessBest>): Record<string, EndlessBest> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, EndlessBest> = {};
  for (const key of keys) {
    const av = a[key];
    const bv = b[key];
    out[key] = {
      correct: Math.max(av?.correct ?? 0, bv?.correct ?? 0),
      combo: Math.max(av?.combo ?? 0, bv?.combo ?? 0),
    };
  }
  return out;
}

/**
 * SyncedProgress → Progress。知らないステージIDは捨て、★は最大まで下げる（設計書5-1）。
 * `titleSeen` など同期しないものは local のまま
 */
export function fromSynced(synced: SyncedProgress, local: Progress): Progress {
  const stars: Record<string, EarnedStars> = {};
  for (const [stageId, value] of Object.entries(synced.stars)) {
    const stage = getStage(stageId);
    if (stage && value >= 1 && Number.isInteger(value)) {
      stars[stageId] = Math.min(value, maxStars(stage)) as EarnedStars;
    }
  }
  const best: Record<string, number> = {};
  for (const [stageId, score] of Object.entries(synced.best)) {
    if (getStage(stageId)) best[stageId] = score;
  }
  const challengeBest: Partial<Record<ChallengeModeId, number>> = {};
  for (const [mode, score] of Object.entries(synced.challengeBest)) {
    if (isChallengeModeId(mode) && typeof score === "number") challengeBest[mode] = score;
  }
  const endless: Record<string, EndlessBest> = {};
  for (const [stageId, value] of Object.entries(synced.endless)) {
    if (getStage(stageId)) endless[stageId] = value;
  }
  const garden = synced.garden.filter((id) => getStage(id));
  const lastModeId = synced.lastModeId && isModeId(synced.lastModeId) ? synced.lastModeId : undefined;
  return {
    ...local,
    stars,
    best,
    challengeBest,
    endless,
    garden,
    gardenChangedAt: synced.gardenChangedAt,
    lastModeAt: synced.lastModeAt,
    ...(lastModeId ? { lastModeId } : { lastModeId: undefined }),
  };
}

/** 2つの記録を合わせる。★・最高点・チャレンジ・エンドレスは大きいほう、にわと最後のあそびは日時が新しいほう */
export function mergeProgress(a: SyncedProgress, b: SyncedProgress): SyncedProgress {
  const garden = newer(a.gardenChangedAt, b.gardenChangedAt) === "a" ? a.garden : b.garden;
  const gardenChangedAt = newer(a.gardenChangedAt, b.gardenChangedAt) === "a" ? a.gardenChangedAt : b.gardenChangedAt;
  const lastModeWinner = newer(a.lastModeAt, b.lastModeAt);
  return {
    stars: mergeRecordMax(a.stars, b.stars),
    best: mergeRecordMax(a.best, b.best),
    challengeBest: mergeRecordMax(
      a.challengeBest as Record<string, number>,
      b.challengeBest as Record<string, number>
    ) as Partial<Record<ChallengeModeId, number>>,
    endless: mergeEndless(a.endless, b.endless),
    garden,
    gardenChangedAt,
    lastModeId: lastModeWinner === "a" ? a.lastModeId : b.lastModeId,
    lastModeAt: lastModeWinner === "a" ? a.lastModeAt : b.lastModeAt,
  };
}
