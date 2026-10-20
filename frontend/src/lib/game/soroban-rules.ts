// 日珠連の珠算能力検定の表（設計書3.1）。値は初期値で、遊んで合わなければここを直す
export type SorobanEvent = "mitori" | "kake" | "wari";
export type SorobanStageEvent = SorobanEvent | "mogi";

export interface GradeSpec {
  grade: number;
  mitori: { digits: number; count: number; subtract: boolean };
  /** かけざん: 実（かけられる数）と法（かける数）の桁の合計 */
  kakeDigits: number;
  /** わりざん: 法（わる数）と商（答え）の桁の合計。わりざんが無い級は null */
  wariDigits: number | null;
}

export const SOROBAN_GRADES: readonly GradeSpec[] = [
  { grade: 10, mitori: { digits: 2, count: 5, subtract: false }, kakeDigits: 3, wariDigits: null },
  { grade: 9, mitori: { digits: 2, count: 5, subtract: false }, kakeDigits: 3, wariDigits: null },
  { grade: 8, mitori: { digits: 2, count: 8, subtract: true }, kakeDigits: 4, wariDigits: 3 },
  { grade: 7, mitori: { digits: 2, count: 10, subtract: true }, kakeDigits: 4, wariDigits: 4 },
  { grade: 6, mitori: { digits: 3, count: 10, subtract: true }, kakeDigits: 5, wariDigits: 4 },
  { grade: 5, mitori: { digits: 4, count: 10, subtract: true }, kakeDigits: 6, wariDigits: 5 },
  { grade: 4, mitori: { digits: 5, count: 10, subtract: true }, kakeDigits: 7, wariDigits: 6 },
];

export const SOROBAN_PROBLEMS = 10;
export const SOROBAN_MAX_ANSWER_LENGTH = 7;
const SUBTRACT_CHANCE = 1 / 3;
const MITORI_SECONDS_PER_DIGIT = 0.6;
const KAKE_SECONDS_PER_DIGIT = 2;
const WARI_SECONDS_PER_DIGIT = 2.5;

export function gradeSpec(grade: number): GradeSpec {
  const spec = SOROBAN_GRADES.find((g) => g.grade === grade);
  if (!spec) throw new Error(`no soroban grade: ${grade}`);
  return spec;
}

/** terms はひき算の口を負の数で持つ。わりざんは a ÷ b */
export type SorobanProblem =
  | { event: "mitori"; terms: number[]; answer: number }
  | { event: "kake"; a: number; b: number; answer: number }
  | { event: "wari"; a: number; b: number; answer: number };

export interface SorobanRule {
  grade: number;
  event: SorobanStageEvent;
}

type Rng = () => number;

function randomInt(min: number, max: number, rng: Rng): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** その桁ちょうどの数。1けたの法・商は ×1・÷1 を避けて 2〜9 */
function numberOfDigits(d: number, rng: Rng, avoidOne = false): number {
  if (d === 1) return randomInt(avoidOne ? 2 : 1, 9, rng);
  return randomInt(10 ** (d - 1), 10 ** d - 1, rng);
}

function mitoriProblem(grade: number, rng: Rng): SorobanProblem {
  const { digits, count, subtract } = gradeSpec(grade).mitori;
  for (;;) {
    const terms: number[] = [numberOfDigits(digits, rng)];
    let sum = terms[0];
    for (let i = 1; i < count; i++) {
      const value = numberOfDigits(digits, rng);
      const minus = subtract && rng() < SUBTRACT_CHANCE && sum - value >= 0;
      terms.push(minus ? -value : value);
      sum += minus ? -value : value;
    }
    if (sum > 0) return { event: "mitori", terms, answer: sum };
  }
}

/** 合計 total になる（大きいほうの桁, 小さいほうの桁）の組み合わせから、同じ確率で選ぶ */
function pickSplit(total: number, rng: Rng, bigFirst: boolean): [number, number] {
  const options: [number, number][] = [];
  for (let big = 1; big < total; big++) {
    const small = total - big;
    if (bigFirst ? big >= small : true) options.push([big, small]);
  }
  return options[randomInt(0, options.length - 1, rng)];
}

function kakeProblem(grade: number, rng: Rng): SorobanProblem {
  const [aDigits, bDigits] = pickSplit(gradeSpec(grade).kakeDigits, rng, true);
  const a = numberOfDigits(aDigits, rng);
  const b = numberOfDigits(bDigits, rng, true);
  return { event: "kake", a, b, answer: a * b };
}

function wariProblem(grade: number, rng: Rng): SorobanProblem {
  const total = gradeSpec(grade).wariDigits;
  if (total === null) throw new Error(`grade ${grade} has no wari`);
  const [bDigits, qDigits] = pickSplit(total, rng, false);
  const b = numberOfDigits(bDigits, rng, true);
  const answer = numberOfDigits(qDigits, rng, true);
  return { event: "wari", a: b * answer, b, answer };
}

const MAKERS: Record<SorobanEvent, (grade: number, rng: Rng) => SorobanProblem> = {
  mitori: mitoriProblem,
  kake: kakeProblem,
  wari: wariProblem,
};

/** もぎけんていの10問の種目。わりざんがある級は みとり2・かけ4・わり4、無い級は みとり2・かけ8 */
export function mogiEvents(grade: number): SorobanEvent[] {
  const hasWari = gradeSpec(grade).wariDigits !== null;
  const counts = hasWari ? { mitori: 2, kake: 4, wari: 4 } : { mitori: 2, kake: 8, wari: 0 };
  return (Object.keys(counts) as SorobanEvent[]).flatMap((event) => Array<SorobanEvent>(counts[event]).fill(event));
}

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function eventsOf(rule: SorobanRule): SorobanEvent[] {
  return rule.event === "mogi" ? mogiEvents(rule.grade) : Array<SorobanEvent>(SOROBAN_PROBLEMS).fill(rule.event);
}

export function generateSorobanProblems(rule: SorobanRule, rng: Rng = Math.random): SorobanProblem[] {
  const events = rule.event === "mogi" ? shuffled(eventsOf(rule), rng) : eventsOf(rule);
  return events.map((event) => MAKERS[event](rule.grade, rng));
}

/** 1問の目安の秒数（設計書4.1）。そろばんを使う速さ */
export function secondsFor(event: SorobanEvent, grade: number): number {
  const spec = gradeSpec(grade);
  if (event === "mitori") return Math.ceil(spec.mitori.count * spec.mitori.digits * MITORI_SECONDS_PER_DIGIT);
  if (event === "kake") return spec.kakeDigits * KAKE_SECONDS_PER_DIGIT;
  if (spec.wariDigits === null) throw new Error(`grade ${grade} has no wari`);
  return Math.ceil(spec.wariDigits * WARI_SECONDS_PER_DIGIT);
}

export function sorobanTargetMs(rule: SorobanRule): number {
  return eventsOf(rule).reduce((sum, event) => sum + secondsFor(event, rule.grade), 0) * 1000;
}
