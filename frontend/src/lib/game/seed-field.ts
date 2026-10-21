import type { ArithmeticRule } from "@/lib/game/problem-rules";
import { drawBlankSeedProblem, drawSeedProblem, type SeedProblem } from "@/lib/game/seed-problems";

// 数値はすべて初期値。遊んでみて調整する（設計書 4.3）
export const MAX_TICK_MS = 100;
export const SPAWN_GAP_MS = 1200;
export const SEED_LANES = 3;
export const COMBO_SPEEDUP_PER = 0.015;
export const COMBO_SPEEDUP_MIN = 0.7;

export interface SeedFieldConfig {
  rule: ArithmeticRule;
  fallMs: number;
  simultaneous: 2 | 3;
  /** 1問ずつ出す。降らず、時間では失敗にならない（虫食いなど、考える問題用） */
  single?: boolean;
  /** 虫食いの問題にする */
  blank?: boolean;
  /** 1回の制限時間（1分モード）。省略は60秒 */
  roundMs?: number;
}

export interface Seed {
  id: number;
  lane: number;
  problem: SeedProblem;
  ageMs: number;
  /** 0 が上、1 が地面 */
  progress: number;
}

export interface SeedField {
  seeds: Seed[];
  nextId: number;
  sinceSpawnMs: number;
  /** 最後に画面から消えた問題の式。次に同じ問題を続けて出さない */
  previousText?: string;
}

type Rng = () => number;

function spawn(field: SeedField, config: SeedFieldConfig, rng: Rng): SeedField {
  const taken = new Set(field.seeds.map((seed) => seed.lane));
  const free = Array.from({ length: SEED_LANES }, (_, lane) => lane).filter((lane) => !taken.has(lane));
  if (free.length === 0) return field;
  const lane = free[Math.floor(rng() * free.length)];
  const draw = config.blank ? drawBlankSeedProblem : drawSeedProblem;
  const problem = draw(
    config.rule,
    {
      answers: field.seeds.map((s) => s.problem.answer),
      texts: [...field.seeds.map((s) => s.problem.text), ...(field.previousText ? [field.previousText] : [])],
    },
    rng
  );
  const seed: Seed = { id: field.nextId, lane, problem, ageMs: 0, progress: 0 };
  return { ...field, seeds: [...field.seeds, seed], nextId: field.nextId + 1, sinceSpawnMs: 0 };
}

export function createField(config: SeedFieldConfig, rng: Rng = Math.random): SeedField {
  return spawn({ seeds: [], nextId: 1, sinceSpawnMs: 0 }, config, rng);
}

/** 種が降りきるまでの時間。コンボが続くと短くなる（下限は70%） */
export function fallMsFor(config: SeedFieldConfig, combo: number): number {
  return config.fallMs * Math.max(COMBO_SPEEDUP_MIN, 1 - COMBO_SPEEDUP_PER * combo);
}

/** dtMs は MAX_TICK_MS に切る。タブを離れて戻っても、種が一気に落ちない */
export function tick(
  field: SeedField,
  dtMs: number,
  config: SeedFieldConfig,
  combo: number,
  rng: Rng = Math.random
): { field: SeedField; landed: Seed[] } {
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  const fall = fallMsFor(config, combo);
  // single のときは降らない（progress は0のまま）。経過時間だけ数える
  const moved = field.seeds.map((seed) => ({
    ...seed,
    ageMs: seed.ageMs + dt,
    progress: config.single ? 0 : seed.progress + dt / fall,
  }));
  const landed = moved.filter((seed) => seed.progress >= 1);
  let next: SeedField = {
    seeds: moved.filter((seed) => seed.progress < 1),
    nextId: field.nextId,
    sinceSpawnMs: field.sinceSpawnMs + dt,
    previousText: landed.length > 0 ? landed[landed.length - 1].problem.text : field.previousText,
  };
  // 画面が空になったら待たずに出す。そうでなければ間隔が空いてから
  const due = next.seeds.length === 0 || next.sinceSpawnMs >= SPAWN_GAP_MS;
  const wanted = config.single ? 1 : config.simultaneous;
  if (next.seeds.length < wanted && due) next = spawn(next, config, rng);
  return { field: next, landed };
}

export function tapSeed(
  field: SeedField,
  seedId: number,
  input: number
): { field: SeedField; result: "correct" | "wrong" | "none"; seed?: Seed } {
  const seed = field.seeds.find((s) => s.id === seedId);
  if (!seed) return { field, result: "none" };
  if (seed.problem.answer !== input) return { field, result: "wrong", seed };
  return {
    field: { ...field, seeds: field.seeds.filter((s) => s.id !== seedId), previousText: seed.problem.text },
    result: "correct",
    seed,
  };
}
