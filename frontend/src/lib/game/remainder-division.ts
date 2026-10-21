import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";
import { pickNumber, type NumberPick } from "@/lib/game/problem-rules";

/** あまりのあるわり算のルール。divisor（わる数）・quotient（しょう） */
export interface DivModRule {
  divisor: NumberPick;
  quotient: NumberPick;
}

/** a = b（わる数）× quotient（しょう）+ remainder（あまり）。remainder は1以上、b未満 */
export interface DivModProblem {
  a: number;
  b: number;
  quotient: number;
  remainder: number;
}

const MAX_REDRAWS = 20;
const MAX_TICK_MS = 100;

export function generateDivModProblem(
  rule: DivModRule,
  avoid: { a: number; b: number } | null = null,
  rng: () => number = Math.random
): DivModProblem {
  let drawn = drawOne(rule, rng);
  for (let i = 0; i < MAX_REDRAWS; i++) {
    if (!avoid || drawn.a !== avoid.a || drawn.b !== avoid.b) return drawn;
    drawn = drawOne(rule, rng);
  }
  return drawn;
}

function drawOne(rule: DivModRule, rng: () => number): DivModProblem {
  const b = pickNumber(rule.divisor, rng);
  const quotient = pickNumber(rule.quotient, rng);
  // あまりは 1〜(b-1)。b=2 のときは必ず 1
  const remainder = b <= 1 ? 0 : Math.floor(rng() * (b - 1)) + 1;
  return { a: b * quotient + remainder, b, quotient, remainder };
}

export type DivModMode = "minute" | "endless";
export type DivModStatus = "playing" | "timeup" | "defeated";

export interface DivModRun {
  mode: DivModMode;
  status: DivModStatus;
  problem: DivModProblem;
  hp: number;
  correct: number;
  mistakes: number;
  combo: number;
  maxCombo: number;
  playedMs: number;
}

export function createDivModRun(rule: DivModRule, mode: DivModMode, rng: () => number = Math.random): DivModRun {
  return {
    mode,
    status: "playing",
    problem: generateDivModProblem(rule, null, rng),
    hp: INITIAL_HP,
    correct: 0,
    mistakes: 0,
    combo: 0,
    maxCombo: 0,
    playedMs: 0,
  };
}

/** dtMs は MAX_TICK_MS に切る。minute モードは playedMs が roundMs に達したら timeup */
export function stepDivModRun(run: DivModRun, dtMs: number, roundMs: number): DivModRun {
  if (run.status !== "playing") return run;
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  const playedMs = run.playedMs + dt;
  if (run.mode === "minute" && playedMs >= roundMs) return { ...run, playedMs, status: "timeup" };
  return { ...run, playedMs };
}

/** 商とあまり、両方合っていれば正解。間違えても（HPが0にならなければ）次の問題へ進む */
export function answerDivMod(
  run: DivModRun,
  quotientInput: number,
  remainderInput: number,
  rule: DivModRule,
  rng: () => number = Math.random
): { run: DivModRun; correct: boolean } {
  if (run.status !== "playing") return { run, correct: false };
  const correct = quotientInput === run.problem.quotient && remainderInput === run.problem.remainder;
  if (correct) {
    const combo = run.combo + 1;
    const nextProblem = generateDivModProblem(rule, { a: run.problem.a, b: run.problem.b }, rng);
    return {
      run: { ...run, problem: nextProblem, correct: run.correct + 1, combo, maxCombo: Math.max(run.maxCombo, combo) },
      correct: true,
    };
  }
  const hp = applyDamage(run.hp);
  if (isDefeated(hp)) {
    return { run: { ...run, hp, mistakes: run.mistakes + 1, combo: 0, status: "defeated" }, correct: false };
  }
  const nextProblem = generateDivModProblem(rule, { a: run.problem.a, b: run.problem.b }, rng);
  return { run: { ...run, problem: nextProblem, hp, mistakes: run.mistakes + 1, combo: 0 }, correct: false };
}
