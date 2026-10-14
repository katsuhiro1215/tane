import { getStage, MODES, type ArithmeticStage } from "@/data/stages/catalog";
import { generateProblem, type ArithmeticRule, type Operator, type Problem } from "@/lib/game/problem-rules";

// 数値はすべて初期値。遊んでみて調整する（設計書2.1〜2.4）
export const CHALLENGE_MS = 60_000;
export const MAX_LEVEL = 12;
export const STREAK_TO_LEVEL_UP = 2;
export const LEVEL_POINTS = 20;
export const WARNING_MS = 10_000;

export type ChallengeModeId = Operator | "mix";
export const CHALLENGE_MODE_IDS: readonly ChallengeModeId[] = ["add", "sub", "mul", "div", "mix"];
const OPERATORS: readonly Operator[] = ["add", "sub", "mul", "div"];

export const CHALLENGE_LABELS: Record<ChallengeModeId, string> = {
  add: MODES.add.label,
  sub: MODES.sub.label,
  mul: MODES.mul.label,
  div: MODES.div.label,
  mix: "まぜまぜ",
};

export function isChallengeModeId(value: string): value is ChallengeModeId {
  return (CHALLENGE_MODE_IDS as readonly string[]).includes(value);
}

function stageAt(op: Operator, level: number): ArithmeticStage {
  const stage = getStage(`${op}-${level}`);
  if (stage?.kind !== "arithmetic") throw new Error(`no arithmetic stage: ${op}-${level}`);
  return stage;
}

export function levelRule(mode: ChallengeModeId, level: number): ArithmeticRule {
  if (mode !== "mix") return stageAt(mode, level).rule;
  return { op: "mix", rules: OPERATORS.map((op) => stageAt(op, level).rule) };
}

export function secondsFor(mode: ChallengeModeId, level: number, problem: Problem): number {
  return stageAt(mode === "mix" ? problem.operator : mode, level).secondsPerProblem;
}

export function levelPoints(level: number): number {
  return (level - 1) * LEVEL_POINTS;
}

const RETRIES = 5;

function sameProblem(a: Problem, b: Problem): boolean {
  return a.operator === b.operator && a.operandA === b.operandA && a.operandB === b.operandB;
}

/** 前と同じ問題が続かないように、何回か作り直す（選べる問題が少ない段もあるので、回数は決めておく） */
export function nextProblem(
  mode: ChallengeModeId,
  level: number,
  previous: Problem | null,
  rng: () => number = Math.random
): Problem {
  const rule = levelRule(mode, level);
  let made = generateProblem(rule, rng);
  for (let i = 0; i < RETRIES && previous && sameProblem(made, previous); i++) made = generateProblem(rule, rng);
  return made;
}

export type Medal = "bronze" | "silver" | "gold";
const MEDALS: readonly Medal[] = ["bronze", "silver", "gold"];
const STANDARD_MEDALS: Record<Medal, number> = { bronze: 1500, silver: 3000, gold: 4500 };

export const MEDAL_SCORES: Record<ChallengeModeId, Record<Medal, number>> = {
  add: STANDARD_MEDALS,
  sub: STANDARD_MEDALS,
  mul: STANDARD_MEDALS,
  // 1問に時間がかかるので低め
  div: { bronze: 1000, silver: 2000, gold: 3500 },
  mix: STANDARD_MEDALS,
};

export function medalFor(mode: ChallengeModeId, score: number | null): Medal | null {
  if (score === null) return null;
  const table = MEDAL_SCORES[mode];
  return [...MEDALS].reverse().find((medal) => score >= table[medal]) ?? null;
}

export function medalRank(medal: Medal | null): number {
  return medal ? MEDALS.indexOf(medal) + 1 : 0;
}

export function nextMedalGoal(mode: ChallengeModeId, best: number): { medal: Medal; pointsLeft: number } | null {
  const table = MEDAL_SCORES[mode];
  const medal = MEDALS.find((m) => best < table[m]);
  return medal ? { medal, pointsLeft: table[medal] - best } : null;
}

export function remainingMs(elapsedMs: number): number {
  return Math.max(0, CHALLENGE_MS - elapsedMs);
}

export function isTimeUp(elapsedMs: number): boolean {
  return elapsedMs >= CHALLENGE_MS;
}
