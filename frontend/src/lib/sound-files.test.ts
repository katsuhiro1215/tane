import { existsSync } from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

import { BGM_FILES, SOUND_FILES } from "@/lib/sound-files";

it("効果音とBGMのファイルがすべて public にある", () => {
  const files = [...Object.values(SOUND_FILES), ...Object.values(BGM_FILES)];
  expect(files.filter((p) => !existsSync(path.join(process.cwd(), "public", p)))).toEqual([]);
});
