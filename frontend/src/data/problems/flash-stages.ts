import type { FlashRule } from "@/lib/game/flash-problem";

export interface FlashStageDefinition {
  id: string;
  rule: FlashRule;
  title: string;
}

const RULES: FlashRule[] = [
  { count: 3, digits: 1, stepMs: 1200, gapMs: 300 },
  { count: 4, digits: 1, stepMs: 900, gapMs: 250 },
  { count: 5, digits: 1, stepMs: 700, gapMs: 200 },
];

export const FLASH_STAGES: FlashStageDefinition[] = RULES.map((rule, index) => ({
  id: `flash-${index + 1}`,
  rule,
  title: `フラッシュ暗算 Lv.${index + 1}`,
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
