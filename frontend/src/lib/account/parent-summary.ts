import { displayNumber, MODE_IDS, MODES, STAGES, maxStars, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import { isUnlocked, modeStarSummary, starsOf } from "@/lib/game/progression";
import type { Progress } from "@/lib/progress-store";

export interface ParentModeSummary {
  readonly modeId: ModeId;
  readonly label: string;
  readonly earned: number;
  readonly max: number;
  readonly reached: string | null;
}

export interface ParentSummary {
  readonly modes: readonly ParentModeSummary[];
  readonly lastPlayed: string | null;
  readonly daysThisWeek: number;
  readonly stuck: readonly string[];
}

function gradeOf(stage: Stage): number {
  return stage.kind === "soroban" ? stage.grade : 0;
}

/** あそびごとの表示：たねまきは「3-2」、そろばんは「6きゅう」、ほかは「ステージ 5」 */
function reachedLabel(mode: ModeId, progress: Progress): string | null {
  if (modeStarSummary(mode, progress.stars).earned === 0) return null;
  if (mode === "soroban") {
    const played = stagesOfMode("soroban").filter((stage) => starsOf(progress.stars, stage.id) >= 1);
    const grade = Math.min(...played.map(gradeOf));
    return `${grade}きゅう`;
  }
  // 一番後ろの「開いている」ステージ（手前が閉じていたら、そこで止める。1つだけ飛んで開くことはない）
  let furthest: Stage | undefined;
  for (const stage of stagesOfMode(mode)) {
    if (!isUnlocked(stage, progress.stars)) break;
    furthest = stage;
  }
  if (!furthest) return null;
  return mode === "shisoku" ? displayNumber(furthest) : `ステージ ${displayNumber(furthest)}`;
}

export function stageLabel(stage: Stage): string {
  return `${MODES[stage.mode].label} ${displayNumber(stage)} ${stage.name}`;
}

function dayDiff(today: string, day: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
}

export function parentSummary(progress: Progress, playDays: readonly string[], today: string): ParentSummary {
  const modes = MODE_IDS.map((mode) => {
    const { earned, max } = modeStarSummary(mode, progress.stars);
    return { modeId: mode, label: MODES[mode].label, earned, max, reached: reachedLabel(mode, progress) };
  });

  const lastPlayed = playDays.length > 0 ? [...playDays].sort().at(-1)! : null;
  const daysThisWeek = playDays.filter((day) => {
    const diff = dayDiff(today, day);
    return diff >= 0 && diff <= 6;
  }).length;

  // 新しい順（ゲームの進み方の並び順で後ろのほうから）に3つまで
  const stuck = STAGES.filter((stage) => {
    const stars = starsOf(progress.stars, stage.id);
    return stars >= 1 && stars < maxStars(stage) / 2;
  })
    .reverse()
    .slice(0, 3)
    .map(stageLabel);

  return { modes, lastPlayed, daysThisWeek, stuck };
}
