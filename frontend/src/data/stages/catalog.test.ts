import { describe, expect, it } from "vitest";

import {
  getStage,
  isModeId,
  MODE_IDS,
  nextStageInMode,
  playPath,
  STAGES,
  stagesOfMode,
  type Stage,
} from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";
import { generateFlashProblem } from "@/lib/game/flash-problem";
import { generateProblems, MAX_ANSWER, satisfiesRule } from "@/lib/game/problem-rules";

const N = 2000;
const arithmetic = STAGES.filter((s): s is Extract<Stage, { kind: "arithmetic" }> => s.kind === "arithmetic");

describe("ステージの数とid", () => {
  it("全部で54、あそびごとに12・12・12・12・6", () => {
    expect(STAGES).toHaveLength(54);
    expect(MODE_IDS.map((mode) => stagesOfMode(mode).length)).toEqual([12, 12, 12, 12, 6]);
  });

  it("idは `<あそび>-<番号>` で重複しない", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STAGES) expect(s.id).toBe(`${s.mode}-${s.number}`);
  });

  it("各あそびの最後だけがボス", () => {
    for (const mode of MODE_IDS) {
      const list = stagesOfMode(mode);
      expect(list.map((s) => s.isBoss)).toEqual(list.map((_, i) => i === list.length - 1));
    }
  });

  it("すべてのステージに11色のどれかが付いている", () => {
    for (const s of STAGES) expect(SPRU_COLORS).toContain(s.color);
  });

  it("フラッシュだけが kind: flash", () => {
    for (const s of STAGES) expect(s.kind).toBe(s.mode === "flash" ? "flash" : "arithmetic");
  });
});

describe("四則演算の全ステージ", () => {
  it.each(arithmetic.map((s) => [s.id, s] as const))("%s は条件どおりの問題を作る", (_, stage) => {
    for (const p of generateProblems(stage.rule, N)) {
      expect(satisfiesRule(p, stage.rule)).toBe(true);
      expect(p.operator).toBe(stage.mode);
      expect(p.answer).toBeGreaterThanOrEqual(0);
      expect(p.answer).toBeLessThanOrEqual(MAX_ANSWER);
      expect(Number.isInteger(p.answer)).toBe(true);
    }
  });

  it("設計書3.2の代表的な条件（たしざん3・ひきざん10・かけざん1・わりざん6）", () => {
    for (const p of generateProblems((getStage("add-3") as Extract<Stage, { kind: "arithmetic" }>).rule, N)) {
      expect(p.answer).toBeGreaterThanOrEqual(11);
    }
    for (const p of generateProblems((getStage("sub-10") as Extract<Stage, { kind: "arithmetic" }>).rule, N)) {
      expect(p.operandA).toBe(100);
    }
    for (const p of generateProblems((getStage("mul-1") as Extract<Stage, { kind: "arithmetic" }>).rule, N)) {
      expect([2, 5]).toContain(p.operandA);
    }
    for (const p of generateProblems((getStage("div-6") as Extract<Stage, { kind: "arithmetic" }>).rule, N)) {
      expect(p.operandA % 10).toBe(0);
      expect(p.operandA).toBeLessThanOrEqual(90);
    }
  });
});

describe("フラッシュの全ステージ", () => {
  it("数の個数・けたが設計書どおり", () => {
    const flash = stagesOfMode("flash");
    expect(flash.map((s) => (s.kind === "flash" ? [s.rule.count, s.rule.digits] : null))).toEqual([
      [3, 1], [4, 1], [5, 1], [7, 1], [5, 1], [3, 2],
    ]);
    for (const s of flash) {
      if (s.kind !== "flash") throw new Error("flash expected");
      expect(generateFlashProblem(s.rule).sequence).toHaveLength(s.rule.count);
    }
  });
});

describe("検索", () => {
  it("getStage は知らないidで undefined", () => {
    expect(getStage("add-99")).toBeUndefined();
    expect(getStage("add-1")?.name).toBe("こたえが5まで");
  });

  it("nextStageInMode は同じあそびの次、最後は undefined", () => {
    expect(nextStageInMode(getStage("add-1")!)?.id).toBe("add-2");
    expect(nextStageInMode(getStage("add-12")!)).toBeUndefined();
    expect(nextStageInMode(getStage("flash-6")!)).toBeUndefined();
  });

  it("isModeId", () => {
    expect(isModeId("flash")).toBe(true);
    expect(isModeId("challenge")).toBe(false);
  });

  it("playPath はフラッシュだけ /flash", () => {
    expect(playPath(getStage("add-1")!)).toBe("/stage/add-1");
    expect(playPath(getStage("flash-2")!)).toBe("/flash/flash-2");
  });
});
