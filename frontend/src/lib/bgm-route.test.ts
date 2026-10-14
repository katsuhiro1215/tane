import { expect, it } from "vitest";

import { bgmTrackFor } from "@/lib/bgm-route";

it("プレイ画面はクイズ用、それ以外はホーム用", () => {
  expect(bgmTrackFor("/stage/add-1")).toBe("quiz");
  expect(bgmTrackFor("/flash/flash-2")).toBe("quiz");
  expect(bgmTrackFor("/")).toBe("home");
  expect(bgmTrackFor("/mode/add")).toBe("home");
  expect(bgmTrackFor("/settings")).toBe("home");
});
