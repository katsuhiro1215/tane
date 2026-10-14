import { expect, it } from "vitest";

import { bgmTrackFor } from "@/lib/bgm-route";
import { BGM_FILES } from "@/lib/sound-files";

it("プレイ画面はクイズ用、それ以外はホーム用", () => {
  expect(bgmTrackFor("/stage/add-1")).toBe("quiz");
  expect(bgmTrackFor("/flash/flash-2")).toBe("quiz");
  expect(bgmTrackFor("/")).toBe("home");
  expect(bgmTrackFor("/mode/add")).toBe("home");
  expect(bgmTrackFor("/settings")).toBe("home");
});

it("フィーバーの曲がある（画面のURLからは選ばれない）", () => {
  expect(BGM_FILES.fever).toBe("/sounds/bgm-minigame.mp3");
  expect(bgmTrackFor("/stage/add-1")).not.toBe("fever");
});
