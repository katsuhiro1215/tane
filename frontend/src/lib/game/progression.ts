import { getStage, MODE_IDS, STAGES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import type { EarnedStars, Stars } from "@/lib/game/stars";

export type StarMap = Readonly<Partial<Record<string, EarnedStars>>>;

export const CHALLENGE_UNLOCK_STARS = 30;
export const GARDEN_LIMIT = 8;
const MAX_STARS = 3;

export function starsOf(stars: StarMap, stageId: string): Stars {
  return stars[stageId] ?? 0;
}

export function isUnlocked(stage: Stage, stars: StarMap): boolean {
  // そろばんは、どの級もみとりざん（級の最初）が初めから開いている
  if (stage.kind === "soroban" && stage.event === "mitori") return true;
  if (stage.number === 1) return true;
  const previous = stagesOfMode(stage.mode)[stage.number - 2];
  return starsOf(stars, previous.id) >= 1;
}

export function totalStars(stars: StarMap): number {
  return STAGES.reduce((sum, stage) => sum + starsOf(stars, stage.id), 0);
}

export function friendsCount(stars: StarMap): number {
  return STAGES.filter((stage) => starsOf(stars, stage.id) >= 1).length;
}

export function modeStarSummary(mode: ModeId, stars: StarMap): { earned: number; max: number } {
  const list = stagesOfMode(mode);
  return {
    earned: list.reduce((sum, stage) => sum + starsOf(stars, stage.id), 0),
    max: list.length * MAX_STARS,
  };
}

export function isChallengeUnlocked(stars: StarMap): boolean {
  return totalStars(stars) >= CHALLENGE_UNLOCK_STARS;
}

function gradeOf(stage: Stage): number {
  return stage.kind === "soroban" ? stage.grade : 0;
}

/** そろばんの「いまの級」の次に遊ぶステージ。★1以上がある、いちばん上の級（数字の小さい級）の続き（設計書2.4） */
export function sorobanNextStage(stars: StarMap): Stage {
  const list = stagesOfMode("soroban");
  const played = list.filter((stage) => starsOf(stars, stage.id) >= 1);
  if (played.length === 0) return list[0];
  const grade = Math.min(...played.map(gradeOf));
  const inGrade = list.filter((stage) => gradeOf(stage) === grade);
  return (
    inGrade.find((stage) => isUnlocked(stage, stars) && starsOf(stars, stage.id) === 0) ??
    inGrade.find((stage) => starsOf(stars, stage.id) < MAX_STARS) ??
    list.find((stage) => gradeOf(stage) === grade - 1 && stage.kind === "soroban" && stage.event === "mitori") ??
    list[list.length - 1]
  );
}

function nextToPlayInMode(mode: ModeId, stars: StarMap): Stage | undefined {
  if (mode === "soroban") {
    const next = sorobanNextStage(stars);
    return starsOf(stars, next.id) < MAX_STARS ? next : undefined;
  }
  const list = stagesOfMode(mode);
  return (
    list.find((stage) => isUnlocked(stage, stars) && starsOf(stars, stage.id) === 0) ??
    list.find((stage) => starsOf(stars, stage.id) < MAX_STARS)
  );
}

export function continueTarget(stars: StarMap, lastModeId?: ModeId): Stage {
  const start = lastModeId ?? "add";
  // そろばんは、最後に遊んだあそびのときだけ続きを探す。四則演算とフラッシュを回るときは、そろばんに飛ばさない
  const cycle = start === "soroban" ? MODE_IDS : MODE_IDS.filter((mode) => mode !== "soroban");
  const startIndex = cycle.indexOf(start);
  for (let i = 0; i < cycle.length; i++) {
    const found = nextToPlayInMode(cycle[(startIndex + i) % cycle.length], stars);
    if (found) return found;
  }
  const list = stagesOfMode(start);
  return list[list.length - 1];
}

export function initialFocusStage(mode: ModeId, stars: StarMap, requestedStageId?: string): Stage {
  const list = stagesOfMode(mode);
  const requested = list.find((stage) => stage.id === requestedStageId);
  if (requested) return requested;
  if (mode === "soroban") return sorobanNextStage(stars);
  const unlocked = list.filter((stage) => isUnlocked(stage, stars));
  return unlocked[unlocked.length - 1];
}

/** にわに出す子。選んだ子（会えた子だけ）を選んだ順に先に並べ、足りない分を★の多い順・後ろのステージ順で埋める */
export function gardenFriends(stars: StarMap, chosen: readonly string[] = [], limit: number = GARDEN_LIMIT): Stage[] {
  const picked = chosen
    .map((id) => getStage(id))
    .filter((stage): stage is Stage => stage !== undefined && starsOf(stars, stage.id) >= 1);
  const pickedIds = new Set(picked.map((stage) => stage.id));
  const auto = STAGES.map((stage, order) => ({ stage, order, stars: starsOf(stars, stage.id) }))
    .filter((entry) => entry.stars >= 1 && !pickedIds.has(entry.stage.id))
    .sort((x, y) => y.stars - x.stars || y.order - x.order)
    .map((entry) => entry.stage);
  return [...picked, ...auto].slice(0, limit);
}
