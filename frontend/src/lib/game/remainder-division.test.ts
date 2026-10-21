import { describe, expect, it } from "vitest";

import { range } from "@/lib/game/problem-rules";
import { INITIAL_HP } from "@/lib/game/hp";
import {
  answerDivMod,
  createDivModRun,
  generateDivModProblem,
  stepDivModRun,
  type DivModRule,
} from "@/lib/game/remainder-division";

const rule: DivModRule = { divisor: range(2, 9), quotient: range(2, 9) };
const MAX_TICK_MS = 100;

describe("generateDivModProblem", () => {
  it("あまりは1以上、わる数未満。a = わる数×しょう + あまり", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateDivModProblem(rule);
      expect(p.remainder).toBeGreaterThanOrEqual(1);
      expect(p.remainder).toBeLessThan(p.b);
      expect(p.a).toBe(p.b * p.quotient + p.remainder);
    }
  });

  it("避ける組（直前の a,b）を極力避ける。避けられないルールでも止まらない", () => {
    const only: DivModRule = { divisor: range(2, 2), quotient: range(2, 2) };
    // 2÷2 は 商2 あまり0 にはできない(あまりは1以上必要、b=2なのであまりは1のみ) -> a=2*2+1=5 固定
    const p = generateDivModProblem(only, { a: 999, b: 999 });
    expect(p.a).toBe(5);
    expect(p.b).toBe(2);
  });
});

describe("createDivModRun / stepDivModRun", () => {
  it("dtMs が大きくても playedMs は MAX_TICK_MS 分しか進まない", () => {
    const run = createDivModRun(rule, "minute");
    const next = stepDivModRun(run, 5000, 60_000);
    expect(next.playedMs).toBe(MAX_TICK_MS);
    expect(next.status).toBe("playing");
  });

  it("minute モードは playedMs が roundMs に達すると timeup。endless は時間で終わらない", () => {
    let run = createDivModRun(rule, "minute");
    for (let t = 0; t < 60_000 - MAX_TICK_MS; t += MAX_TICK_MS) run = stepDivModRun(run, MAX_TICK_MS, 60_000);
    expect(run.status).toBe("playing");
    run = stepDivModRun(run, MAX_TICK_MS, 60_000);
    expect(run.status).toBe("timeup");

    let endless = createDivModRun(rule, "endless");
    for (let t = 0; t < 70_000; t += MAX_TICK_MS) endless = stepDivModRun(endless, MAX_TICK_MS, 60_000);
    expect(endless.status).toBe("playing");
  });

  it("終わった run に stepDivModRun しても変わらない", () => {
    const run = createDivModRun(rule, "minute");
    const ended = { ...run, status: "timeup" as const };
    expect(stepDivModRun(ended, MAX_TICK_MS, 60_000)).toEqual(ended);
  });
});

describe("answerDivMod", () => {
  it("商とあまり、両方合えば正解。コンボが増え、次の問題に進む", () => {
    const run = createDivModRun(rule, "minute");
    const p = run.problem;
    const out = answerDivMod(run, p.quotient, p.remainder, rule);
    expect(out.correct).toBe(true);
    expect(out.run.correct).toBe(1);
    expect(out.run.combo).toBe(1);
    expect(out.run.maxCombo).toBe(1);
    expect(out.run.hp).toBe(INITIAL_HP);
  });

  it("片方だけ合っていても不正解。HPが減り、コンボが0になる", () => {
    const run = createDivModRun(rule, "minute");
    const p = run.problem;
    const out = answerDivMod(run, p.quotient, p.remainder + 1, rule);
    expect(out.correct).toBe(false);
    expect(out.run.mistakes).toBe(1);
    expect(out.run.combo).toBe(0);
    expect(out.run.hp).toBe(INITIAL_HP - 1);
  });

  it("HPが0でdefeated。それ以降 answerDivMod しても変わらない", () => {
    let run = createDivModRun(rule, "minute");
    for (let i = 0; i < INITIAL_HP; i++) {
      const p = run.problem;
      run = answerDivMod(run, p.quotient + 1, p.remainder, rule).run;
    }
    expect(run.status).toBe("defeated");
    expect(run.hp).toBe(0);
    const before = run;
    const after = answerDivMod(run, 1, 1, rule).run;
    expect(after).toEqual(before);
  });

  it("不正解でも（defeatedでなければ）次の問題が出て、直前と同じ a,b が続けて出ない", () => {
    let run = createDivModRun(rule, "minute");
    let bad = 0;
    for (let i = 0; i < 50 && run.status === "playing"; i++) {
      const before = run.problem;
      run = answerDivMod(run, before.quotient + 1, before.remainder, rule).run;
      if (run.status === "playing" && run.problem.a === before.a && run.problem.b === before.b) bad++;
    }
    expect(bad).toBe(0);
  });
});
