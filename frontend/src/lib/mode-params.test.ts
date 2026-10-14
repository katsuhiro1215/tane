import { describe, expect, it } from "vitest";

import { modeHref, parseModeSearchParams } from "@/lib/mode-params";

describe("parseModeSearchParams", () => {
  it("同じあそびのステージだけを受け付ける", () => {
    expect(parseModeSearchParams("add", { stage: "add-4" })).toEqual({ requestedStageId: "add-4" });
    expect(parseModeSearchParams("add", { stage: "sub-3" })).toEqual({});
    expect(parseModeSearchParams("add", { stage: "add-99" })).toEqual({});
  });

  it("grew と from を読み、from は0〜2以外なら0", () => {
    expect(parseModeSearchParams("add", { stage: "add-5", grew: "add-4", from: "1" })).toEqual({
      requestedStageId: "add-5",
      grewStageId: "add-4",
      grewFrom: 1,
    });
    expect(parseModeSearchParams("add", { grew: "add-4", from: "9" })).toEqual({ grewStageId: "add-4", grewFrom: 0 });
    expect(parseModeSearchParams("add", { grew: "flash-1" })).toEqual({});
  });

  it("同じ名前が2つ来たら最初を使う", () => {
    expect(parseModeSearchParams("add", { stage: ["add-2", "add-3"] })).toEqual({ requestedStageId: "add-2" });
  });
});

describe("modeHref", () => {
  it("指定が無ければ /mode/<あそび>", () => {
    expect(modeHref("mul")).toBe("/mode/mul");
  });

  it("stage と grew を付ける", () => {
    expect(modeHref("add", { stageId: "add-5", grew: { stageId: "add-4", from: 0 } })).toBe(
      "/mode/add?stage=add-5&grew=add-4&from=0"
    );
  });
});
