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

function nextToPlayInMode(mode: ModeId, stars: StarMap): Stage | undefined {
  const list = stagesOfMode(mode);
  return (
    list.find((stage) => isUnlocked(stage, stars) && starsOf(stars, stage.id) === 0) ??
    list.find((stage) => starsOf(stars, stage.id) < MAX_STARS)
  );
}

export function continueTarget(stars: StarMap, lastModeId?: ModeId): Stage {
  const start = lastModeId ?? "add";
  const startIndex = MODE_IDS.indexOf(start);
  for (let i = 0; i < MODE_IDS.length; i++) {
    const found = nextToPlayInMode(MODE_IDS[(startIndex + i) % MODE_IDS.length], stars);
    if (found) return found;
  }
  const list = stagesOfMode(start);
  return list[list.length - 1];
}

export function initialFocusStage(mode: ModeId, stars: StarMap, requestedStageId?: string): Stage {
  const list = stagesOfMode(mode);
  const requested = list.find((stage) => stage.id === requestedStageId);
  if (requested) return requested;
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
