import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allSpruImagePaths, growthImage } from "@/lib/spru-images";

describe("spru-images", () => {
  it("使う画像がすべて public にある", () => {
    const missing = allSpruImagePaths().filter((p) => !existsSync(path.join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
  });

  it("growthImage は色と育ち具合からパスを作る", () => {
    expect(growthImage("gold", "flower")).toBe("/spru/growth/gold/flower.webp");
  });
});
