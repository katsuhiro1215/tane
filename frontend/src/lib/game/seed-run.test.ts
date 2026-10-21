import { describe, expect, it } from "vitest";

import { INITIAL_HP } from "@/lib/game/hp";
import { range } from "@/lib/game/problem-rules";
import { MAX_TICK_MS, type SeedFieldConfig } from "@/lib/game/seed-field";
import { createRun, stepRun, tapRun, type SeedEvent, type SeedRun } from "@/lib/game/seed-run";
import { SEED_ROUND_MS } from "@/lib/game/seed-stars";

const config: SeedFieldConfig = { rule: { op: "add", a: range(1, 9), b: range(1, 9) }, fallMs: 2_000, simultaneous: 2 };

function advance(run: SeedRun, ms: number): { run: SeedRun; events: SeedEvent[] } {
  const events: SeedEvent[] = [];
  let current = run;
  for (let t = 0; t < ms && current.status === "playing"; t += MAX_TICK_MS) {
    const out = stepRun(current, MAX_TICK_MS, config);
    current = out.run;
    events.push(...out.events);
  }
  return { run: current, events };
}

describe("tapRun", () => {
  it("合う種で正解を数え、コンボが続く", () => {
    const run = createRun(config, "minute");
    const seed = run.field.seeds[0];
    const out = tapRun(run, seed.id, seed.problem.answer);
    expect(out.events).toEqual([{ kind: "correct", seed }]);
    expect(out.run).toMatchObject({ correct: 1, combo: 1, maxCombo: 1, mistakes: 0, hp: INITIAL_HP });
  });

  it("違う種は、ミスとHPが減りコンボが切れる。種は残る", () => {
    const run = createRun(config, "minute");
    const seed = run.field.seeds[0];
    const out = tapRun(run, seed.id, seed.problem.answer + 1);
    expect(out.events).toEqual([{ kind: "miss", cause: "wrong" }]);
    expect(out.run).toMatchObject({ mistakes: 1, combo: 0, hp: INITIAL_HP - 1 });
    expect(out.run.field.seeds).toHaveLength(1);
  });

  it("終わったあと・存在しない種は何も起こさない", () => {
    const run = createRun(config, "minute");
    expect(tapRun(run, 999, 1).events).toEqual([]);
    const ended: SeedRun = { ...run, status: "timeup" };
    expect(tapRun(ended, run.field.seeds[0].id, run.field.seeds[0].problem.answer).events).toEqual([]);
  });

  it("最長コンボは切れても残る", () => {
    let run = createRun(config, "endless");
    for (let i = 0; i < 3; i++) {
      const seed = run.field.seeds[0];
      run = tapRun(run, seed.id, seed.problem.answer).run;
      run = stepRun(run, MAX_TICK_MS, config).run;
    }
    const seed = run.field.seeds[0];
    run = tapRun(run, seed.id, seed.problem.answer + 1).run;
    expect(run).toMatchObject({ combo: 0, maxCombo: 3 });
  });
});

describe("stepRun", () => {
  it("放っておくと、着地のたびにミスとHPが減り、HP0で defeated になる。着地ごとのミスはHP分だけ", () => {
    const { run, events } = advance(createRun(config, "endless"), 120_000);
    expect(run.status).toBe("defeated");
    expect(run.hp).toBe(0);
    expect(events.filter((e) => e.kind === "miss")).toHaveLength(INITIAL_HP);
    expect(run.mistakes).toBe(INITIAL_HP);
  });

  it("同じコマで複数の種が着地しても、HPが0になったあとの分は数えない", () => {
    const seeds = [0, 1, 2].map((lane) => ({ id: lane + 1, lane, problem: { text: "1 ＋ 1", answer: 2 + lane }, ageMs: 0, progress: 0.999 }));
    const run: SeedRun = { ...createRun(config, "endless"), hp: 2, field: { seeds, nextId: 4, sinceSpawnMs: 0 } };
    const out = stepRun(run, MAX_TICK_MS, config);
    expect(out.run.status).toBe("defeated");
    expect(out.run.hp).toBe(0);
    expect(out.events.filter((e) => e.kind === "miss")).toHaveLength(2);
    expect(out.run.mistakes).toBe(2);
  });

  it("1分は、足し合わせた時間が60秒になったら timeup。エンドレスは時間で終わらない", () => {
    let run = createRun({ ...config, fallMs: 10 ** 9 }, "minute");
    for (let t = 0; t < SEED_ROUND_MS - MAX_TICK_MS; t += MAX_TICK_MS) run = stepRun(run, MAX_TICK_MS, { ...config, fallMs: 10 ** 9 }).run;
    expect(run.status).toBe("playing");
    run = stepRun(run, MAX_TICK_MS, { ...config, fallMs: 10 ** 9 }).run;
    expect(run.status).toBe("timeup");
    expect(run.playedMs).toBe(SEED_ROUND_MS);

    let endless = createRun({ ...config, fallMs: 10 ** 9 }, "endless");
    for (let t = 0; t < SEED_ROUND_MS + 5_000; t += MAX_TICK_MS) endless = stepRun(endless, MAX_TICK_MS, { ...config, fallMs: 10 ** 9 }).run;
    expect(endless.status).toBe("playing");
  });

  it("タブ復帰の大きな dt でも、時間は MAX_TICK_MS 分しか進まない", () => {
    const out = stepRun(createRun(config, "minute"), 30_000, config);
    expect(out.run.playedMs).toBe(MAX_TICK_MS);
    expect(out.run.status).toBe("playing");
  });

  it("終わった run は進めない", () => {
    const run: SeedRun = { ...createRun(config, "minute"), status: "timeup" };
    expect(stepRun(run, MAX_TICK_MS, config)).toEqual({ run, events: [] });
  });
});

describe("single（1問ずつ）と制限時間", () => {
  const single: SeedFieldConfig = { ...config, single: true, roundMs: 120_000 };

  it("違う答えは、ミスにして次の問題に進む（同じ問題で何度も試せない）", () => {
    const run = createRun(single, "minute");
    const seed = run.field.seeds[0];
    const out = tapRun(run, seed.id, seed.problem.answer + 1);
    expect(out.events).toEqual([{ kind: "miss", cause: "wrong" }]);
    expect(out.run.field.seeds.find((s) => s.id === seed.id)).toBeUndefined();
    expect(stepRun(out.run, MAX_TICK_MS, single).run.field.seeds).toHaveLength(1);
  });

  it("放っておいてもミスにならない。2分で timeup", () => {
    let run = createRun(single, "minute");
    for (let t = 0; t < 119_900; t += MAX_TICK_MS) run = stepRun(run, MAX_TICK_MS, single).run;
    expect(run).toMatchObject({ status: "playing", mistakes: 0, hp: INITIAL_HP });
    run = stepRun(run, MAX_TICK_MS, single).run;
    expect(run.status).toBe("timeup");
  });
});

it("1問ずつのあそびで間違えたら、次は同じ問題を出さない", () => {
  const two: SeedFieldConfig = { rule: { op: "add", a: { oneOf: [1] }, b: { oneOf: [1, 2] } }, fallMs: 7000, simultaneous: 2, single: true, blank: true };
  for (let i = 0; i < 50; i++) {
    let run = createRun(two, "minute");
    const before = run.field.seeds[0];
    run = tapRun(run, before.id, before.problem.answer + 5).run;
    run = stepRun(run, MAX_TICK_MS, two).run;
    expect(run.field.seeds[0].problem.text).not.toBe(before.problem.text);
  }
});
