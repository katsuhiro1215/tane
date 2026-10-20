import { describe, expect, it } from "vitest";

import {
  getStage,
  isModeId,
  MODE_IDS,
  nextStageInMode,
  playPath,
  problemCount,
  SECONDS_PER_PROBLEM,
  STAGES,
  stagesOfMode,
  targetMs,
  type Stage,
} from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";
import { generateFlashProblem } from "@/lib/game/flash-problem";
import { generateProblems, MAX_ANSWER, satisfiesRule } from "@/lib/game/problem-rules";

const N = 2000;
const arithmetic = STAGES.filter((s): s is Extract<Stage, { kind: "arithmetic" }> => s.kind === "arithmetic");

describe("ステージの数とid", () => {
  it("全部で80、あそびごとに12・12・12・12・6・26", () => {
    expect(STAGES).toHaveLength(80);
    expect(MODE_IDS.map((mode) => stagesOfMode(mode).length)).toEqual([12, 12, 12, 12, 6, 26]);
  });

  it("idは `<あそび>-<番号>` で重複しない", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STAGES) expect(s.id).toBe(s.mode === "soroban" ? `soroban-${s.number}` : `${s.mode}-${s.number}`);
  });

  it("各あそびの最後だけがボス（そろばんは各級のもぎけんてい）", () => {
    for (const mode of MODE_IDS.filter((m) => m !== "soroban")) {
      const list = stagesOfMode(mode);
      expect(list.map((s) => s.isBoss)).toEqual(list.map((_, i) => i === list.length - 1));
    }
  });

  it("すべてのステージに11色のどれかが付いている", () => {
    for (const s of STAGES) expect(SPRU_COLORS).toContain(s.color);
  });

  it("kind は、フラッシュが flash、そろばんが soroban、ほかが arithmetic", () => {
    for (const s of STAGES) {
      expect(s.kind).toBe(s.mode === "flash" ? "flash" : s.mode === "soroban" ? "soroban" : "arithmetic");
    }
  });
});

describe("そろばんのステージ（設計書2.2）", () => {
  const soroban = stagesOfMode("soroban");

  it("10級→4級、級の中は みとり・かけ・（わり）・もぎ", () => {
    const keys = soroban.map((s) => (s.kind === "soroban" ? `${s.grade}${s.event}` : "?"));
    expect(keys).toEqual([
      "10mitori", "10kake", "10mogi",
      "9mitori", "9kake", "9mogi",
      "8mitori", "8kake", "8wari", "8mogi",
      "7mitori", "7kake", "7wari", "7mogi",
      "6mitori", "6kake", "6wari", "6mogi",
      "5mitori", "5kake", "5wari", "5mogi",
      "4mitori", "4kake", "4wari", "4mogi",
    ]);
  });

  it("名前・説明・ボス", () => {
    expect(getStage("soroban-15")).toMatchObject({ grade: 6, event: "mitori", name: "6きゅう みとりざん", description: "3けた・10口" });
    expect(getStage("soroban-16")).toMatchObject({ name: "6きゅう かけざん", description: "あわせて 5けた" });
    expect(getStage("soroban-3")).toMatchObject({ name: "10きゅう もぎけんてい", description: "みとり・かけ", isBoss: true });
    expect(getStage("soroban-18")).toMatchObject({ description: "みとり・かけ・わり", isBoss: true });
    expect(getStage("soroban-15")?.isBoss).toBe(false);
  });

  it("問題数と目標タイム", () => {
    expect(problemCount(getStage("soroban-15")!)).toBe(10);
    expect(problemCount(getStage("add-1")!)).toBe(20);
    expect(targetMs(getStage("soroban-15")!)).toBe(180_000);
    expect(targetMs(getStage("add-1")!)).toBe(80_000);
  });

  it("プレイのURLは /soroban/<id>", () => {
    expect(playPath(getStage("soroban-1")!)).toBe("/soroban/soroban-1");
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

describe("目安の秒数と目標タイム（設計書2.5）", () => {
  it("あそびごとの秒数が設計書の表どおり", () => {
    expect(SECONDS_PER_PROBLEM).toEqual({
      add: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
      sub: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
      mul: [4, 4, 4, 4, 4, 4, 5, 7, 7, 10, 12, 9],
      div: [5, 5, 5, 5, 5, 6, 8, 10, 12, 9, 14, 10],
      flash: [5, 5, 5, 6, 5, 8],
      soroban: [],
    });
  });

  it("すべてのステージに秒数があり、目標タイムは 秒数×20問", () => {
    for (const s of STAGES) expect(s.secondsPerProblem).toBeGreaterThan(0);
    expect(targetMs(getStage("add-1")!)).toBe(80_000);
    expect(targetMs(getStage("div-11")!)).toBe(280_000);
  });
});
