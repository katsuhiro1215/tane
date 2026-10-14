import { describe, expect, it } from "vitest";

import { FLASH_STAGES, getFlashStageById, getNextFlashStage } from "@/data/problems/flash-stages";

describe("FLASH_STAGES", () => {
  it("3ステージ定義されている（Lv.1〜3）", () => {
    expect(FLASH_STAGES).toHaveLength(3);
  });

  it("idが重複しない", () => {
    const ids = FLASH_STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("既存の四則演算ステージとidが重複しない", () => {
    for (const stage of FLASH_STAGES) {
      expect(stage.id).toMatch(/^flash-/);
    }
  });
});

describe("getFlashStageById", () => {
  it("存在するidを渡すと該当ステージを返す", () => {
    const stage = getFlashStageById("flash-1");
    expect(stage?.rule.count).toBe(3);
  });

  it("存在しないidを渡すとundefinedを返す", () => {
    expect(getFlashStageById("does-not-exist")).toBeUndefined();
  });
});

describe("getNextFlashStage", () => {
  it("次のステージを返す", () => {
    const next = getNextFlashStage(FLASH_STAGES[0].id);
    expect(next?.id).toBe(FLASH_STAGES[1].id);
  });

  it("最後のステージの場合はundefinedを返す", () => {
    const last = FLASH_STAGES[FLASH_STAGES.length - 1];
    expect(getNextFlashStage(last.id)).toBeUndefined();
  });

  it("存在しないidの場合はundefinedを返す", () => {
    expect(getNextFlashStage("does-not-exist")).toBeUndefined();
  });
});
