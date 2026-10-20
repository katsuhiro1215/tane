import { gradeSpec, SOROBAN_GRADES, type SorobanStageEvent } from "@/lib/game/soroban-rules";

export interface SorobanStageSpec {
  readonly grade: number;
  readonly event: SorobanStageEvent;
  readonly name: string;
  readonly description: string;
}

const EVENT_NAMES: Record<SorobanStageEvent, string> = {
  mitori: "みとりざん",
  kake: "かけざん",
  wari: "わりざん",
  mogi: "もぎけんてい",
};

function descriptionOf(grade: number, event: SorobanStageEvent): string {
  const spec = gradeSpec(grade);
  if (event === "mitori") return `${spec.mitori.digits}けた・${spec.mitori.count}口`;
  if (event === "kake") return `あわせて ${spec.kakeDigits}けた`;
  if (event === "wari") return `あわせて ${spec.wariDigits}けた`;
  return spec.wariDigits === null ? "みとり・かけ" : "みとり・かけ・わり";
}

/** 10級→4級、級の中は みとり・かけ・（わり）・もぎ（設計書2.2） */
export const SOROBAN_STAGE_SPECS: readonly SorobanStageSpec[] = SOROBAN_GRADES.flatMap(({ grade, wariDigits }) => {
  const events: SorobanStageEvent[] = wariDigits === null ? ["mitori", "kake", "mogi"] : ["mitori", "kake", "wari", "mogi"];
  return events.map((event) => ({
    grade,
    event,
    name: `${grade}きゅう ${EVENT_NAMES[event]}`,
    description: descriptionOf(grade, event),
  }));
});
