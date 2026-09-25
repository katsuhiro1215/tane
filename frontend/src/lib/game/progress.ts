export interface StageLike {
  id: string;
}

export function isStageUnlocked(
  stageId: string,
  stages: StageLike[],
  clearedStageIds: string[]
): boolean {
  const index = stages.findIndex((stage) => stage.id === stageId);
  if (index === -1) {
    return false;
  }
  if (index === 0) {
    return true;
  }
  return clearedStageIds.includes(stages[index - 1].id);
}
