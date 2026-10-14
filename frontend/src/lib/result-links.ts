import { nextStageInMode, type Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";

export interface ResultLinks {
  nextHref?: string;
  backHref: string;
}

export function resultLinks(
  stage: Stage,
  outcome: { cleared: boolean; improved: boolean; before: Stars }
): ResultLinks {
  const grew = outcome.cleared && outcome.improved ? { stageId: stage.id, from: outcome.before } : undefined;
  const next = outcome.cleared ? nextStageInMode(stage) : undefined;
  return {
    ...(next ? { nextHref: modeHref(stage.mode, { stageId: next.id, grew }) } : {}),
    backHref: modeHref(stage.mode, { stageId: stage.id, grew }),
  };
}
