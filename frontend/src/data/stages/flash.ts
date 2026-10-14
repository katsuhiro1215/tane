import type { FlashRule } from "@/lib/game/flash-problem";

import type { StageSpec } from "./spec";

export const FLASH_STAGE_SPECS: StageSpec<FlashRule>[] = [
  { name: "3つのかず", description: "1けた ・ ゆっくり", rule: { count: 3, digits: 1, stepMs: 1200, gapMs: 300 } },
  { name: "4つのかず", description: "1けた", rule: { count: 4, digits: 1, stepMs: 900, gapMs: 250 } },
  { name: "5つのかず", description: "1けた", rule: { count: 5, digits: 1, stepMs: 700, gapMs: 200 } },
  { name: "7つのかず", description: "1けた", rule: { count: 7, digits: 1, stepMs: 700, gapMs: 200 } },
  { name: "5つ はやい", description: "1けた ・ はやい", rule: { count: 5, digits: 1, stepMs: 450, gapMs: 150 } },
  { name: "ボス 2けた", description: "2けた ・ 3つのかず", rule: { count: 3, digits: 2, stepMs: 900, gapMs: 250 } },
];
