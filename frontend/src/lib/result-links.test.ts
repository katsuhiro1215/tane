import { describe, expect, it } from "vitest";

import { getStage } from "@/data/stages/catalog";
import { resultLinks } from "@/lib/result-links";

describe("resultLinks", () => {
  it("★が上がったクリアは、次へ・もどるの両方に育つ演出を付ける", () => {
    expect(resultLinks(getStage("add-3")!, { cleared: true, improved: true, before: 1 })).toEqual({
      nextHref: "/mode/add?stage=add-4&grew=add-3&from=1",
      backHref: "/mode/add?stage=add-3&grew=add-3&from=1",
    });
  });

  it("★が上がらなかったクリアは、演出を付けない", () => {
    expect(resultLinks(getStage("add-3")!, { cleared: true, improved: false, before: 3 })).toEqual({
      nextHref: "/mode/add?stage=add-4",
      backHref: "/mode/add?stage=add-3",
    });
  });

  it("失敗は次へが無く、演出も付けない", () => {
    expect(resultLinks(getStage("sub-2")!, { cleared: false, improved: false, before: 0 })).toEqual({
      backHref: "/mode/sub?stage=sub-2",
    });
  });

  it("ボスをクリアしても次へは無い", () => {
    expect(resultLinks(getStage("flash-6")!, { cleared: true, improved: true, before: 0 }).nextHref).toBeUndefined();
  });
});
