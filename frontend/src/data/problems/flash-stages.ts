import { FLASH_LEVELS, type FlashLevel } from "@/lib/game/flash-problem";

export interface FlashStageDefinition {
  id: string;
  level: FlashLevel;
  title: string;
}

export const FLASH_STAGES: FlashStageDefinition[] = FLASH_LEVELS.map((level) => ({
  id: `flash-${level}`,
  level,
  title: `フラッシュ暗算 Lv.${level}`,
}));

export function getFlashStageById(id: string): FlashStageDefinition | undefined {
  return FLASH_STAGES.find((stage) => stage.id === id);
}

export function getNextFlashStage(id: string): FlashStageDefinition | undefined {
  const index = FLASH_STAGES.findIndex((stage) => stage.id === id);
  if (index === -1 || index === FLASH_STAGES.length - 1) {
    return undefined;
  }
  return FLASH_STAGES[index + 1];
}
