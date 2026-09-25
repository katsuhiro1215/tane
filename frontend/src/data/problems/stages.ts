import type { Operator } from "@/lib/game/problem-generator";

export interface StageDefinition {
  id: string;
  operator: Operator;
  level: number;
  title: string;
}

const OPERATOR_LABEL: Record<Operator, string> = {
  add: "たし算",
  sub: "ひき算",
  mul: "かけ算",
  div: "わり算",
};

function buildStages(): StageDefinition[] {
  const operators: Operator[] = ["add", "sub", "mul", "div"];
  const stages: StageDefinition[] = [];
  for (const operator of operators) {
    for (let level = 1; level <= 3; level++) {
      stages.push({
        id: `${operator}-${level}`,
        operator,
        level,
        title: `${OPERATOR_LABEL[operator]} Lv.${level}`,
      });
    }
  }
  return stages;
}

export const STAGES: StageDefinition[] = buildStages();

export function getStageById(id: string): StageDefinition | undefined {
  return STAGES.find((stage) => stage.id === id);
}

export function getNextStage(id: string): StageDefinition | undefined {
  const index = STAGES.findIndex((stage) => stage.id === id);
  if (index === -1 || index === STAGES.length - 1) {
    return undefined;
  }
  return STAGES[index + 1];
}
