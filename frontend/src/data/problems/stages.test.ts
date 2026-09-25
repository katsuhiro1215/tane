import { describe, expect, it } from "vitest";

import { getNextStage, getStageById, STAGES } from "@/data/problems/stages";

describe("STAGES", () => {
  it("12ステージ定義されている（4演算 x 3レベル）", () => {
    expect(STAGES).toHaveLength(12);
  });

  it("idが重複しない", () => {
    const ids = STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getStageById", () => {
  it("存在するidを渡すと該当ステージを返す", () => {
    const stage = getStageById("add-1");
    expect(stage?.operator).toBe("add");
    expect(stage?.level).toBe(1);
  });

  it("存在しないidを渡すとundefinedを返す", () => {
    expect(getStageById("does-not-exist")).toBeUndefined();
  });
});

describe("getNextStage", () => {
  it("次のステージを返す", () => {
    const next = getNextStage(STAGES[0].id);
    expect(next?.id).toBe(STAGES[1].id);
  });

  it("最後のステージの場合はundefinedを返す", () => {
    const last = STAGES[STAGES.length - 1];
    expect(getNextStage(last.id)).toBeUndefined();
  });

  it("存在しないidの場合はundefinedを返す", () => {
    expect(getNextStage("does-not-exist")).toBeUndefined();
  });
});
