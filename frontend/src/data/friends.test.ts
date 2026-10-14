import { expect, it } from "vitest";

import { COLOR_LABELS, FRIENDS } from "@/data/friends";
import { STAGES } from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";

it("54ステージすべてに名前とひとことがあり、余分なidは無い", () => {
  expect(Object.keys(FRIENDS).sort()).toEqual(STAGES.map((stage) => stage.id).sort());
  for (const stage of STAGES) {
    expect(FRIENDS[stage.id].name.length).toBeGreaterThan(0);
    expect(FRIENDS[stage.id].line.length).toBeGreaterThan(0);
  }
});

it("名前が重ならない", () => {
  const names = Object.values(FRIENDS).map((friend) => friend.name);
  expect(new Set(names).size).toBe(names.length);
});

it("11色すべてに呼び名がある", () => {
  for (const color of SPRU_COLORS) expect(COLOR_LABELS[color].length).toBeGreaterThan(0);
});

it("設計書の付録どおり", () => {
  expect(FRIENDS["add-1"]).toEqual({ name: "ピッコ", line: "いっしょに かぞえよ！" });
  expect(FRIENDS["flash-6"]).toEqual({ name: "ライカ", line: "2けたの フラッシュ、いくぞ！" });
  expect(COLOR_LABELS.spru).toBe("わかば");
  expect(COLOR_LABELS.obsidian).toBe("オブシディアン");
});
