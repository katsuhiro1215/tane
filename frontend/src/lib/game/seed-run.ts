import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";
import { createField, MAX_TICK_MS, tapSeed, tick, type Seed, type SeedField, type SeedFieldConfig } from "@/lib/game/seed-field";
import { SEED_ROUND_MS } from "@/lib/game/seed-stars";

export type SeedRunMode = "minute" | "endless";
export type SeedRunStatus = "playing" | "timeup" | "defeated";

/** 1回の遊び（1分またはエンドレス）の状態。点数・ゲージ・フィーバーは PlaySession が持つ */
export interface SeedRun {
  mode: SeedRunMode;
  /** 1問ずつ出すあそびか（違う答えを出した問題は、次に進む） */
  single: boolean;
  status: SeedRunStatus;
  field: SeedField;
  hp: number;
  correct: number;
  mistakes: number;
  combo: number;
  maxCombo: number;
  /** 実際に遊んだ時間（足し合わせた dt）。タブを離れていた時間は含まない */
  playedMs: number;
}

export type SeedEvent = { kind: "correct"; seed: Seed } | { kind: "miss"; cause: "landed" | "wrong" };

export function createRun(config: SeedFieldConfig, mode: SeedRunMode, rng: () => number = Math.random): SeedRun {
  return {
    mode,
    single: config.single === true,
    status: "playing",
    field: createField(config, rng),
    hp: INITIAL_HP,
    correct: 0,
    mistakes: 0,
    combo: 0,
    maxCombo: 0,
    playedMs: 0,
  };
}

function miss(run: SeedRun): SeedRun {
  const hp = applyDamage(run.hp);
  return { ...run, hp, mistakes: run.mistakes + 1, combo: 0, status: isDefeated(hp) ? "defeated" : run.status };
}

/** 種を落とす。着地した種はミス。HPが0になったら、同じコマの残りの着地は数えない。HP0と時間切れが同時なら HP0 を優先 */
export function stepRun(
  run: SeedRun,
  dtMs: number,
  config: SeedFieldConfig,
  rng: () => number = Math.random
): { run: SeedRun; events: SeedEvent[] } {
  if (run.status !== "playing") return { run, events: [] };
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  const { field, landed } = tick(run.field, dt, config, run.combo, rng);
  let next: SeedRun = { ...run, field, playedMs: run.playedMs + dt };
  const events: SeedEvent[] = [];
  for (let i = 0; i < landed.length && next.status === "playing"; i++) {
    next = miss(next);
    events.push({ kind: "miss", cause: "landed" });
  }
  if (next.status === "playing" && next.mode === "minute" && next.playedMs >= (config.roundMs ?? SEED_ROUND_MS)) {
    next = { ...next, status: "timeup" };
  }
  return { run: next, events };
}

/** 種をタップ。終わったあと・無い種は何も起こさない */
export function tapRun(run: SeedRun, seedId: number, input: number): { run: SeedRun; events: SeedEvent[] } {
  if (run.status !== "playing") return { run, events: [] };
  const tapped = tapSeed(run.field, seedId, input);
  if (tapped.result === "none" || !tapped.seed) return { run, events: [] };
  if (tapped.result === "wrong") {
    // 1問ずつのあそびは、同じ問題で何度も試せないように、間違えたら次の問題に進む
    const field = run.single ? { ...run.field, seeds: run.field.seeds.filter((s) => s.id !== seedId) } : run.field;
    return { run: miss({ ...run, field }), events: [{ kind: "miss", cause: "wrong" }] };
  }
  const combo = run.combo + 1;
  return {
    run: { ...run, field: tapped.field, correct: run.correct + 1, combo, maxCombo: Math.max(run.maxCombo, combo) },
    events: [{ kind: "correct", seed: tapped.seed }],
  };
}
