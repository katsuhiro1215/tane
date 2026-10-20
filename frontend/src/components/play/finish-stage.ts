import type { StageOutcome } from "@/components/play/stage-result";
import { stageTargetMs, type Stage } from "@/data/stages/catalog";
import type { PlaySession } from "@/lib/game/play-session";
import type { StageStatus } from "@/lib/game/stage";
import { missedThreeByMs, mistakesOf, starsForResult } from "@/lib/game/stars";
import { recordStageResult } from "@/lib/progress-store";

/** ステージが終わったときに★を決め、記録を保存し、結果画面に渡す値を返す */
export function finishStage(
  stage: Stage,
  next: { status: StageStatus; currentIndex: number; correctCount: number },
  session: PlaySession
): StageOutcome {
  const input = {
    status: next.status,
    mistakes: mistakesOf(next),
    elapsedMs: session.elapsedMs,
    targetMs: stageTargetMs(stage),
  };
  const stars = starsForResult(input);
  const cleared = next.status === "cleared";
  const record = recordStageResult(stage.id, stars, cleared ? session.score : null);
  return {
    stars,
    improved: record.improved,
    before: record.before,
    score: session.score,
    newBest: record.newBest,
    elapsedMs: session.elapsedMs,
    targetMs: input.targetMs,
    missedThreeByMs: missedThreeByMs(input),
  };
}
