import { getStage, type ModeId } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";

export interface ModeSearch {
  requestedStageId?: string;
  grewStageId?: string;
  grewFrom?: Stars;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseModeSearchParams(mode: ModeId, searchParams: SearchParams): ModeSearch {
  const inMode = (id: string | undefined) => {
    const stage = id ? getStage(id) : undefined;
    return stage && stage.mode === mode ? stage.id : undefined;
  };
  const requestedStageId = inMode(first(searchParams.stage));
  const grewStageId = inMode(first(searchParams.grew));
  const from = Number(first(searchParams.from));
  const grewFrom: Stars = from === 1 || from === 2 ? from : 0;

  return {
    ...(requestedStageId ? { requestedStageId } : {}),
    ...(grewStageId ? { grewStageId, grewFrom } : {}),
  };
}

export function modeHref(
  mode: ModeId,
  options: { stageId?: string; grew?: { stageId: string; from: Stars } } = {}
): string {
  const query = new URLSearchParams();
  if (options.stageId) query.set("stage", options.stageId);
  if (options.grew) {
    query.set("grew", options.grew.stageId);
    query.set("from", String(options.grew.from));
  }
  const text = query.toString();
  return text ? `/mode/${mode}?${text}` : `/mode/${mode}`;
}
