import { describe, expect, it } from "vitest";

import { range } from "@/lib/game/problem-rules";
import {
  COMBO_SPEEDUP_MIN,
  createField,
  fallMsFor,
  MAX_TICK_MS,
  SEED_LANES,
  SPAWN_GAP_MS,
  tapSeed,
  tick,
  type SeedField,
  type SeedFieldConfig,
} from "@/lib/game/seed-field";

const config: SeedFieldConfig = {
  rule: { op: "add", a: range(1, 9), b: range(1, 9) },
  fallMs: 10_000,
  simultaneous: 3,
};

function run(field: SeedField, ms: number, combo = 0, cfg = config) {
  let current = field;
  const landed: number[] = [];
  for (let t = 0; t < ms; t += MAX_TICK_MS) {
    const out = tick(current, MAX_TICK_MS, cfg, combo);
    current = out.field;
    landed.push(...out.landed.map((s) => s.id));
  }
  return { field: current, landed };
}

describe("createField", () => {
  it("最初は種が1個で、レーンは範囲内", () => {
    const field = createField(config);
    expect(field.seeds).toHaveLength(1);
    expect(field.seeds[0].lane).toBeGreaterThanOrEqual(0);
    expect(field.seeds[0].lane).toBeLessThan(SEED_LANES);
    expect(field.seeds[0].progress).toBe(0);
  });
});

describe("fallMsFor", () => {
  it("コンボ0はそのまま、コンボが続くと短くなり、下限は70%", () => {
    expect(fallMsFor(config, 0)).toBe(10_000);
    expect(fallMsFor(config, 10)).toBeCloseTo(8_500);
    expect(fallMsFor(config, 20)).toBeCloseTo(10_000 * COMBO_SPEEDUP_MIN);
    expect(fallMsFor(config, 100)).toBeCloseTo(10_000 * COMBO_SPEEDUP_MIN);
  });
});

describe("tick", () => {
  it("progress が dt / fallMs ずつ進み、ageMs が増える", () => {
    const field = createField(config);
    const out = tick(field, 100, config, 0).field;
    expect(out.seeds[0].progress).toBeCloseTo(0.01);
    expect(out.seeds[0].ageMs).toBe(100);
  });

  it("地面に着いた種は landed に出て、取り除かれる", () => {
    const field = createField(config);
    const firstId = field.seeds[0].id;
    const { field: after, landed } = run(field, 10_200);
    expect(landed).toContain(firstId);
    expect(after.seeds.find((s) => s.id === firstId)).toBeUndefined();
  });

  it("dt が大きくても進みは MAX_TICK_MS 分だけ（タブ復帰で全滅しない）", () => {
    const field = createField(config);
    const out = tick(field, 5_000, config, 0);
    expect(out.field.seeds[0].progress).toBeCloseTo(MAX_TICK_MS / 10_000);
    expect(out.landed).toHaveLength(0);
  });

  it("同時数を超えず、間隔が空くまで次を出さず、レーンが重ならない", () => {
    let field = createField(config);
    let sawThree = false;
    for (let t = 0; t < 4_000; t += MAX_TICK_MS) {
      field = tick(field, MAX_TICK_MS, config, 0).field;
      expect(field.seeds.length).toBeLessThanOrEqual(3);
      const lanes = field.seeds.map((s) => s.lane);
      expect(new Set(lanes).size).toBe(lanes.length);
      if (field.seeds.length === 3) sawThree = true;
    }
    expect(sawThree).toBe(true);
    const early = tick(createField(config), MAX_TICK_MS, config, 0).field;
    expect(early.seeds).toHaveLength(1);
    expect(SPAWN_GAP_MS).toBeGreaterThan(MAX_TICK_MS);
  });

  it("300回回しても、画面上の種の答えは重ならない", () => {
    let field = createField(config);
    const dup: string[] = [];
    for (let i = 0; i < 300; i++) {
      field = tick(field, MAX_TICK_MS, config, 0).field;
      // 飛ばさず落とす代わりに、ときどき正解して入れ替える
      if (i % 7 === 0 && field.seeds[0]) field = tapSeed(field, field.seeds[0].id, field.seeds[0].problem.answer).field;
      const answers = field.seeds.map((s) => s.problem.answer);
      if (new Set(answers).size !== answers.length) dup.push(answers.join(","));
    }
    expect(dup).toEqual([]);
  });
});

describe("tapSeed", () => {
  it("合えば correct で取り除かれ、違えば wrong で残り、無い id は none", () => {
    const field = createField(config);
    const seed = field.seeds[0];
    const wrong = tapSeed(field, seed.id, seed.problem.answer + 1);
    expect(wrong.result).toBe("wrong");
    expect(wrong.field.seeds).toHaveLength(1);
    const none = tapSeed(field, 999, 1);
    expect(none.result).toBe("none");
    const ok = tapSeed(field, seed.id, seed.problem.answer);
    expect(ok.result).toBe("correct");
    expect(ok.seed?.id).toBe(seed.id);
    expect(ok.field.seeds.find((s) => s.id === seed.id)).toBeUndefined();
  });
});
