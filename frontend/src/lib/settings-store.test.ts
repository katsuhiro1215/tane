import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "@/lib/settings-store";

describe("parseSettings", () => {
  it("はじめは効果音もBGMもON", () => {
    expect(parseSettings(null)).toEqual({ se: true, bgm: true });
    expect(DEFAULT_SETTINGS).toEqual({ se: true, bgm: true });
  });

  it("保存された値を使い、形が違う項目は既定値", () => {
    expect(parseSettings(JSON.stringify({ se: false, bgm: "off" }))).toEqual({ se: false, bgm: true });
    expect(parseSettings("broken")).toEqual(DEFAULT_SETTINGS);
  });
});
