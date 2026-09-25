import { describe, expect, it } from "vitest";

import { isStageUnlocked } from "@/lib/game/progress";

const stages = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("isStageUnlocked", () => {
  it("先頭のステージは常に解放されている", () => {
    expect(isStageUnlocked("a", stages, [])).toBe(true);
  });

  it("前のステージがクリアされていなければ解放されない", () => {
    expect(isStageUnlocked("b", stages, [])).toBe(false);
  });

  it("前のステージがクリアされていれば解放される", () => {
    expect(isStageUnlocked("b", stages, ["a"])).toBe(true);
  });

  it("存在しないstageIdはfalseを返す", () => {
    expect(isStageUnlocked("unknown", stages, ["a", "b"])).toBe(false);
  });
});
