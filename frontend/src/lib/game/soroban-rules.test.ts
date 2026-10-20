import { describe, expect, it } from "vitest";

import {
  generateSorobanProblems,
  gradeSpec,
  mogiEvents,
  secondsFor,
  SOROBAN_GRADES,
  SOROBAN_MAX_ANSWER_LENGTH,
  SOROBAN_PROBLEMS,
  sorobanTargetMs,
  type SorobanEvent,
  type SorobanProblem,
} from "@/lib/game/soroban-rules";

/** 決まった並びの乱数（mulberry32） */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRADES = SOROBAN_GRADES.map((g) => g.grade);
const digits = (n: number) => String(n).length;
const RUNS = 300;

/** 級・種目の問題を、種を変えて RUNS 回ぶん作る */
function manyProblems(grade: number, event: SorobanEvent | "mogi"): SorobanProblem[] {
  const out: SorobanProblem[] = [];
  for (let seed = 1; seed <= RUNS; seed++) out.push(...generateSorobanProblems({ grade, event }, seeded(seed)));
  return out;
}

it("級の表は設計書3.1のとおり", () => {
  expect(SOROBAN_GRADES.map((g) => g.grade)).toEqual([10, 9, 8, 7, 6, 5, 4]);
  expect(gradeSpec(6)).toEqual({ grade: 6, mitori: { digits: 3, count: 10, subtract: true }, kakeDigits: 5, wariDigits: 4 });
  expect(gradeSpec(10)).toEqual({ grade: 10, mitori: { digits: 2, count: 5, subtract: false }, kakeDigits: 3, wariDigits: null });
  expect(gradeSpec(8).mitori).toEqual({ digits: 2, count: 8, subtract: true });
  expect(gradeSpec(4)).toMatchObject({ mitori: { digits: 5, count: 10 }, kakeDigits: 7, wariDigits: 6 });
});

describe("みとりざん", () => {
  it("口数と桁がちょうどで、答えは口の合計", () => {
    for (const grade of GRADES) {
      const spec = gradeSpec(grade).mitori;
      for (const p of manyProblems(grade, "mitori")) {
        if (p.event !== "mitori") throw new Error("種目がちがう");
        expect(p.terms).toHaveLength(spec.count);
        expect(p.terms[0]).toBeGreaterThan(0);
        for (const t of p.terms) {
          expect(digits(Math.abs(t))).toBe(spec.digits);
        }
        expect(p.answer).toBe(p.terms.reduce((s, t) => s + t, 0));
      }
    }
  });

  it("途中の合計が0より小さくならず、答えは0より大きい", () => {
    for (const grade of GRADES) {
      for (const p of manyProblems(grade, "mitori")) {
        if (p.event !== "mitori") throw new Error("種目がちがう");
        let sum = 0;
        for (const t of p.terms) {
          sum += t;
          expect(sum).toBeGreaterThanOrEqual(0);
        }
        expect(p.answer).toBeGreaterThan(0);
      }
    }
  });

  it("10級・9級はたし算だけ、8級からはひき算も出る", () => {
    const hasMinus = (grade: number) =>
      manyProblems(grade, "mitori").some((p) => p.event === "mitori" && p.terms.some((t) => t < 0));
    expect(hasMinus(10)).toBe(false);
    expect(hasMinus(9)).toBe(false);
    expect(hasMinus(8)).toBe(true);
    expect(hasMinus(4)).toBe(true);
  });
});

describe("かけざん", () => {
  it("実法の桁の合計がちょうどで、実の桁 ≧ 法の桁、法が1けたなら2〜9", () => {
    for (const grade of GRADES) {
      const total = gradeSpec(grade).kakeDigits;
      for (const p of manyProblems(grade, "kake")) {
        if (p.event !== "kake") throw new Error("種目がちがう");
        expect(digits(p.a) + digits(p.b)).toBe(total);
        expect(digits(p.a)).toBeGreaterThanOrEqual(digits(p.b));
        if (digits(p.b) === 1) {
          expect(p.b).toBeGreaterThanOrEqual(2);
          expect(p.b).toBeLessThanOrEqual(9);
        }
        expect(p.answer).toBe(p.a * p.b);
      }
    }
  });

  it("6級（合わせて5けた）は 4けた×1けた と 3けた×2けた の両方が出る", () => {
    const shapes = new Set(
      manyProblems(6, "kake").map((p) => (p.event === "kake" ? `${digits(p.a)}x${digits(p.b)}` : "")),
    );
    expect(shapes).toEqual(new Set(["4x1", "3x2"]));
  });
});

describe("わりざん", () => {
  it("法商の桁の合計がちょうどで、必ず割り切れ、1けたの法・商は2〜9", () => {
    for (const grade of GRADES) {
      const total = gradeSpec(grade).wariDigits;
      if (total === null) continue;
      for (const p of manyProblems(grade, "wari")) {
        if (p.event !== "wari") throw new Error("種目がちがう");
        expect(digits(p.b) + digits(p.answer)).toBe(total);
        expect(p.a).toBe(p.b * p.answer);
        for (const n of [p.b, p.answer]) {
          if (digits(n) === 1) {
            expect(n).toBeGreaterThanOrEqual(2);
            expect(n).toBeLessThanOrEqual(9);
          }
        }
      }
    }
  });
});

it("答えはいつも7けた以内", () => {
  for (const grade of GRADES) {
    for (const event of ["mitori", "kake", "wari", "mogi"] as const) {
      if (event === "wari" && gradeSpec(grade).wariDigits === null) continue;
      for (const p of manyProblems(grade, event)) {
        expect(String(p.answer).length).toBeLessThanOrEqual(SOROBAN_MAX_ANSWER_LENGTH);
      }
    }
  }
});

describe("もぎけんてい", () => {
  const count = (events: SorobanEvent[], e: SorobanEvent) => events.filter((x) => x === e).length;

  it("種目の内訳が決まっている", () => {
    const six = mogiEvents(6);
    expect(six).toHaveLength(10);
    expect([count(six, "mitori"), count(six, "kake"), count(six, "wari")]).toEqual([2, 4, 4]);
    const ten = mogiEvents(10);
    expect(ten).toHaveLength(10);
    expect([count(ten, "mitori"), count(ten, "kake"), count(ten, "wari")]).toEqual([2, 8, 0]);
  });

  it("作った問題の種目の数も内訳どおり", () => {
    const made = generateSorobanProblems({ grade: 6, event: "mogi" }, seeded(3));
    const events = made.map((p) => p.event);
    expect([count(events, "mitori"), count(events, "kake"), count(events, "wari")]).toEqual([2, 4, 4]);
  });
});

it("どの級・種目でも10問", () => {
  for (const grade of GRADES) {
    for (const event of ["mitori", "kake", "mogi"] as const) {
      expect(generateSorobanProblems({ grade, event }, seeded(grade))).toHaveLength(SOROBAN_PROBLEMS);
    }
  }
});

describe("目安の秒数", () => {
  it("設計書4.1の式", () => {
    expect(secondsFor("mitori", 10)).toBe(6);
    expect(secondsFor("mitori", 8)).toBe(10);
    expect(secondsFor("mitori", 6)).toBe(18);
    expect(secondsFor("mitori", 4)).toBe(30);
    expect(secondsFor("kake", 6)).toBe(10);
    expect(secondsFor("kake", 4)).toBe(14);
    expect(secondsFor("wari", 8)).toBe(8);
    expect(secondsFor("wari", 6)).toBe(10);
    expect(secondsFor("wari", 5)).toBe(13);
  });

  it("目標タイムは10問ぶんの合計", () => {
    expect(sorobanTargetMs({ grade: 6, event: "mitori" })).toBe(180_000);
    expect(sorobanTargetMs({ grade: 6, event: "mogi" })).toBe((2 * 18 + 4 * 10 + 4 * 10) * 1000);
  });
});
