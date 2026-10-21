import { describe, expect, it } from "vitest";

import {
  displayNumber,
  getStage,
  isModeId,
  maxStars,
  MODE_IDS,
  nextStageInMode,
  playPath,
  problemCount,
  SECONDS_PER_PROBLEM,
  STAGES,
  stageTargetMs,
  stagesOfMode,
  targetMs,
  unlockStars,
  type Stage,
} from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";
import { generateFlashProblem } from "@/lib/game/flash-problem";
import { generateProblems, MAX_ANSWER, satisfiesRule } from "@/lib/game/problem-rules";
import { generateDivModProblem } from "@/lib/game/remainder-division";

const N = 2000;
const arithmetic = STAGES.filter((s): s is Extract<Stage, { kind: "arithmetic" }> => s.kind === "arithmetic");

describe("ステージの数とid", () => {
  it("全部で164、あそびごとに12・12・12・12・6・26・84", () => {
    expect(STAGES).toHaveLength(164);
    expect(MODE_IDS.map((mode) => stagesOfMode(mode).length)).toEqual([12, 12, 12, 12, 6, 26, 84]);
  });

  it("idは `<あそび>-<番号>` で重複しない", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STAGES) expect(s.id).toBe(s.mode === "soroban" ? `soroban-${s.number}` : `${s.mode}-${s.number}`);
  });

  it("各あそびの最後だけがボス（そろばんは各級のもぎけんてい）", () => {
    for (const mode of MODE_IDS.filter((m) => m !== "soroban" && m !== "shisoku")) {
      const list = stagesOfMode(mode);
      expect(list.map((s) => s.isBoss)).toEqual(list.map((_, i) => i === list.length - 1));
    }
  });

  it("すべてのステージに11色のどれかが付いている", () => {
    for (const s of STAGES) expect(SPRU_COLORS).toContain(s.color);
  });

  it("kind は、フラッシュが flash、そろばんが soroban、しそくえんざんが seed、ほかが arithmetic", () => {
    for (const s of STAGES) {
      expect(s.kind).toBe(
        s.mode === "flash" ? "flash" : s.mode === "soroban" ? "soroban" : s.mode === "shisoku" ? "seed" : "arithmetic"
      );
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

  it("時間があるのは、もぎけんていだけ（ほかのステージは時間なしで、ミスなしなら★3）", () => {
    for (const s of soroban) {
      expect(stageTargetMs(s) === null).toBe(s.kind === "soroban" && s.event !== "mogi");
    }
    expect(stageTargetMs(getStage("soroban-18")!)).toBe(targetMs(getStage("soroban-18")!));
    expect(stageTargetMs(getStage("soroban-15")!)).toBeNull();
    expect(stageTargetMs(getStage("add-1")!)).toBe(80_000);
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
      shisoku: [],
    });
  });

  it("すべてのステージに秒数があり、目標タイムは 秒数×20問", () => {
    for (const s of STAGES) expect(s.secondsPerProblem).toBeGreaterThan(0);
    expect(targetMs(getStage("add-1")!)).toBe(80_000);
    expect(targetMs(getStage("div-11")!)).toBe(280_000);
  });
});

describe("しそくえんざん（種が降る）", () => {
  const list = stagesOfMode("shisoku");

  it("84ステージで、idは shisoku-1〜84、遊ぶ場所は /seed/", () => {
    expect(list.map((s) => s.id)).toEqual(Array.from({ length: 84 }, (_, i) => `shisoku-${i + 1}`));
    expect(playPath(list[0])).toBe("/seed/shisoku-1");
    expect(list.every((s) => s.kind === "seed" && !s.isBoss)).toBe(true);
  });

  it("★の最大は5、ロック解除は★3。既存のステージは最大3・解除は★1", () => {
    expect(list.every((s) => maxStars(s) === 5)).toBe(true);
    expect(list.every((s) => unlockStars(s) === 3)).toBe(true);
    expect(maxStars(getStage("add-1")!)).toBe(3);
    expect(unlockStars(getStage("add-1")!)).toBe(1);
  });

  it("表示の番号は 1-1〜1-4、2-1〜2-4…9-1〜9-4。ほかは番号のまま", () => {
    expect(list.slice(0, 20).map((s) => displayNumber(s))).toEqual(["1-1", "1-2", "1-3", "1-4", "2-1", "2-2", "2-3", "2-4", "3-1", "3-2", "3-3", "3-4",
      "4-1", "4-2", "4-3", "4-4", "5-1", "5-2", "5-3", "5-4"]);
    expect(list.slice(20, 36).map((s) => displayNumber(s))).toEqual([
      "6-1", "6-2", "6-3", "6-4", "7-1", "7-2", "7-3", "7-4", "8-1", "8-2", "8-3", "8-4", "9-1", "9-2", "9-3", "9-4",
    ]);
    expect(list.slice(4, 8).map((s) => s.description)).toEqual(Array(4).fill("ひきざん（きほん）"));
    expect(list.slice(8, 12).map((s) => s.description)).toEqual(Array(4).fill("たしざん・ひきざん ごちゃまぜ"));
    expect(list.slice(20, 24).map((s) => s.description)).toEqual(Array(4).fill("たしざん2けた（ひっさん）"));
    expect(list.slice(24, 28).map((s) => s.description)).toEqual(Array(4).fill("ひきざん2けた（ひっさん）"));
    expect(list.slice(28, 32).map((s) => s.description)).toEqual(Array(4).fill("たしひき2けた ごちゃまぜ"));
    expect(list.slice(32, 36).map((s) => s.description)).toEqual(Array(4).fill("たしひき2けたの むしくい"));
    expect(list.slice(36, 52).map((s) => displayNumber(s))).toEqual([
      "10-1", "10-2", "10-3", "10-4", "11-1", "11-2", "11-3", "11-4",
      "12-1", "12-2", "12-3", "12-4", "13-1", "13-2", "13-3", "13-4",
    ]);
    expect(list.slice(36, 40).map((s) => s.description)).toEqual(Array(4).fill("かけざん くく"));
    expect(list.slice(40, 44).map((s) => s.description)).toEqual(Array(4).fill("かけざん くく ぜんぶ"));
    expect(list.slice(44, 48).map((s) => s.description)).toEqual(Array(4).fill("わりざん くく"));
    expect(list.slice(48, 52).map((s) => s.description)).toEqual(Array(4).fill("わりざん くく ぜんぶ"));
    expect(list.slice(52, 68).map((s) => displayNumber(s))).toEqual([
      "14-1", "14-2", "14-3", "14-4", "15-1", "15-2", "15-3", "15-4",
      "16-1", "16-2", "16-3", "16-4", "17-1", "17-2", "17-3", "17-4",
    ]);
    expect(list.slice(52, 56).map((s) => s.description)).toEqual(Array(4).fill("かけざん・わりざん ごちゃまぜ"));
    expect(list.slice(56, 60).map((s) => s.description)).toEqual(Array(4).fill("かけざん ひっさん"));
    expect(list.slice(60, 64).map((s) => s.description)).toEqual(Array(4).fill("わりざん あまりあり（かんたん）"));
    expect(list.slice(64, 68).map((s) => s.description)).toEqual(Array(4).fill("たしざん・ひきざん3けた"));
    expect(list.slice(68, 84).map((s) => displayNumber(s))).toEqual([
      "18-1", "18-2", "18-3", "18-4", "19-1", "19-2", "19-3", "19-4",
      "20-1", "20-2", "20-3", "20-4", "21-1", "21-2", "21-3", "21-4",
    ]);
    expect(list.slice(68, 72).map((s) => s.description)).toEqual(Array(4).fill("たしひき3けたの むしくい"));
    expect(list.slice(72, 76).map((s) => s.description)).toEqual(Array(4).fill("よんそく ごちゃまぜ（2けた）"));
    expect(list.slice(76, 80).map((s) => s.description)).toEqual(Array(4).fill("かけざん 2けた×2けた"));
    expect(list.slice(80, 84).map((s) => s.description)).toEqual(Array(4).fill("わりざん あまりあり（むずかしい）"));
    expect(displayNumber(getStage("add-3")!)).toBe("3");
  });

  it("G20は4ステージで出し方が変わる（ふつう・筆算・むしくい・まぜこぜ）。同じステージでは混ぜない", () => {
    const [flat, column, blank, mix] = list.slice(76, 80);
    if (flat.kind !== "seed" || column.kind !== "seed" || blank.kind !== "seed" || mix.kind !== "seed") {
      throw new Error("seed stage expected");
    }
    expect(flat.rule.layout).toBeUndefined();
    expect(flat.rule.blank).toBeUndefined();
    expect(column.rule.layout).toBe("column");
    expect(blank.rule.blank).toBe(true);
    expect(blank.rule.single).toBe(true);
    expect(mix.rule.rule.op).toBe("mix");
  });

  it("G21（あまりあり・むずかしい）も pair モード", () => {
    for (const stage of list.slice(80, 84)) {
      if (stage.kind !== "seed" || !stage.rule.pair) throw new Error("pair stage expected");
      const p = generateDivModProblem(stage.rule.pair);
      expect(p.remainder).toBeGreaterThanOrEqual(1);
      expect(p.remainder).toBeLessThan(p.b);
    }
  });

  it("G15（かけざん ひっさん）は column", () => {
    for (const stage of list.slice(56, 60)) {
      if (stage.kind !== "seed") throw new Error("seed stage expected");
      expect(stage.rule.layout).toBe("column");
    }
  });

  it("G16（あまりあり・かんたん）は pair モード。商とあまりが解ける", () => {
    for (const stage of list.slice(60, 64)) {
      if (stage.kind !== "seed" || !stage.rule.pair) throw new Error("pair stage expected");
      for (let i = 0; i < 30; i++) {
        const p = generateDivModProblem(stage.rule.pair);
        expect(p.remainder).toBeGreaterThanOrEqual(1);
        expect(p.remainder).toBeLessThan(p.b);
        expect(p.a).toBe(p.b * p.quotient + p.remainder);
      }
    }
  });

  it("G11の4つ目、G13の3つ目は mix。G13の4つ目はむしくい", () => {
    const g11_4 = list[43];
    const g13_3 = list[50];
    const g13_4 = list[51];
    if (g11_4.kind !== "seed" || g13_3.kind !== "seed" || g13_4.kind !== "seed") throw new Error("seed stage expected");
    expect(g11_4.rule.rule.op).toBe("mix");
    expect(g11_4.rule.simultaneous).toBe(3);
    expect(g13_3.rule.rule.op).toBe("mix");
    expect(g13_3.rule.simultaneous).toBe(3);
    expect(g13_4.rule.blank).toBe(true);
    expect(g13_4.rule.single).toBe(true);
  });

  it("筆算（column）のステージには display 付きの問題が作れる", () => {
    for (const stage of list.slice(20, 28)) {
      if (stage.kind !== "seed") throw new Error("seed stage expected");
      expect(stage.rule.layout).toBe("column");
    }
  });

  it("むしくいは、降らずに1問ずつ・2分。あまりのあるわり算は別の画面なので対象外。ふつうのグループは降る・1分", () => {
    for (const stage of list) {
      if (stage.kind !== "seed") throw new Error("seed stage expected");
      if (stage.rule.pair) continue;
      const blank = stage.rule.blank === true;
      expect(stage.rule.single === true).toBe(blank);
      expect(stage.rule.roundMs ?? 60_000).toBe(blank ? 120_000 : 60_000);
    }
  });

  it("どのルールも50問ずつ作れて、答えは0〜MAX_ANSWER", () => {
    for (const stage of list) {
      if (stage.kind !== "seed") throw new Error("seed stage expected");
      // あまりのあるわり算（pair）は別の生成器（generateDivModProblem）を使うので対象外
      if (stage.rule.pair) continue;
      for (const problem of generateProblems(stage.rule.rule, 50)) {
        expect(problem.answer).toBeGreaterThanOrEqual(0);
        // 3けた×1けたなどの筆算（G15）は、答えが999を超える。実際の上限は problem-rules.ts の MAX_ANSWER
        expect(problem.answer).toBeLessThanOrEqual(MAX_ANSWER);
        expect(satisfiesRule(problem, stage.rule.rule)).toBe(true);
      }
    }
  });

  it("目標の正解数は★1〜★5で増えていく", () => {
    for (const stage of list) {
      if (stage.kind !== "seed") throw new Error("seed stage expected");
      const t = stage.rule.thresholds;
      expect([...t].sort((a, b) => a - b)).toEqual([...t]);
      expect(new Set(t).size).toBe(5);
    }
  });
});
