# Tane ゲームの土台とトップ画面（分割1） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tane を Spra Go と同じ「空の雰囲気」のゲームに作り直し、ホーム（Spruのにわ＋つづきから）・ステージ選択・54ステージ・★とタネの成長・音を入れる。

**Architecture:** ステージは「ルールの表」（`src/data/stages/`）から問題を作り、★は localStorage（`tane:progress:v1`）に保存する。画面はすべてクライアントで読み書きし（`useSyncExternalStore`）、乱数や記録に依存する画面は `next/dynamic(..., { ssr: false })` で読み込む。音・ボタン・パネル・アニメーションは Spra Go の作りを移植し、追加のライブラリは入れない。

**Tech Stack:** Next.js 16.2.10（App Router）、React 19.2.4、TypeScript、Tailwind CSS v4、Vitest 3、next/font/google、lucide-react、class-variance-authority。画面の確認は Playwright（作業用フォルダに単体で入れる。リポジトリには入れない）。

**Spec:** `company/spra/tane/docs/2026-10-14-game-foundation-design.md`（`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/` 配下）

**作業場所:** リポジトリは `projects/tane`（gitのルート）。コードは `projects/tane/frontend`。コマンドはすべて `projects/tane/frontend` で実行する。作業ブランチ `feature/game-foundation` を `master` から切る。

## Global Constraints

- ドキュメント・UIの文言・コメントは日本語。子ども向けの文言はひらがな中心（例: 「はじめる！」「つづきから」「まえのステージを クリアしてね」）
- 新しい npm パッケージは追加しない（フォントは `next/font/google` の `M_PLUS_Rounded_1c` を使う）
- アニメーションは CSS の keyframes だけで作り、`prefers-reduced-motion: reduce` では止める
- localStorage のキー: `tane:progress:v1`（記録）、`tane:settings:v1`（音）。古いキー `tane:cleared-stages` は引き継がず削除する
- 1ステージは20問、HPは5（既存の `stage.ts`・`hp.ts` をそのまま使う）
- `Math.random` で問題を作る画面、localStorage で初期表示が変わる画面は `next/dynamic(..., { ssr: false })` で読み込み、ステージやあそびが変わったら `key` で作り直す
- `react-hooks/set-state-in-effect` に違反しない（effect の中で同期的に setState しない。外部の値は `useSyncExternalStore`、遅らせる変化は `setTimeout` の中で setState）
- 画像は `public/spru/`、音は `public/sounds/`。効果音（効果音ラボ）は素材単体の再配布が禁止なので、リポジトリ（GitHub `katsuhiro1215/tane`、非公開）を公開しない
- 絵文字を UI に使わない（アイコンは lucide-react）
- コメントは、理由が分かりにくいところだけに1行で書く
- コミットはタスクの最後に1回。メッセージは既存の形（`feat: …`・`chore: …` の日本語）で、最後に次の行を付ける:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`（実行するモデル名に合わせる）

## Review Focus

1. **再訪問時のBGM**: 2回目以降はタイトルが出ないため、画面に触れる前は再生が拒否される。最初のタップでBGMが鳴り始めること、せっていでBGMをOFFにすると即止まり、ONで再開すること（Task 6 の `pointerdown` でのやり直し、Task 12 の画面確認）
2. **音声のRange要求**: Service Worker が `/sounds/` やRange付きの要求をキャッシュから返すと、Safari で音が鳴らない／`cache.put` が206で失敗する。`/sounds/` とRange付きは Service Worker を素通りさせること（Task 6 の `sw.js`、Task 12 で206を確認）
3. **手入力・古いURL**: `/mode/foo` は404、`/stage/flash-1`・`/flash/add-1`・`/stage/add-99` は「ステージが見つかりません」とホームへのボタン、`/mode/add?stage=sub-3` の `stage` は無視して既定のステージを出すこと（Task 8 の `parseModeSearchParams` のテスト、Task 10・12 の画面確認）
4. **戻る・再読み込みでの二重処理**: 育つ演出のあと URL から `grew` を消し、戻る・再読み込みで演出がくり返されないこと。結果の記録は1回だけで、同じ★や低い★では上書きしないこと（Task 5 の `withResult` のテスト、Task 10 の `resultLinks` のテスト、Task 8・12 の画面確認）
5. **壊れた・古い記録**: JSONでない値、形の違う値、知らないステージid、古いキーが入っていてもアプリが起動し、空の記録として扱うこと（Task 5 のテスト、Task 12 で壊れた値を入れて起動）

---

## ファイル構成

| ファイル | 役割 | タスク |
|---|---|---|
| `src/lib/game/problem-rules.ts` | ルールから四則演算の問題を作る・ルールに合うか判定する | 1 |
| `src/lib/game/flash-problem.ts` | ルールからフラッシュの問題を作る（レベル→ルールに変更） | 2 |
| `src/data/stages/colors.ts` | Spruの11色 | 3 |
| `src/data/stages/spec.ts` | ステージの表の型とボスの作り方 | 3 |
| `src/data/stages/{add,sub,mul,div,flash}.ts` | 各あそびのステージの表（設計書3.2） | 3 |
| `src/data/stages/catalog.ts` | あそび・全54ステージ・検索 | 3 |
| `src/lib/game/stars.ts` | ★の計算、★から育ち具合 | 4 |
| `src/lib/game/progression.ts` | 開く条件、つづきから、チャレンジ、にわ、★の合計 | 4 |
| `src/lib/local-store.ts` | localStorage と `useSyncExternalStore` の共通部品 | 5 |
| `src/lib/progress-store.ts` | 記録の保存・読み込み | 5 |
| `src/lib/settings-store.ts` | 音の設定 | 5 |
| `src/lib/spru-images.ts` | 画像のパス | 6 |
| `src/lib/sound-files.ts`・`src/lib/bgm-route.ts` | 音のファイルとBGMの選び方 | 6 |
| `src/components/app/sound-provider.tsx`・`bgm-router.tsx` | 音を鳴らす仕組み | 6 |
| `src/components/app/{button,panel}.tsx` | 立体ボタン・パネル | 7 |
| `src/components/app/{sound-toggle,top-bar,stars-row,bottom-nav,confirm-dialog}.tsx` | 共通の部品 | 8・9・11 |
| `src/lib/mode-params.ts` | ステージ選択のURLの読み書き | 8 |
| `src/components/mode/*` | ステージ選択 | 8 |
| `src/components/home/*`・`src/data/spru-lines.ts` | ホームとタイトル | 9 |
| `src/lib/result-links.ts`・`src/components/play/*` | プレイ画面の共通部品と結果 | 10 |
| `src/components/{friends,settings}/*` | なかま・せってい | 11 |

消すファイル（Task 10）: `src/data/problems/`（全部）、`src/lib/game/problem-generator.ts`（とテスト）、`src/lib/game/progress.ts`（とテスト）、`src/lib/storage.ts`、`src/components/stage-list-section.tsx`、`src/components/spru-character.tsx`。

---

### Task 0: 作業ブランチ

- [ ] **Step 1: ブランチを切る**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git status --short   # 何も出ないことを確認（出たら止めて報告）
git switch -c feature/game-foundation
cd frontend && npm test   # 55件が通ることを確認
```

---

### Task 1: ルールから四則演算の問題を作る

**Files:**
- Create: `src/lib/game/problem-rules.ts`
- Test: `src/lib/game/problem-rules.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type Operator = "add" | "sub" | "mul" | "div"`
  - `interface Problem { operator: Operator; operandA: number; operandB: number; answer: number }`（わり算は `operandA`＝割られる数、`operandB`＝割る数）
  - `type NumberPick = { min: number; max: number; step?: number } | { oneOf: readonly number[] }`
  - `type CarryCondition = "none" | "required"`
  - `type ArithmeticRule`（`op: "add" | "sub" | "mul" | "div" | "mix"`。詳細は下のコード）
  - `range(min, max)`・`tens(min, max)`・`oneOf(...values)`: `NumberPick` を作る
  - `pickNumber(pick, rng): number`、`isInPick(value, pick): boolean`
  - `satisfiesRule(problem, rule): boolean`
  - `generateProblem(rule, rng = Math.random): Problem`、`generateProblems(rule, count = 20, rng = Math.random): Problem[]`
  - `MAX_ANSWER = 9999`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/problem-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  generateProblem,
  generateProblems,
  isInPick,
  oneOf,
  pickNumber,
  range,
  satisfiesRule,
  tens,
  type ArithmeticRule,
} from "@/lib/game/problem-rules";

// 固定の乱数だと各数が同じ値から作られて相関し、境界の壊れを見逃す
// (以前の problem-generator.test.ts で実際に踏んだ)。実乱数で多数回確かめる。
const N = 2000;
const columns = (n: number) => String(n).split("").reverse().map(Number);
const ones = (n: number) => n % 10;
const sample = (rule: ArithmeticRule) => generateProblems(rule, N);

describe("pickNumber / isInPick", () => {
  it("range は両端を含む範囲から選ぶ", () => {
    const seen = new Set(Array.from({ length: N }, () => pickNumber(range(3, 5), Math.random)));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it("tens は10の倍数だけを選ぶ", () => {
    for (let i = 0; i < N; i++) {
      const value = pickNumber(tens(10, 90), Math.random);
      expect(value % 10).toBe(0);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(90);
    }
  });

  it("oneOf は指定した数だけを選び、どれも出る", () => {
    const seen = new Set(Array.from({ length: N }, () => pickNumber(oneOf(2, 5), Math.random)));
    expect([...seen].sort()).toEqual([2, 5]);
  });

  it("isInPick は範囲外・刻み違い・候補外を false にする", () => {
    expect(isInPick(20, tens(10, 90))).toBe(true);
    expect(isInPick(15, tens(10, 90))).toBe(false);
    expect(isInPick(100, range(1, 99))).toBe(false);
    expect(isInPick(3, oneOf(2, 5))).toBe(false);
  });
});

describe("たし算", () => {
  it("答えが正しく、数が範囲内", () => {
    for (const p of sample({ op: "add", a: range(1, 9), b: range(1, 9) })) {
      expect(p.operator).toBe("add");
      expect(p.answer).toBe(p.operandA + p.operandB);
      expect(p.operandA).toBeGreaterThanOrEqual(1);
      expect(p.operandA).toBeLessThanOrEqual(9);
    }
  });

  it("carry: none のとき、どの位も足して10未満", () => {
    for (const p of sample({ op: "add", a: range(10, 89), b: range(10, 89), carry: "none" })) {
      const ca = columns(p.operandA);
      const cb = columns(p.operandB);
      for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
        expect((ca[i] ?? 0) + (cb[i] ?? 0)).toBeLessThan(10);
      }
    }
  });

  it("carry: required のとき、一の位でくり上がる", () => {
    for (const p of sample({ op: "add", a: range(11, 89), b: range(2, 9), carry: "required" })) {
      expect(ones(p.operandA) + ones(p.operandB)).toBeGreaterThanOrEqual(10);
    }
  });

  it("minAnswer / maxAnswer を守る", () => {
    for (const p of sample({ op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 })) {
      expect(p.answer).toBeLessThanOrEqual(10);
    }
    for (const p of sample({ op: "add", a: range(10, 99), b: range(10, 99), minAnswer: 100 })) {
      expect(p.answer).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("ひき算", () => {
  it("範囲が重なっていても、答えはマイナスにならない", () => {
    for (const p of sample({ op: "sub", a: range(1, 20), b: range(1, 20) })) {
      expect(p.answer).toBe(p.operandA - p.operandB);
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("borrow: none のとき、どの位もひかれる数の数字 ≥ ひく数の数字", () => {
    for (const p of sample({ op: "sub", a: range(10, 99), b: range(10, 99), borrow: "none" })) {
      const ca = columns(p.operandA);
      const cb = columns(p.operandB);
      for (let i = 0; i < ca.length; i++) {
        expect(ca[i]).toBeGreaterThanOrEqual(cb[i] ?? 0);
      }
    }
  });

  it("borrow: required のとき、一の位でくり下がる", () => {
    for (const p of sample({ op: "sub", a: range(20, 99), b: range(2, 9), borrow: "required" })) {
      expect(ones(p.operandA)).toBeLessThan(ones(p.operandB));
    }
  });

  it("minAnswer を守る", () => {
    for (const p of sample({ op: "sub", a: range(20, 99), b: range(11, 89), minAnswer: 1 })) {
      expect(p.answer).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("かけ算", () => {
  it("carry: none のとき、ひとつ目の数の各位 × ふたつ目の数 が10未満", () => {
    for (const p of sample({ op: "mul", a: range(11, 44), b: range(2, 4), carry: "none" })) {
      expect(p.answer).toBe(p.operandA * p.operandB);
      for (const d of columns(p.operandA)) {
        expect(d * p.operandB).toBeLessThan(10);
      }
    }
  });

  it("carry: required のとき、どこかの位で10以上になる", () => {
    for (const p of sample({ op: "mul", a: range(12, 99), b: range(2, 9), carry: "required" })) {
      expect(columns(p.operandA).some((d) => d * p.operandB >= 10)).toBe(true);
    }
  });
});

describe("わり算", () => {
  it("必ず割り切れ、割る数と答えが範囲内", () => {
    for (const p of sample({ op: "div", divisor: range(2, 9), quotient: range(10, 49), maxDividend: 99 })) {
      expect(p.operator).toBe("div");
      expect(p.answer * p.operandB).toBe(p.operandA);
      expect(p.operandB).toBeGreaterThanOrEqual(2);
      expect(p.operandB).toBeLessThanOrEqual(9);
      expect(p.answer).toBeGreaterThanOrEqual(10);
      expect(p.operandA).toBeLessThanOrEqual(99);
    }
  });

  it("minDividend を守る", () => {
    for (const p of sample({ op: "div", divisor: range(2, 9), quotient: range(12, 99), minDividend: 100 })) {
      expect(p.operandA).toBeGreaterThanOrEqual(100);
    }
  });
});

describe("mix（ボス）", () => {
  const rule: ArithmeticRule = {
    op: "mix",
    rules: [
      { op: "add", a: range(1, 1), b: range(1, 1) },
      { op: "add", a: range(5, 5), b: range(5, 5) },
    ],
  };

  it("各問題がどれかのルールに合い、どのルールも出る", () => {
    const answers = new Set(sample(rule).map((p) => p.answer));
    expect([...answers].sort((x, y) => x - y)).toEqual([2, 10]);
  });

  it("中身が空なら作れずエラーになる", () => {
    expect(() => generateProblem({ op: "mix", rules: [] })).toThrow();
  });
});

describe("satisfiesRule", () => {
  const rule: ArithmeticRule = { op: "add", a: range(1, 9), b: range(1, 9) };

  it("答えが間違っている問題は false", () => {
    expect(satisfiesRule({ operator: "add", operandA: 2, operandB: 3, answer: 6 }, rule)).toBe(false);
  });

  it("演算が違う問題は false", () => {
    expect(satisfiesRule({ operator: "sub", operandA: 3, operandB: 2, answer: 1 }, rule)).toBe(false);
  });

  it("合っている問題は true", () => {
    expect(satisfiesRule({ operator: "add", operandA: 2, operandB: 3, answer: 5 }, rule)).toBe(true);
  });
});

it("条件を満たせないルールはエラーになる（無限ループしない）", () => {
  expect(() => generateProblem({ op: "add", a: range(1, 1), b: range(1, 1), minAnswer: 5 })).toThrow();
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/problem-rules.test.ts`
Expected: FAIL（`Failed to resolve import "@/lib/game/problem-rules"`）

- [ ] **Step 3: 実装する**

`src/lib/game/problem-rules.ts`:

```ts
export type Operator = "add" | "sub" | "mul" | "div";

export interface Problem {
  operator: Operator;
  operandA: number;
  operandB: number;
  answer: number;
}

export type NumberPick =
  | { readonly min: number; readonly max: number; readonly step?: number }
  | { readonly oneOf: readonly number[] };

export type CarryCondition = "none" | "required";

type SingleRule =
  | {
      readonly op: "add";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly carry?: CarryCondition;
      readonly minAnswer?: number;
      readonly maxAnswer?: number;
    }
  | {
      readonly op: "sub";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly borrow?: CarryCondition;
      readonly minAnswer?: number;
    }
  | {
      readonly op: "mul";
      readonly a: NumberPick;
      readonly b: NumberPick;
      readonly carry?: CarryCondition;
    }
  | {
      readonly op: "div";
      readonly divisor: NumberPick;
      readonly quotient: NumberPick;
      readonly minDividend?: number;
      readonly maxDividend?: number;
    };

export type ArithmeticRule = SingleRule | { readonly op: "mix"; readonly rules: readonly ArithmeticRule[] };

export const MAX_ANSWER = 9999;
const MAX_ATTEMPTS = 1000;

export function range(min: number, max: number): NumberPick {
  return { min, max };
}

export function tens(min: number, max: number): NumberPick {
  return { min, max, step: 10 };
}

export function oneOf(...values: number[]): NumberPick {
  return { oneOf: values };
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickNumber(pick: NumberPick, rng: () => number): number {
  if ("oneOf" in pick) {
    return pick.oneOf[randomInt(0, pick.oneOf.length - 1, rng)];
  }
  const step = pick.step ?? 1;
  const count = Math.floor((pick.max - pick.min) / step) + 1;
  return pick.min + step * randomInt(0, count - 1, rng);
}

export function isInPick(value: number, pick: NumberPick): boolean {
  if ("oneOf" in pick) {
    return pick.oneOf.includes(value);
  }
  const step = pick.step ?? 1;
  return value >= pick.min && value <= pick.max && (value - pick.min) % step === 0;
}

/** 一の位から順に並べた各位の数字 */
function digitsOf(n: number): number[] {
  return String(n).split("").reverse().map(Number);
}

function addCarry(a: number, b: number): { any: boolean; ones: boolean } {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let any = false;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    if ((da[i] ?? 0) + (db[i] ?? 0) >= 10) any = true;
  }
  return { any, ones: (da[0] ?? 0) + (db[0] ?? 0) >= 10 };
}

function subBorrow(a: number, b: number): { any: boolean; ones: boolean } {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return {
    any: da.some((d, i) => d < (db[i] ?? 0)),
    ones: (da[0] ?? 0) < (db[0] ?? 0),
  };
}

function mulCarry(a: number, b: number): boolean {
  return digitsOf(a).some((d) => d * b >= 10);
}

function matchesCondition(condition: CarryCondition | undefined, any: boolean, ones: boolean): boolean {
  if (condition === "none") return !any;
  if (condition === "required") return ones;
  return true;
}

export function satisfiesRule(problem: Problem, rule: ArithmeticRule): boolean {
  if (rule.op === "mix") {
    return rule.rules.some((inner) => satisfiesRule(problem, inner));
  }
  if (problem.operator !== rule.op) return false;
  const { operandA: a, operandB: b, answer } = problem;
  if (!Number.isInteger(answer) || answer < 0 || answer > MAX_ANSWER) return false;

  switch (rule.op) {
    case "add": {
      if (answer !== a + b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      if (rule.minAnswer !== undefined && answer < rule.minAnswer) return false;
      if (rule.maxAnswer !== undefined && answer > rule.maxAnswer) return false;
      const carry = addCarry(a, b);
      return matchesCondition(rule.carry, carry.any, carry.ones);
    }
    case "sub": {
      if (answer !== a - b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      if (rule.minAnswer !== undefined && answer < rule.minAnswer) return false;
      const borrow = subBorrow(a, b);
      return matchesCondition(rule.borrow, borrow.any, borrow.ones);
    }
    case "mul": {
      if (answer !== a * b || !isInPick(a, rule.a) || !isInPick(b, rule.b)) return false;
      const carry = mulCarry(a, b);
      return matchesCondition(rule.carry, carry, carry);
    }
    case "div": {
      if (b === 0 || answer * b !== a) return false;
      if (!isInPick(b, rule.divisor) || !isInPick(answer, rule.quotient)) return false;
      if (rule.minDividend !== undefined && a < rule.minDividend) return false;
      if (rule.maxDividend !== undefined && a > rule.maxDividend) return false;
      return true;
    }
  }
}

function drawCandidate(rule: SingleRule, rng: () => number): Problem {
  switch (rule.op) {
    case "add": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "add", operandA: a, operandB: b, answer: a + b };
    }
    case "sub": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "sub", operandA: a, operandB: b, answer: a - b };
    }
    case "mul": {
      const a = pickNumber(rule.a, rng);
      const b = pickNumber(rule.b, rng);
      return { operator: "mul", operandA: a, operandB: b, answer: a * b };
    }
    case "div": {
      const divisor = pickNumber(rule.divisor, rng);
      const quotient = pickNumber(rule.quotient, rng);
      return { operator: "div", operandA: divisor * quotient, operandB: divisor, answer: quotient };
    }
  }
}

export function generateProblem(rule: ArithmeticRule, rng: () => number = Math.random): Problem {
  if (rule.op === "mix") {
    if (rule.rules.length === 0) {
      throw new Error("mix rule needs at least one rule");
    }
    return generateProblem(rule.rules[randomInt(0, rule.rules.length - 1, rng)], rng);
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = drawCandidate(rule, rng);
    if (satisfiesRule(candidate, rule)) {
      return candidate;
    }
  }
  throw new Error(`No problem satisfies rule: ${JSON.stringify(rule)}`);
}

export function generateProblems(
  rule: ArithmeticRule,
  count: number = 20,
  rng: () => number = Math.random
): Problem[] {
  return Array.from({ length: count }, () => generateProblem(rule, rng));
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/problem-rules.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS、型・lintのエラーなし

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/problem-rules.ts src/lib/game/problem-rules.test.ts
git commit -m "feat: ルールの表から四則演算の問題を作る仕組みを追加"
```

---

### Task 2: フラッシュ暗算の問題をルールで作る

**Files:**
- Modify: `src/lib/game/flash-problem.ts`（全体を置き換え）
- Modify: `src/data/problems/flash-stages.ts`（Task 10 で消すまでの仮の対応）
- Modify: `src/components/flash-stage-player.tsx:9-26,53,68`
- Test: `src/lib/game/flash-problem.test.ts`（全体を置き換え）、`src/data/problems/flash-stages.test.ts`（`level` を使う箇所の修正）

**Interfaces:**
- Consumes: なし
- Produces:
  - `interface FlashProblem { sequence: number[]; answer: number }`（変更なし）
  - `interface FlashRule { readonly count: number; readonly digits: 1 | 2; readonly stepMs: number; readonly gapMs: number }`
  - `generateFlashProblem(rule: FlashRule, rng = Math.random): FlashProblem`
  - `generateFlashStageProblems(rule: FlashRule, count = 20, rng = Math.random): FlashProblem[]`
  - `FLASH_LEVELS`・`FlashLevel` は削除

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/flash-problem.test.ts` を次の内容に置き換える:

```ts
import { describe, expect, it } from "vitest";

import { generateFlashProblem, generateFlashStageProblems, type FlashRule } from "@/lib/game/flash-problem";

const N = 2000;
const rule = (count: number, digits: 1 | 2): FlashRule => ({ count, digits, stepMs: 700, gapMs: 200 });

describe("generateFlashProblem", () => {
  it("ルールの数だけ数を作り、答えは数列の合計", () => {
    for (const count of [3, 5, 7]) {
      const problem = generateFlashProblem(rule(count, 1));
      expect(problem.sequence).toHaveLength(count);
      expect(problem.answer).toBe(problem.sequence.reduce((sum, v) => sum + v, 0));
    }
  });

  it("1けたのルールでは、どの数も絶対値が1〜9", () => {
    for (let i = 0; i < N; i++) {
      for (const value of generateFlashProblem(rule(5, 1)).sequence) {
        expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(value)).toBeLessThanOrEqual(9);
      }
    }
  });

  it("2けたのルールでは、どの数も絶対値が10〜99", () => {
    for (let i = 0; i < N; i++) {
      for (const value of generateFlashProblem(rule(3, 2)).sequence) {
        expect(Math.abs(value)).toBeGreaterThanOrEqual(10);
        expect(Math.abs(value)).toBeLessThanOrEqual(99);
      }
    }
  });

  it("最初の数は必ず正", () => {
    for (let i = 0; i < N; i++) {
      expect(generateFlashProblem(rule(3, 2)).sequence[0]).toBeGreaterThan(0);
    }
  });

  it("どのルールでも、途中の合計が0未満にならない", () => {
    for (const r of [rule(5, 1), rule(7, 1), rule(3, 2)]) {
      for (let i = 0; i < N; i++) {
        let total = 0;
        for (const value of generateFlashProblem(r).sequence) {
          total += value;
          expect(total).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("数が2つ未満のルールはエラー", () => {
    expect(() => generateFlashProblem(rule(1, 1))).toThrow();
  });
});

describe("generateFlashStageProblems", () => {
  it("既定で20問作る", () => {
    expect(generateFlashStageProblems(rule(3, 1))).toHaveLength(20);
  });
});
```

`src/data/problems/flash-stages.test.ts` の `expect(stage?.level).toBe(1);` を次に置き換える:

```ts
    expect(stage?.rule.count).toBe(3);
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/flash-problem.test.ts src/data/problems/flash-stages.test.ts`
Expected: FAIL（`generateFlashProblem` にルールを渡しても数が合わない／`rule` が undefined）

- [ ] **Step 3: 実装する**

`src/lib/game/flash-problem.ts` を置き換える:

```ts
export interface FlashProblem {
  sequence: number[];
  answer: number;
}

export interface FlashRule {
  readonly count: number;
  readonly digits: 1 | 2;
  readonly stepMs: number;
  readonly gapMs: number;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateFlashProblem(rule: FlashRule, rng: () => number = Math.random): FlashProblem {
  if (rule.count < 2) {
    throw new Error(`flash rule needs at least 2 numbers: ${rule.count}`);
  }
  const min = rule.digits === 1 ? 1 : 10;
  const max = rule.digits === 1 ? 9 : 99;

  const start = randomInt(min, max, rng);
  const sequence: number[] = [start];
  let runningTotal = start;

  while (sequence.length < rule.count) {
    // 合計が「いちばん小さい数」より小さいときに引くと負になるため、足し算にする
    const isAddition = runningTotal < min ? true : rng() < 0.5;
    const magnitude = isAddition
      ? randomInt(min, max, rng)
      : randomInt(min, Math.min(max, runningTotal), rng);
    const value = isAddition ? magnitude : -magnitude;
    runningTotal += value;
    sequence.push(value);
  }

  return { sequence, answer: runningTotal };
}

export function generateFlashStageProblems(
  rule: FlashRule,
  count: number = 20,
  rng: () => number = Math.random
): FlashProblem[] {
  return Array.from({ length: count }, () => generateFlashProblem(rule, rng));
}
```

`src/data/problems/flash-stages.ts` を置き換える（Task 10 で消す仮のファイル）:

```ts
import type { FlashRule } from "@/lib/game/flash-problem";

export interface FlashStageDefinition {
  id: string;
  rule: FlashRule;
  title: string;
}

const RULES: FlashRule[] = [
  { count: 3, digits: 1, stepMs: 1200, gapMs: 300 },
  { count: 4, digits: 1, stepMs: 900, gapMs: 250 },
  { count: 5, digits: 1, stepMs: 700, gapMs: 200 },
];

export const FLASH_STAGES: FlashStageDefinition[] = RULES.map((rule, index) => ({
  id: `flash-${index + 1}`,
  rule,
  title: `フラッシュ暗算 Lv.${index + 1}`,
}));

export function getFlashStageById(id: string): FlashStageDefinition | undefined {
  return FLASH_STAGES.find((stage) => stage.id === id);
}

export function getNextFlashStage(id: string): FlashStageDefinition | undefined {
  const index = FLASH_STAGES.findIndex((stage) => stage.id === id);
  if (index === -1 || index === FLASH_STAGES.length - 1) {
    return undefined;
  }
  return FLASH_STAGES[index + 1];
}
```

`src/components/flash-stage-player.tsx`:
- import を `import { generateFlashStageProblems, type FlashProblem } from "@/lib/game/flash-problem";` に変える（`FlashLevel` を外す）
- `LEVEL_TIMING` の定義（22〜26行目）を消す
- 53行目を `const problems = generateFlashStageProblems(stageDefinition.rule);` に変える
- 68行目を `const timing = stageDefinition?.rule;` に変える（その下の `timing?.stepMs ?? 0`・`timing?.gapMs ?? 0` はそのまま動く）

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/flash-problem.ts src/lib/game/flash-problem.test.ts src/data/problems/flash-stages.ts src/data/problems/flash-stages.test.ts src/components/flash-stage-player.tsx
git commit -m "feat: フラッシュ暗算の問題を、数の個数・けた・表示速度のルールで作る"
```

---

### Task 3: 54ステージの表

**Files:**
- Create: `src/data/stages/colors.ts`、`src/data/stages/spec.ts`、`src/data/stages/add.ts`、`src/data/stages/sub.ts`、`src/data/stages/mul.ts`、`src/data/stages/div.ts`、`src/data/stages/flash.ts`、`src/data/stages/catalog.ts`
- Test: `src/data/stages/catalog.test.ts`

**Interfaces:**
- Consumes: Task 1 の `ArithmeticRule`・`range`・`tens`・`oneOf`・`generateProblems`・`satisfiesRule`・`MAX_ANSWER`、Task 2 の `FlashRule`・`generateFlashProblem`
- Produces（`@/data/stages/catalog`）:
  - `type ModeId = "add" | "sub" | "mul" | "div" | "flash"`、`MODE_IDS: readonly ModeId[]`（この順）
  - `interface ModeDefinition { id: ModeId; label: string; symbol: string | null }`、`MODES: Record<ModeId, ModeDefinition>`（label: たしざん・ひきざん・かけざん・わりざん・フラッシュ。symbol: ＋・−・×・÷・null）
  - `interface ArithmeticStage { kind: "arithmetic"; id; mode; number; name; description; color: SpruColor; isBoss: boolean; rule: ArithmeticRule }`、`interface FlashStage { kind: "flash"; …同じ…; rule: FlashRule }`、`type Stage = ArithmeticStage | FlashStage`
  - `STAGES: readonly Stage[]`（54件、あそびの順）、`getStage(id): Stage | undefined`、`stagesOfMode(mode): readonly Stage[]`、`nextStageInMode(stage): Stage | undefined`、`isModeId(value: string): value is ModeId`、`playPath(stage): string`（`/stage/<id>` か `/flash/<id>`）、`PROBLEMS_PER_STAGE = 20`
- Produces（`@/data/stages/colors`）: `SPRU_COLORS`（11色）、`type SpruColor`

- [ ] **Step 1: 失敗するテストを書く**

`src/data/stages/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  getStage,
  isModeId,
  MODE_IDS,
  nextStageInMode,
  playPath,
  STAGES,
  stagesOfMode,
  type Stage,
} from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";
import { generateFlashProblem } from "@/lib/game/flash-problem";
import { generateProblems, MAX_ANSWER, satisfiesRule } from "@/lib/game/problem-rules";

const N = 2000;
const arithmetic = STAGES.filter((s): s is Extract<Stage, { kind: "arithmetic" }> => s.kind === "arithmetic");

describe("ステージの数とid", () => {
  it("全部で54、あそびごとに12・12・12・12・6", () => {
    expect(STAGES).toHaveLength(54);
    expect(MODE_IDS.map((mode) => stagesOfMode(mode).length)).toEqual([12, 12, 12, 12, 6]);
  });

  it("idは `<あそび>-<番号>` で重複しない", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STAGES) expect(s.id).toBe(`${s.mode}-${s.number}`);
  });

  it("各あそびの最後だけがボス", () => {
    for (const mode of MODE_IDS) {
      const list = stagesOfMode(mode);
      expect(list.map((s) => s.isBoss)).toEqual(list.map((_, i) => i === list.length - 1));
    }
  });

  it("すべてのステージに11色のどれかが付いている", () => {
    for (const s of STAGES) expect(SPRU_COLORS).toContain(s.color);
  });

  it("フラッシュだけが kind: flash", () => {
    for (const s of STAGES) expect(s.kind).toBe(s.mode === "flash" ? "flash" : "arithmetic");
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
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/data/stages/catalog.test.ts`
Expected: FAIL（`Failed to resolve import "@/data/stages/catalog"`）

- [ ] **Step 3: 実装する**

`src/data/stages/colors.ts`:

```ts
export const SPRU_COLORS = [
  "spru",
  "emerald",
  "gold",
  "amber",
  "ruby",
  "sapphire",
  "pearl",
  "silver",
  "crystal",
  "platinum",
  "obsidian",
] as const;

export type SpruColor = (typeof SPRU_COLORS)[number];

export const REGULAR_COLORS: readonly SpruColor[] = [
  "spru",
  "emerald",
  "gold",
  "amber",
  "ruby",
  "sapphire",
  "pearl",
  "silver",
];
```

`src/data/stages/spec.ts`:

```ts
import type { ArithmeticRule } from "@/lib/game/problem-rules";

export interface StageSpec<R> {
  readonly name: string;
  readonly description: string;
  readonly rule: R;
}

/** 番号 from〜to（1始まり・両端を含む）のルールから1問ずつ選ぶボスを最後に足す */
export function withBoss(
  specs: readonly StageSpec<ArithmeticRule>[],
  from: number,
  to: number
): StageSpec<ArithmeticRule>[] {
  return [
    ...specs,
    {
      name: "ボス",
      description: "まぜこぜ",
      rule: { op: "mix", rules: specs.slice(from - 1, to).map((spec) => spec.rule) },
    },
  ];
}
```

`src/data/stages/add.ts`:

```ts
import { range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

export const ADD_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "こたえが5まで", description: "1けた＋1けた", rule: { op: "add", a: range(1, 4), b: range(1, 4), maxAnswer: 5 } },
    { name: "こたえが10まで", description: "1けた＋1けた", rule: { op: "add", a: range(1, 9), b: range(1, 9), maxAnswer: 10 } },
    { name: "くりあがり", description: "1けた＋1けた", rule: { op: "add", a: range(2, 9), b: range(2, 9), minAnswer: 11 } },
    { name: "1けた まぜこぜ", description: "1けた＋1けた", rule: { op: "add", a: range(1, 9), b: range(1, 9) } },
    { name: "2けた＋1けた", description: "くりあがり なし", rule: { op: "add", a: range(10, 89), b: range(1, 9), carry: "none" } },
    { name: "2けた＋1けた", description: "くりあがり あり", rule: { op: "add", a: range(11, 89), b: range(2, 9), carry: "required" } },
    { name: "なんじゅう＋なんじゅう", description: "10のまとまり", rule: { op: "add", a: tens(10, 90), b: tens(10, 90) } },
    { name: "2けた＋2けた", description: "くりあがり なし", rule: { op: "add", a: range(10, 89), b: range(10, 89), carry: "none" } },
    { name: "2けた＋2けた", description: "くりあがり あり", rule: { op: "add", a: range(11, 89), b: range(11, 89), carry: "required", maxAnswer: 99 } },
    { name: "100をこえる", description: "2けた＋2けた", rule: { op: "add", a: range(10, 99), b: range(10, 99), minAnswer: 100 } },
    { name: "3けた＋2けた", description: "大きなかず", rule: { op: "add", a: range(100, 899), b: range(10, 99) } },
  ],
  5,
  11
);
```

`src/data/stages/sub.ts`:

```ts
import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// ひき算の答えは problem-rules 側でいつも0以上にそろえる
export const SUB_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "5までのひきざん", description: "1けた−1けた", rule: { op: "sub", a: range(2, 5), b: range(1, 5) } },
    { name: "10までのひきざん", description: "10までのかず", rule: { op: "sub", a: range(2, 10), b: range(1, 10) } },
    { name: "くりさがり", description: "10いくつ−1けた", rule: { op: "sub", a: range(11, 18), b: range(2, 9), borrow: "required" } },
    { name: "20まで まぜこぜ", description: "20までのかず", rule: { op: "sub", a: range(1, 20), b: range(1, 9) } },
    { name: "2けた−1けた", description: "くりさがり なし", rule: { op: "sub", a: range(10, 99), b: range(1, 9), borrow: "none" } },
    { name: "2けた−1けた", description: "くりさがり あり", rule: { op: "sub", a: range(20, 99), b: range(2, 9), borrow: "required" } },
    { name: "なんじゅう−なんじゅう", description: "10のまとまり", rule: { op: "sub", a: tens(10, 90), b: tens(10, 90) } },
    { name: "2けた−2けた", description: "くりさがり なし", rule: { op: "sub", a: range(10, 99), b: range(10, 99), borrow: "none" } },
    { name: "2けた−2けた", description: "くりさがり あり", rule: { op: "sub", a: range(20, 99), b: range(11, 89), borrow: "required", minAnswer: 1 } },
    { name: "100からひく", description: "100−2けた", rule: { op: "sub", a: oneOf(100), b: range(11, 99) } },
    { name: "3けた−2けた", description: "大きなかず", rule: { op: "sub", a: range(100, 999), b: range(10, 99) } },
  ],
  5,
  11
);
```

`src/data/stages/mul.ts`:

```ts
import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// 表示は「段 × かける数」(a が段)
export const MUL_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "2のだん・5のだん", description: "くく", rule: { op: "mul", a: oneOf(2, 5), b: range(1, 9) } },
    { name: "3のだん・4のだん", description: "くく", rule: { op: "mul", a: oneOf(3, 4), b: range(1, 9) } },
    { name: "6のだん・7のだん", description: "くく", rule: { op: "mul", a: oneOf(6, 7), b: range(1, 9) } },
    { name: "8のだん・9のだん", description: "くく", rule: { op: "mul", a: oneOf(8, 9), b: range(1, 9) } },
    { name: "1〜5のだん", description: "くく まぜこぜ", rule: { op: "mul", a: range(1, 5), b: range(1, 9) } },
    { name: "くく ぜんぶ", description: "くく まぜこぜ", rule: { op: "mul", a: range(1, 9), b: range(1, 9) } },
    { name: "なんじゅう×1けた", description: "10のまとまり", rule: { op: "mul", a: tens(10, 90), b: range(2, 9) } },
    { name: "2けた×1けた", description: "くりあがり なし", rule: { op: "mul", a: range(11, 44), b: range(2, 4), carry: "none" } },
    { name: "2けた×1けた", description: "くりあがり あり", rule: { op: "mul", a: range(12, 99), b: range(2, 9), carry: "required" } },
    { name: "3けた×1けた", description: "大きなかず", rule: { op: "mul", a: range(100, 999), b: range(2, 9) } },
    { name: "2けた×2けた", description: "10〜19", rule: { op: "mul", a: range(11, 19), b: range(11, 19) } },
  ],
  6,
  11
);
```

`src/data/stages/div.ts`:

```ts
import { oneOf, range, tens, type ArithmeticRule } from "@/lib/game/problem-rules";

import { withBoss, type StageSpec } from "./spec";

// 割る数と答えから作るので、いつも割り切れる
export const DIV_STAGE_SPECS: StageSpec<ArithmeticRule>[] = withBoss(
  [
    { name: "2・5のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(2, 5), quotient: range(1, 9) } },
    { name: "3・4のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(3, 4), quotient: range(1, 9) } },
    { name: "6・7のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(6, 7), quotient: range(1, 9) } },
    { name: "8・9のだん", description: "くくのわりざん", rule: { op: "div", divisor: oneOf(8, 9), quotient: range(1, 9) } },
    { name: "くくのわりざん ぜんぶ", description: "まぜこぜ", rule: { op: "div", divisor: range(1, 9), quotient: range(1, 9) } },
    { name: "なんじゅう÷1けた", description: "10のまとまり", rule: { op: "div", divisor: range(2, 9), quotient: tens(10, 40), maxDividend: 90 } },
    { name: "2けた÷1けた", description: "こたえ 2けた", rule: { op: "div", divisor: range(2, 9), quotient: range(10, 49), maxDividend: 99 } },
    { name: "3けた÷1けた", description: "こたえ 2けた", rule: { op: "div", divisor: range(2, 9), quotient: range(12, 99), minDividend: 100 } },
    { name: "3けた÷1けた", description: "こたえ 3けた", rule: { op: "div", divisor: range(2, 9), quotient: range(100, 499), maxDividend: 999 } },
    { name: "2けた÷2けた", description: "2けたでわる", rule: { op: "div", divisor: range(11, 49), quotient: range(2, 9), maxDividend: 99 } },
    { name: "3けた÷2けた", description: "大きなかず", rule: { op: "div", divisor: range(11, 30), quotient: range(5, 30), minDividend: 100, maxDividend: 999 } },
  ],
  6,
  11
);
```

`src/data/stages/flash.ts`:

```ts
import type { FlashRule } from "@/lib/game/flash-problem";

import type { StageSpec } from "./spec";

export const FLASH_STAGE_SPECS: StageSpec<FlashRule>[] = [
  { name: "3つのかず", description: "1けた ・ ゆっくり", rule: { count: 3, digits: 1, stepMs: 1200, gapMs: 300 } },
  { name: "4つのかず", description: "1けた", rule: { count: 4, digits: 1, stepMs: 900, gapMs: 250 } },
  { name: "5つのかず", description: "1けた", rule: { count: 5, digits: 1, stepMs: 700, gapMs: 200 } },
  { name: "7つのかず", description: "1けた", rule: { count: 7, digits: 1, stepMs: 700, gapMs: 200 } },
  { name: "5つ はやい", description: "1けた ・ はやい", rule: { count: 5, digits: 1, stepMs: 450, gapMs: 150 } },
  { name: "ボス 2けた", description: "2けた ・ 3つのかず", rule: { count: 3, digits: 2, stepMs: 900, gapMs: 250 } },
];
```

`src/data/stages/catalog.ts`:

```ts
import type { FlashRule } from "@/lib/game/flash-problem";
import type { ArithmeticRule } from "@/lib/game/problem-rules";

import { ADD_STAGE_SPECS } from "./add";
import { REGULAR_COLORS, type SpruColor } from "./colors";
import { DIV_STAGE_SPECS } from "./div";
import { FLASH_STAGE_SPECS } from "./flash";
import { MUL_STAGE_SPECS } from "./mul";
import type { StageSpec } from "./spec";
import { SUB_STAGE_SPECS } from "./sub";

export type ModeId = "add" | "sub" | "mul" | "div" | "flash";
export const MODE_IDS: readonly ModeId[] = ["add", "sub", "mul", "div", "flash"];

export interface ModeDefinition {
  readonly id: ModeId;
  readonly label: string;
  readonly symbol: string | null;
}

export const MODES: Record<ModeId, ModeDefinition> = {
  add: { id: "add", label: "たしざん", symbol: "＋" },
  sub: { id: "sub", label: "ひきざん", symbol: "−" },
  mul: { id: "mul", label: "かけざん", symbol: "×" },
  div: { id: "div", label: "わりざん", symbol: "÷" },
  flash: { id: "flash", label: "フラッシュ", symbol: null },
};

export const PROBLEMS_PER_STAGE = 20;

interface StageBase {
  readonly id: string;
  readonly mode: ModeId;
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly color: SpruColor;
  readonly isBoss: boolean;
}

export interface ArithmeticStage extends StageBase {
  readonly kind: "arithmetic";
  readonly rule: ArithmeticRule;
}

export interface FlashStage extends StageBase {
  readonly kind: "flash";
  readonly rule: FlashRule;
}

export type Stage = ArithmeticStage | FlashStage;

const BOSS_COLORS: Record<ModeId, SpruColor> = {
  add: "crystal",
  sub: "platinum",
  mul: "obsidian",
  div: "crystal",
  flash: "platinum",
};

function colorFor(mode: ModeId, index: number, isBoss: boolean): SpruColor {
  if (isBoss) return BOSS_COLORS[mode];
  // あそびごとに色の出だしをずらし、どのあそびでも1ステージ目が同じ色にならないようにする
  const offset = MODE_IDS.indexOf(mode) * 3;
  return REGULAR_COLORS[(offset + index) % REGULAR_COLORS.length];
}

function build<R>(
  mode: ModeId,
  specs: readonly StageSpec<R>[],
  make: (base: StageBase, rule: R) => Stage
): Stage[] {
  return specs.map((spec, index) => {
    const isBoss = index === specs.length - 1;
    return make(
      {
        id: `${mode}-${index + 1}`,
        mode,
        number: index + 1,
        name: spec.name,
        description: spec.description,
        color: colorFor(mode, index, isBoss),
        isBoss,
      },
      spec.rule
    );
  });
}

const arithmetic = (base: StageBase, rule: ArithmeticRule): Stage => ({ ...base, kind: "arithmetic", rule });
const flash = (base: StageBase, rule: FlashRule): Stage => ({ ...base, kind: "flash", rule });

export const STAGES: readonly Stage[] = [
  ...build("add", ADD_STAGE_SPECS, arithmetic),
  ...build("sub", SUB_STAGE_SPECS, arithmetic),
  ...build("mul", MUL_STAGE_SPECS, arithmetic),
  ...build("div", DIV_STAGE_SPECS, arithmetic),
  ...build("flash", FLASH_STAGE_SPECS, flash),
];

const STAGE_BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));
const STAGES_BY_MODE = new Map(MODE_IDS.map((mode) => [mode, STAGES.filter((s) => s.mode === mode)]));

export function getStage(id: string): Stage | undefined {
  return STAGE_BY_ID.get(id);
}

export function stagesOfMode(mode: ModeId): readonly Stage[] {
  return STAGES_BY_MODE.get(mode) ?? [];
}

export function nextStageInMode(stage: Stage): Stage | undefined {
  // number は1始まりなので、そのまま次のステージの添字になる
  return stagesOfMode(stage.mode)[stage.number];
}

export function isModeId(value: string): value is ModeId {
  return (MODE_IDS as readonly string[]).includes(value);
}

export function playPath(stage: Stage): string {
  return stage.kind === "flash" ? `/flash/${stage.id}` : `/stage/${stage.id}`;
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/data/stages/catalog.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS（「条件を満たせない」エラーが出たら、そのステージのルールが設計書3.2と食い違っていないか確かめ、設計書どおりに直す）

- [ ] **Step 5: コミット**

```bash
git add src/data/stages
git commit -m "feat: たし・ひき・かけ・わり12ずつとフラッシュ6の、全54ステージの表を追加"
```

---

### Task 4: ★と進み方のルール

**Files:**
- Create: `src/lib/game/stars.ts`、`src/lib/game/progression.ts`
- Test: `src/lib/game/stars.test.ts`、`src/lib/game/progression.test.ts`

**Interfaces:**
- Consumes: Task 3 の `STAGES`・`MODE_IDS`・`stagesOfMode`・`getStage`・`ModeId`・`Stage`、既存の `StageStatus`（`@/lib/game/stage`）
- Produces（`@/lib/game/stars`）:
  - `type Stars = 0 | 1 | 2 | 3`、`type EarnedStars = 1 | 2 | 3`、`type Growth = "seed" | "sprout" | "bud" | "flower"`
  - `starsForResult(status: StageStatus, mistakes: number): Stars`
  - `mistakesOf(state: { currentIndex: number; correctCount: number }): number`
  - `growthForStars(stars: Stars): Growth`
- Produces（`@/lib/game/progression`）:
  - `type StarMap = Readonly<Partial<Record<string, EarnedStars>>>`
  - `CHALLENGE_UNLOCK_STARS = 30`、`GARDEN_LIMIT = 8`
  - `starsOf(stars, stageId): Stars`、`isUnlocked(stage, stars): boolean`、`totalStars(stars): number`、`friendsCount(stars): number`、`modeStarSummary(mode, stars): { earned: number; max: number }`、`isChallengeUnlocked(stars): boolean`
  - `continueTarget(stars, lastModeId?: ModeId): Stage`
  - `initialFocusStage(mode, stars, requestedStageId?: string): Stage`
  - `gardenFriends(stars, limit = GARDEN_LIMIT): Stage[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/stars.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { growthForStars, mistakesOf, starsForResult } from "@/lib/game/stars";

describe("starsForResult", () => {
  it("ミス0で★3、2回まで★2、それ以上は★1", () => {
    expect(starsForResult("cleared", 0)).toBe(3);
    expect(starsForResult("cleared", 1)).toBe(2);
    expect(starsForResult("cleared", 2)).toBe(2);
    expect(starsForResult("cleared", 3)).toBe(1);
    expect(starsForResult("cleared", 4)).toBe(1);
  });

  it("失敗・途中は★0", () => {
    expect(starsForResult("failed", 0)).toBe(0);
    expect(starsForResult("in-progress", 0)).toBe(0);
  });
});

it("mistakesOf は答えた数 − 正解の数", () => {
  expect(mistakesOf({ currentIndex: 20, correctCount: 17 })).toBe(3);
});

it("growthForStars はタネ→芽→つぼみ→花", () => {
  expect([0, 1, 2, 3].map((s) => growthForStars(s as 0 | 1 | 2 | 3))).toEqual(["seed", "sprout", "bud", "flower"]);
});
```

`src/lib/game/progression.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getStage, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import {
  continueTarget,
  friendsCount,
  gardenFriends,
  initialFocusStage,
  isChallengeUnlocked,
  isUnlocked,
  modeStarSummary,
  totalStars,
  type StarMap,
} from "@/lib/game/progression";

/** あそび mode の1〜n番目に★value を付けた記録 */
function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 = 3): StarMap {
  return Object.fromEntries(stagesOfMode(mode).slice(0, n).map((s) => [s.id, value]));
}

describe("isUnlocked", () => {
  it("1つ目はいつも開いている", () => {
    expect(isUnlocked(getStage("mul-1")!, {})).toBe(true);
  });

  it("前のステージが★1以上なら開く", () => {
    expect(isUnlocked(getStage("add-2")!, {})).toBe(false);
    expect(isUnlocked(getStage("add-2")!, { "add-1": 1 })).toBe(true);
  });

  it("ほかのあそびの★は関係ない", () => {
    expect(isUnlocked(getStage("sub-2")!, { "add-1": 3 })).toBe(false);
  });
});

describe("★の合計・なかま・あそびごと", () => {
  const stars: StarMap = { "add-1": 3, "add-2": 1, "flash-1": 2, "unknown-1": 3 } as StarMap;

  it("知らないidは数えない", () => {
    expect(totalStars(stars)).toBe(6);
    expect(friendsCount(stars)).toBe(3);
  });

  it("modeStarSummary は獲得数と最大数", () => {
    expect(modeStarSummary("add", stars)).toEqual({ earned: 4, max: 36 });
    expect(modeStarSummary("flash", stars)).toEqual({ earned: 2, max: 18 });
  });
});

describe("isChallengeUnlocked", () => {
  it("★29では閉じていて、30で開く", () => {
    const nine = cleared("add", 9); // 27
    expect(isChallengeUnlocked({ ...nine, "add-10": 2 })).toBe(false); // 29
    expect(isChallengeUnlocked({ ...nine, "add-10": 3 })).toBe(true); // 30
  });
});

describe("continueTarget（設計書3.5）", () => {
  it("記録がなければ たしざん1", () => {
    expect(continueTarget({}).id).toBe("add-1");
  });

  it("1. 最後に遊んだあそびの、開いていて★0の最初", () => {
    expect(continueTarget({ ...cleared("sub", 3) }, "sub").id).toBe("sub-4");
  });

  it("2. ★0が無ければ、★3でない最初", () => {
    const stars = { ...cleared("flash", 6), "flash-2": 1 } as StarMap;
    expect(continueTarget(stars, "flash").id).toBe("flash-2");
  });

  it("3. そのあそびが全部★3なら、次のあそびへ（フラッシュの次はたしざん）", () => {
    expect(continueTarget(cleared("flash", 6), "flash").id).toBe("add-1");
    expect(continueTarget(cleared("add", 12), "add").id).toBe("sub-1");
  });

  it("4. 全部★3なら、最後に遊んだあそびのボス", () => {
    const all = Object.assign({}, ...(["add", "sub", "mul", "div", "flash"] as const).map((m) => cleared(m, 12))) as StarMap;
    expect(continueTarget(all, "mul").id).toBe("mul-12");
  });
});

describe("initialFocusStage", () => {
  it("開いているいちばん後ろ", () => {
    expect(initialFocusStage("add", cleared("add", 3, 1)).id).toBe("add-4");
    expect(initialFocusStage("add", {}).id).toBe("add-1");
    expect(initialFocusStage("add", cleared("add", 12)).id).toBe("add-12");
  });

  it("指定されたステージが同じあそびならそれ、違うあそび・知らないidは無視", () => {
    expect(initialFocusStage("add", {}, "add-7").id).toBe("add-7");
    expect(initialFocusStage("add", {}, "sub-3").id).toBe("add-1");
    expect(initialFocusStage("add", {}, "nope").id).toBe("add-1");
  });
});

describe("gardenFriends", () => {
  it("★1以上だけを★の多い順、同じなら後ろのステージから、最大8体", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3, "add-3": 3, "sub-1": 2 };
    expect(gardenFriends(stars).map((s) => s.id)).toEqual(["add-3", "add-2", "sub-1", "add-1"]);
    expect(gardenFriends(cleared("add", 12))).toHaveLength(8);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/stars.test.ts src/lib/game/progression.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 実装する**

`src/lib/game/stars.ts`:

```ts
import type { StageStatus } from "@/lib/game/stage";

export type Stars = 0 | 1 | 2 | 3;
export type EarnedStars = 1 | 2 | 3;
export type Growth = "seed" | "sprout" | "bud" | "flower";

// 分割2で★3に「目標タイム以内」を足すときは、この関数だけを直す
export function starsForResult(status: StageStatus, mistakes: number): Stars {
  if (status !== "cleared") return 0;
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export function mistakesOf(state: { currentIndex: number; correctCount: number }): number {
  return state.currentIndex - state.correctCount;
}

const GROWTH_BY_STARS: Record<Stars, Growth> = { 0: "seed", 1: "sprout", 2: "bud", 3: "flower" };

export function growthForStars(stars: Stars): Growth {
  return GROWTH_BY_STARS[stars];
}
```

`src/lib/game/progression.ts`:

```ts
import { MODE_IDS, STAGES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import type { EarnedStars, Stars } from "@/lib/game/stars";

export type StarMap = Readonly<Partial<Record<string, EarnedStars>>>;

export const CHALLENGE_UNLOCK_STARS = 30;
export const GARDEN_LIMIT = 8;
const MAX_STARS = 3;

export function starsOf(stars: StarMap, stageId: string): Stars {
  return stars[stageId] ?? 0;
}

export function isUnlocked(stage: Stage, stars: StarMap): boolean {
  if (stage.number === 1) return true;
  const previous = stagesOfMode(stage.mode)[stage.number - 2];
  return starsOf(stars, previous.id) >= 1;
}

export function totalStars(stars: StarMap): number {
  return STAGES.reduce((sum, stage) => sum + starsOf(stars, stage.id), 0);
}

export function friendsCount(stars: StarMap): number {
  return STAGES.filter((stage) => starsOf(stars, stage.id) >= 1).length;
}

export function modeStarSummary(mode: ModeId, stars: StarMap): { earned: number; max: number } {
  const list = stagesOfMode(mode);
  return {
    earned: list.reduce((sum, stage) => sum + starsOf(stars, stage.id), 0),
    max: list.length * MAX_STARS,
  };
}

export function isChallengeUnlocked(stars: StarMap): boolean {
  return totalStars(stars) >= CHALLENGE_UNLOCK_STARS;
}

function nextToPlayInMode(mode: ModeId, stars: StarMap): Stage | undefined {
  const list = stagesOfMode(mode);
  return (
    list.find((stage) => isUnlocked(stage, stars) && starsOf(stars, stage.id) === 0) ??
    list.find((stage) => starsOf(stars, stage.id) < MAX_STARS)
  );
}

export function continueTarget(stars: StarMap, lastModeId?: ModeId): Stage {
  const start = lastModeId ?? "add";
  const startIndex = MODE_IDS.indexOf(start);
  for (let i = 0; i < MODE_IDS.length; i++) {
    const found = nextToPlayInMode(MODE_IDS[(startIndex + i) % MODE_IDS.length], stars);
    if (found) return found;
  }
  const list = stagesOfMode(start);
  return list[list.length - 1];
}

export function initialFocusStage(mode: ModeId, stars: StarMap, requestedStageId?: string): Stage {
  const list = stagesOfMode(mode);
  const requested = list.find((stage) => stage.id === requestedStageId);
  if (requested) return requested;
  const unlocked = list.filter((stage) => isUnlocked(stage, stars));
  return unlocked[unlocked.length - 1];
}

export function gardenFriends(stars: StarMap, limit: number = GARDEN_LIMIT): Stage[] {
  return STAGES.map((stage, order) => ({ stage, order, stars: starsOf(stars, stage.id) }))
    .filter((entry) => entry.stars >= 1)
    .sort((x, y) => y.stars - x.stars || y.order - x.order)
    .slice(0, limit)
    .map((entry) => entry.stage);
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/stars.test.ts src/lib/game/progression.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/stars.ts src/lib/game/stars.test.ts src/lib/game/progression.ts src/lib/game/progression.test.ts
git commit -m "feat: ★のつけ方・タネの育ち方・ステージの開き方・つづきからの選び方を追加"
```

---

### Task 5: 記録と音の設定の保存

**Files:**
- Create: `src/lib/local-store.ts`、`src/lib/progress-store.ts`、`src/lib/settings-store.ts`
- Test: `src/lib/progress-store.test.ts`、`src/lib/settings-store.test.ts`

**Interfaces:**
- Consumes: Task 3 の `getStage`・`isModeId`・`ModeId`、Task 4 の `StarMap`・`Stars`・`EarnedStars`
- Produces（`@/lib/progress-store`）:
  - `PROGRESS_KEY = "tane:progress:v1"`、`LEGACY_KEYS = ["tane:cleared-stages"]`
  - `interface Progress { stars: StarMap; lastModeId?: ModeId; titleSeen: boolean }`、`EMPTY_PROGRESS`
  - `parseProgress(raw: string | null): Progress`、`withResult(progress, stageId, stars): { progress: Progress; improved: boolean }`
  - `readProgress(): Progress`、`useProgress(): Progress`
  - `recordStageResult(stageId, stars: Stars): { improved: boolean; before: Stars }`
  - `rememberLastMode(mode: ModeId): void`、`markTitleSeen(): void`、`resetProgress(): void`
- Produces（`@/lib/settings-store`）:
  - `SETTINGS_KEY = "tane:settings:v1"`、`interface Settings { se: boolean; bgm: boolean }`、`DEFAULT_SETTINGS = { se: true, bgm: true }`
  - `parseSettings(raw): Settings`、`readSettings()`、`useSettings()`、`updateSettings(patch: Partial<Settings>): void`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/progress-store.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_PROGRESS,
  markTitleSeen,
  parseProgress,
  PROGRESS_KEY,
  readProgress,
  recordStageResult,
  rememberLastMode,
  resetProgress,
  withResult,
} from "@/lib/progress-store";
import { SETTINGS_KEY } from "@/lib/settings-store";

describe("parseProgress", () => {
  it("空・JSONでない・形が違う値は空の記録", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("{oops")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("[1,2]")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('"text"')).toEqual(EMPTY_PROGRESS);
  });

  it("★は1〜3の整数だけ、知らないステージidは捨てる", () => {
    const raw = JSON.stringify({ stars: { "add-1": 3, "add-2": 0, "add-3": 4, "add-4": "2", "zzz-1": 3, "flash-6": 2 }, titleSeen: true });
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 3, "flash-6": 2 }, titleSeen: true });
  });

  it("lastModeId は知っているあそびだけ、titleSeen は true のときだけ", () => {
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "mul", titleSeen: "yes" }))).toEqual({ stars: {}, lastModeId: "mul", titleSeen: false });
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "challenge" })).lastModeId).toBeUndefined();
  });
});

describe("withResult", () => {
  it("前より★が多いときだけ更新する", () => {
    const first = withResult(EMPTY_PROGRESS, "add-1", 2);
    expect(first).toEqual({ progress: { ...EMPTY_PROGRESS, stars: { "add-1": 2 } }, improved: true });
    expect(withResult(first.progress, "add-1", 2).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 1).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 3).progress.stars["add-1"]).toBe(3);
  });

  it("★0（失敗）は記録しない", () => {
    expect(withResult(EMPTY_PROGRESS, "add-1", 0)).toEqual({ progress: EMPTY_PROGRESS, improved: false });
  });
});

describe("localStorage への読み書き", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recordStageResult は上がったときだけ保存し、前の★を返す", () => {
    expect(recordStageResult("add-1", 2)).toEqual({ improved: true, before: 0 });
    expect(recordStageResult("add-1", 1)).toEqual({ improved: false, before: 2 });
    expect(readProgress().stars).toEqual({ "add-1": 2 });
  });

  it("保存すると古いキーを消す", () => {
    store.set("tane:cleared-stages", '["add-1"]');
    markTitleSeen();
    expect(store.has("tane:cleared-stages")).toBe(false);
    expect(readProgress().titleSeen).toBe(true);
  });

  it("rememberLastMode", () => {
    rememberLastMode("div");
    expect(readProgress().lastModeId).toBe("div");
  });

  it("resetProgress は記録を消すが、音の設定は残す", () => {
    recordStageResult("add-1", 3);
    store.set(SETTINGS_KEY, JSON.stringify({ se: false, bgm: true }));
    resetProgress();
    expect(store.has(PROGRESS_KEY)).toBe(false);
    expect(store.get(SETTINGS_KEY)).toBe(JSON.stringify({ se: false, bgm: true }));
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("壊れた値が入っていても空の記録として読める", () => {
    store.set(PROGRESS_KEY, "not json");
    expect(readProgress()).toEqual(EMPTY_PROGRESS);
  });
});
```

`src/lib/settings-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "@/lib/settings-store";

describe("parseSettings", () => {
  it("はじめは効果音もBGMもON", () => {
    expect(parseSettings(null)).toEqual({ se: true, bgm: true });
    expect(DEFAULT_SETTINGS).toEqual({ se: true, bgm: true });
  });

  it("保存された値を使い、形が違う項目は既定値", () => {
    expect(parseSettings(JSON.stringify({ se: false, bgm: "off" }))).toEqual({ se: false, bgm: true });
    expect(parseSettings("broken")).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/progress-store.test.ts src/lib/settings-store.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 実装する**

`src/lib/local-store.ts`:

```ts
import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  read: () => T;
  write: (value: T) => void;
  remove: () => void;
  useValue: () => T;
}

/**
 * localStorage の1つのキーを、useSyncExternalStore で読める形にする。
 * getSnapshot は同じ中身なら同じ参照を返す必要がある（毎回新しい値だと再描画が止まらない）ため、
 * 生の文字列が変わったときだけ parse し直す。
 */
export function createLocalStore<T>(key: string, parse: (raw: string | null) => T, fallback: T): LocalStore<T> {
  // "storage" イベントはほかのタブの変更でしか届かないため、同じタブ用に独自のイベントも出す
  const eventName = `tane:store-changed:${key}`;
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  function read(): T {
    if (typeof window === "undefined") return fallback;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    cachedValue = parse(raw);
    return cachedValue;
  }

  function notify() {
    window.dispatchEvent(new Event(eventName));
  }

  function write(value: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 保存できない環境（プライベートブラウズなど）では、今の画面の中だけで遊べればよい
    }
    notify();
  }

  function remove() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 同上
    }
    notify();
  }

  function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(eventName, callback);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, remove, useValue };
}
```

`src/lib/progress-store.ts`:

```ts
import { getStage, isModeId, type ModeId } from "@/data/stages/catalog";
import type { StarMap } from "@/lib/game/progression";
import type { EarnedStars, Stars } from "@/lib/game/stars";
import { createLocalStore } from "@/lib/local-store";

export const PROGRESS_KEY = "tane:progress:v1";
export const LEGACY_KEYS = ["tane:cleared-stages"] as const;

export interface Progress {
  readonly stars: StarMap;
  readonly lastModeId?: ModeId;
  readonly titleSeen: boolean;
}

export const EMPTY_PROGRESS: Progress = { stars: {}, titleSeen: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEarnedStars(value: unknown): value is EarnedStars {
  return value === 1 || value === 2 || value === 3;
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return EMPTY_PROGRESS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (!isRecord(data)) return EMPTY_PROGRESS;

  const stars: Record<string, EarnedStars> = {};
  if (isRecord(data.stars)) {
    for (const [id, value] of Object.entries(data.stars)) {
      if (getStage(id) && isEarnedStars(value)) stars[id] = value;
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  return { stars, titleSeen: data.titleSeen === true, ...(lastModeId ? { lastModeId } : {}) };
}

export function withResult(
  progress: Progress,
  stageId: string,
  stars: Stars
): { progress: Progress; improved: boolean } {
  const before = progress.stars[stageId] ?? 0;
  if (stars === 0 || stars <= before) return { progress, improved: false };
  return {
    progress: { ...progress, stars: { ...progress.stars, [stageId]: stars as EarnedStars } },
    improved: true,
  };
}

const store = createLocalStore(PROGRESS_KEY, parseProgress, EMPTY_PROGRESS);

function removeLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 消せなくても遊ぶのに困らない
    }
  }
}

function save(next: Progress) {
  store.write(next);
  removeLegacyKeys();
}

export const readProgress = store.read;
export const useProgress = store.useValue;

export function recordStageResult(stageId: string, stars: Stars): { improved: boolean; before: Stars } {
  const current = store.read();
  const before: Stars = current.stars[stageId] ?? 0;
  const { progress, improved } = withResult(current, stageId, stars);
  if (improved) save(progress);
  return { improved, before };
}

export function rememberLastMode(mode: ModeId): void {
  const current = store.read();
  if (current.lastModeId !== mode) save({ ...current, lastModeId: mode });
}

export function markTitleSeen(): void {
  const current = store.read();
  if (!current.titleSeen) save({ ...current, titleSeen: true });
}

export function resetProgress(): void {
  store.remove();
  removeLegacyKeys();
}
```

`src/lib/settings-store.ts`:

```ts
import { createLocalStore } from "@/lib/local-store";

export const SETTINGS_KEY = "tane:settings:v1";

export interface Settings {
  readonly se: boolean;
  readonly bgm: boolean;
}

export const DEFAULT_SETTINGS: Settings = { se: true, bgm: true };

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
    const record = data as Record<string, unknown>;
    return {
      se: typeof record.se === "boolean" ? record.se : DEFAULT_SETTINGS.se,
      bgm: typeof record.bgm === "boolean" ? record.bgm : DEFAULT_SETTINGS.bgm,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const store = createLocalStore(SETTINGS_KEY, parseSettings, DEFAULT_SETTINGS);

export const readSettings = store.read;
export const useSettings = store.useValue;

export function updateSettings(patch: Partial<Settings>): void {
  store.write({ ...store.read(), ...patch });
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/progress-store.test.ts src/lib/settings-store.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/local-store.ts src/lib/progress-store.ts src/lib/progress-store.test.ts src/lib/settings-store.ts src/lib/settings-store.test.ts
git commit -m "feat: ステージごとの★と音の設定をlocalStorageに保存する仕組みを追加"
```

---

### Task 6: 画像・音の取り込みと、音を鳴らす仕組み

**Files:**
- Create（コピー）: `public/spru/{growth,expressions,actions,basic,stages}/…`、`public/spru/icons/{sound-on,sound-off}.webp`、`public/sounds/{correct,incorrect,allCorrect,coin,decide41,bgm-home,bgm-quiz}.mp3`
- Create: `public/spru/README.md`、`public/sounds/README.md`、`src/lib/spru-images.ts`、`src/lib/sound-files.ts`、`src/lib/bgm-route.ts`、`src/components/app/sound-provider.tsx`、`src/components/app/bgm-router.tsx`
- Create（会社側の文書）: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/assets/image-requests.md`
- Modify: `src/app/layout.tsx`（`SoundProvider`・`BgmRouter` を入れる）、`public/sw.js`、`next.config.ts`、`/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/CLAUDE.md`（末尾に追記）
- Test: `src/lib/spru-images.test.ts`、`src/lib/sound-files.test.ts`、`src/lib/bgm-route.test.ts`

**Interfaces:**
- Consumes: Task 3 の `SPRU_COLORS`・`SpruColor`、Task 4 の `Growth`、Task 5 の `useSettings`
- Produces:
  - `@/lib/spru-images`: `GROWTHS`、`growthImage(color, growth): string`、`SPRU_POSES`（`front`・`cheer`・`jump`・`wave`・`happy`・`laugh`・`excited`・`sad`・`think`）、`type SpruPose`、`STAGE_BADGES`（`locked`・`open`・`cleared`）、`SOUND_ICONS`（`on`・`off`）、`allSpruImagePaths(): string[]`
  - `@/lib/sound-files`: `type SoundKey = "correct" | "incorrect" | "allCorrect" | "coin" | "select"`、`SOUND_FILES`、`BGM_FILES`
  - `@/lib/bgm-route`: `type BgmTrack = "home" | "quiz"`、`bgmTrackFor(pathname): BgmTrack`
  - `@/components/app/sound-provider`: `SoundProvider`、`useSound(): { play(key: SoundKey): void; playBgm(track: BgmTrack): void }`
  - `@/components/app/bgm-router`: `BgmRouter`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/spru-images.test.ts`:

```ts
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allSpruImagePaths, growthImage } from "@/lib/spru-images";

describe("spru-images", () => {
  it("使う画像がすべて public にある", () => {
    const missing = allSpruImagePaths().filter((p) => !existsSync(path.join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
  });

  it("growthImage は色と育ち具合からパスを作る", () => {
    expect(growthImage("gold", "flower")).toBe("/spru/growth/gold/flower.webp");
  });
});
```

`src/lib/sound-files.test.ts`:

```ts
import { existsSync } from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

import { BGM_FILES, SOUND_FILES } from "@/lib/sound-files";

it("効果音とBGMのファイルがすべて public にある", () => {
  const files = [...Object.values(SOUND_FILES), ...Object.values(BGM_FILES)];
  expect(files.filter((p) => !existsSync(path.join(process.cwd(), "public", p)))).toEqual([]);
});
```

`src/lib/bgm-route.test.ts`:

```ts
import { expect, it } from "vitest";

import { bgmTrackFor } from "@/lib/bgm-route";

it("プレイ画面はクイズ用、それ以外はホーム用", () => {
  expect(bgmTrackFor("/stage/add-1")).toBe("quiz");
  expect(bgmTrackFor("/flash/flash-2")).toBe("quiz");
  expect(bgmTrackFor("/")).toBe("home");
  expect(bgmTrackFor("/mode/add")).toBe("home");
  expect(bgmTrackFor("/settings")).toBe("home");
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/spru-images.test.ts src/lib/sound-files.test.ts src/lib/bgm-route.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 画像と音をコピーする**

```bash
SRC=../../Spra-go/frontend/public
mkdir -p public/spru/icons public/sounds
cp -R $SRC/spru/growth $SRC/spru/expressions $SRC/spru/actions $SRC/spru/basic $SRC/spru/stages public/spru/
cp $SRC/spru/icons/sound-on.webp $SRC/spru/icons/sound-off.webp public/spru/icons/
for f in correct incorrect allCorrect coin decide41 bgm-home bgm-quiz; do cp "$SRC/sounds/$f.mp3" public/sounds/; done
ls public/spru/growth | wc -l   # 11
ls public/sounds | wc -l        # 7
```

- [ ] **Step 4: 画像・音の一覧と、音を鳴らす仕組みを実装する**

`src/lib/spru-images.ts`:

```ts
import { SPRU_COLORS, type SpruColor } from "@/data/stages/colors";
import type { Growth } from "@/lib/game/stars";

export const GROWTHS: readonly Growth[] = ["seed", "sprout", "bud", "flower"];

export function growthImage(color: SpruColor, growth: Growth): string {
  return `/spru/growth/${color}/${growth}.webp`;
}

export const SPRU_POSES = {
  front: "/spru/basic/front.webp",
  cheer: "/spru/actions/cheer.webp",
  jump: "/spru/actions/jump.webp",
  wave: "/spru/actions/wave.webp",
  happy: "/spru/expressions/happy.webp",
  laugh: "/spru/expressions/laugh.webp",
  excited: "/spru/expressions/excited.webp",
  sad: "/spru/expressions/sad.webp",
  think: "/spru/expressions/think.webp",
} as const;

export type SpruPose = keyof typeof SPRU_POSES;

export const STAGE_BADGES = {
  locked: "/spru/stages/locked.webp",
  open: "/spru/stages/open.webp",
  cleared: "/spru/stages/cleared.webp",
} as const;

export const SOUND_ICONS = {
  on: "/spru/icons/sound-on.webp",
  off: "/spru/icons/sound-off.webp",
} as const;

export function allSpruImagePaths(): string[] {
  return [
    ...SPRU_COLORS.flatMap((color) => GROWTHS.map((growth) => growthImage(color, growth))),
    ...Object.values(SPRU_POSES),
    ...Object.values(STAGE_BADGES),
    ...Object.values(SOUND_ICONS),
  ];
}
```

`src/lib/sound-files.ts`:

```ts
import type { BgmTrack } from "@/lib/bgm-route";

export type SoundKey = "correct" | "incorrect" | "allCorrect" | "coin" | "select";

export const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  allCorrect: "/sounds/allCorrect.mp3",
  coin: "/sounds/coin.mp3",
  select: "/sounds/decide41.mp3",
};

export const BGM_FILES: Record<BgmTrack, string> = {
  home: "/sounds/bgm-home.mp3",
  quiz: "/sounds/bgm-quiz.mp3",
};
```

`src/lib/bgm-route.ts`:

```ts
export type BgmTrack = "home" | "quiz";

export function bgmTrackFor(pathname: string): BgmTrack {
  return pathname.startsWith("/stage/") || pathname.startsWith("/flash/") ? "quiz" : "home";
}
```

`src/components/app/sound-provider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

import type { BgmTrack } from "@/lib/bgm-route";
import { BGM_FILES, SOUND_FILES, type SoundKey } from "@/lib/sound-files";
import { useSettings } from "@/lib/settings-store";

const BGM_VOLUME = 0.35;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 400;
const FADE_STEP_MS = 40;

interface SoundContextValue {
  play: (key: SoundKey) => void;
  playBgm: (track: BgmTrack) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function fadeAudio(audio: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = audio.volume;
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let step = 0;
  const timer = window.setInterval(() => {
    step += 1;
    audio.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / steps));
    if (step >= steps) {
      window.clearInterval(timer);
      done?.();
    }
  }, FADE_STEP_MS);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { se, bgm } = useSettings();
  const audioCache = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmTrackRef = useRef<BgmTrack | null>(null);
  const bgmPlayingRef = useRef(false);

  const stopBgmAudio = useCallback(() => {
    const audio = bgmAudioRef.current;
    bgmAudioRef.current = null;
    bgmPlayingRef.current = false;
    if (!audio) return;
    fadeAudio(audio, 0, FADE_OUT_MS, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const startBgmAudio = useCallback(
    (track: BgmTrack) => {
      stopBgmAudio();
      const audio = new Audio(BGM_FILES[track]);
      audio.loop = true;
      audio.volume = 0;
      bgmAudioRef.current = audio;
      audio
        .play()
        .then(() => {
          if (bgmAudioRef.current !== audio) {
            audio.pause();
            return;
          }
          bgmPlayingRef.current = true;
          fadeAudio(audio, BGM_VOLUME, FADE_IN_MS);
        })
        .catch(() => {
          // 画面に触れる前は再生できない。下の pointerdown でやり直す
        });
    },
    [stopBgmAudio]
  );

  useEffect(() => {
    if (!bgm) {
      stopBgmAudio();
      return;
    }
    if (bgmTrackRef.current && !bgmPlayingRef.current) startBgmAudio(bgmTrackRef.current);
  }, [bgm, startBgmAudio, stopBgmAudio]);

  // スマホは画面に触れるまで音を出せない。2回目以降はタイトルが無いので、最初のタップで鳴らし直す
  useEffect(() => {
    function retry() {
      if (bgm && bgmTrackRef.current && !bgmPlayingRef.current) startBgmAudio(bgmTrackRef.current);
    }
    window.addEventListener("pointerdown", retry);
    return () => window.removeEventListener("pointerdown", retry);
  }, [bgm, startBgmAudio]);

  const play = useCallback(
    (key: SoundKey) => {
      if (!se) return;
      let audio = audioCache.current[key];
      if (!audio) {
        audio = new Audio(SOUND_FILES[key]);
        audioCache.current[key] = audio;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        // 効果音は演出の付け足しなので、鳴らなくても止めない
      });
    },
    [se]
  );

  const playBgm = useCallback(
    (track: BgmTrack) => {
      const alreadyPlaying = bgmTrackRef.current === track && bgmPlayingRef.current;
      bgmTrackRef.current = track;
      if (!bgm || alreadyPlaying) return;
      startBgmAudio(track);
    },
    [bgm, startBgmAudio]
  );

  return <SoundContext.Provider value={{ play, playBgm }}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound は SoundProvider の内側で使う");
  }
  return context;
}
```

`src/components/app/bgm-router.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useSound } from "@/components/app/sound-provider";
import { bgmTrackFor } from "@/lib/bgm-route";

export function BgmRouter() {
  const pathname = usePathname();
  const { playBgm } = useSound();

  useEffect(() => {
    playBgm(bgmTrackFor(pathname));
  }, [pathname, playBgm]);

  return null;
}
```

`src/app/layout.tsx` の `<body>` の中を次に変える（import に `SoundProvider`・`BgmRouter` を足す）:

```tsx
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SoundProvider>
          {children}
          <BgmRouter />
        </SoundProvider>
        <PwaRegister />
      </body>
```

`next.config.ts`（画像はすでに小さい webp なので、変換の手間を省く）:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
```

`public/sw.js`:
- 1行目を `const CACHE_NAME = "tane-cache-v2";` にする
- `fetch` の中の `if (request.method !== "GET") { return; }` のすぐ下に次を足す:

```js
  // 音声はRange要求(206)で読まれる。キャッシュから返すとSafariで鳴らなくなり、206はcache.putもできないため素通りさせる
  const url = new URL(request.url);
  if (request.headers.has("range") || url.pathname.startsWith("/sounds/")) {
    return;
  }
```

- [ ] **Step 5: 説明の文書を書く**

`public/spru/README.md`:

```markdown
# Spruの画像

Spra Go（`projects/Spra-go/frontend/public/spru/`）から、Taneで使うものだけをコピーしたもの。2026-10-14。

- マスコットの利用ルール: `company/spra/mascot/CLAUDE.md`（S字の芽・丸み・親しみ・Green & Tech を守る）
- どの画像をどこで使うかは `src/lib/spru-images.ts` にまとめている。画面のコードはここを通して参照する
- 差し替えるときは、同じパス・同じファイル名で上書きする。新しい画像を足したら `src/lib/spru-images.ts` に足す（テストで、ファイルがあるかを確かめている）
- 大きく見せる絵の新しい画像は ChatGPT に依頼中（`company/spra/tane/assets/image-requests.md`）
```

`public/sounds/README.md`:

```markdown
# 音

Spra Go（`projects/Spra-go/frontend/public/sounds/`）からコピーしたもの。2026-10-14。

| ファイル | 鳴らす場面 |
|---|---|
| correct.mp3 | 正解 |
| incorrect.mp3 | 不正解 |
| allCorrect.mp3 | ステージクリア |
| coin.mp3 | タネが育った |
| decide41.mp3 | ボタン（`select`） |
| bgm-home.mp3 | ホーム・ステージ選択・なかま・せってい |
| bgm-quiz.mp3 | プレイ中 |

- 効果音は「効果音ラボ」（https://soundeffect-lab.info/）の素材。商用利用可・クレジット不要。**音声ファイル単体の再配布は禁止**のため、このリポジトリを公開するときは sounds の中身を含めないこと
- BGM は Suno で制作したもの（Spra Go と同じ。制作記録: `company/spra/spra-theme/`）
- 鳴らす仕組みは `src/components/app/sound-provider.tsx`、ファイルの一覧は `src/lib/sound-files.ts`
```

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/assets/image-requests.md`:

```markdown
# Tane 画像の依頼リスト（ChatGPT向け）

作成: 2026-10-14（Claude）。Ownerを通して ChatGPT に依頼する。

## 共通の条件

- 元にする絵: `company/spra/mascot/assets/spru/spru.png`（ふつうのSpru）。S字の芽・丸み・親しみ・Green & Tech を守る（`company/spra/mascot/CLAUDE.md`）
- 形式: 背景が透明なPNG、1024×1024の正方形、キャラクターは中央、キャラクターの縦は768px以上
- 絵のタッチ: 今の Spra Go の画像（やわらかい3D風、明るい色）とそろえる
- 届いたら Claude が webp に変換し、`projects/tane/frontend/public/spru/` の同じ名前のファイルに差し替える

## 依頼する絵

| # | 用途 | ポーズ・表情 | 差し替え先 |
|---|---|---|---|
| 1 | ホームの主役・ステージ選択のカード | 両手を上げて応援している、にっこり | `actions/cheer.webp` |
| 2 | フィーバー（分割2）・タップしたとき | 元気にジャンプ、うれしそう | `actions/jump.webp` |
| 3 | タイトル画面の中央 | 正面を向いて立つ、やさしい笑顔 | `basic/front.webp` |
| 4 | クリア画面 | 片手でピース、大笑い | `actions/cheer.webp` と別に `actions/victory.webp`（新規） |
| 5 | 不正解・失敗 | 少し残念そう、でも前向き（泣かせない） | `expressions/sad.webp` |
```

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/CLAUDE.md` の末尾に追記:

```markdown

## Taneで使用中（2026-10-14〜）

- Tane（`projects/tane/frontend/public/spru/`）が、Spra Go から成長4段階×11色・表情・動き・ステージのバッジをコピーして使う。一覧は `projects/tane/frontend/public/spru/README.md`
- Tane用の新しい絵の依頼リスト: `company/spra/tane/assets/image-requests.md`
```

- [ ] **Step 6: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS、ビルド成功

- [ ] **Step 7: コミット**（会社側の文書はgitの管理外なのでコミットしない）

```bash
git add public/spru public/sounds src/lib/spru-images.ts src/lib/spru-images.test.ts src/lib/sound-files.ts src/lib/sound-files.test.ts src/lib/bgm-route.ts src/lib/bgm-route.test.ts src/components/app/sound-provider.tsx src/components/app/bgm-router.tsx src/app/layout.tsx public/sw.js next.config.ts
git commit -m "feat: Spra GoのSpruの画像・効果音・BGMを取り込み、音を鳴らす仕組みを追加"
```

---

### Task 7: 空の色・文字・立体ボタン・パネル・動き

**Files:**
- Modify: `src/app/globals.css`（`@theme inline` に追加、`:root` の色、`@layer base`、`@layer utilities`）、`src/app/layout.tsx`（フォント・themeColor・幅の枠）、`public/manifest.json`
- Create: `src/components/app/button.tsx`、`src/components/app/panel.tsx`、`src/lib/motion.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - Tailwind の色: `sky-top`・`sky-mid`・`meadow`・`leaf`・`leaf-dark`・`cta-from`・`cta-to`・`cta-edge`・`cream-edge`、フォント `font-display`
  - アニメーションのクラス: `animate-spru-bob`・`animate-spru-hop`・`animate-pop-in`・`animate-grow-out`・`animate-grow-in`・`animate-sparkle`（CSS変数 `--dx`・`--dy`）・`animate-pulse-soft`・`animate-bubble-in`
  - `@/components/app/button`: `appButtonVariants({ variant, size })`（variant: `cta`・`primary`・`cream`・`warning`・`locked`、size: `sm`・`md`・`lg`・`xl`・`icon`）、`AppButton`
  - `@/components/app/panel`: `Panel`（`HTMLAttributes<HTMLDivElement>` を受ける）
  - `@/lib/motion`: `prefersReducedMotion(): boolean`

- [ ] **Step 1: 色・文字・動きを入れる**

`src/app/globals.css` の `@theme inline { … }` の最後（`--radius-4xl` の行の下）に足す:

```css
  --font-display: var(--font-rounded);
  --color-sky-top: var(--sky-top);
  --color-sky-mid: var(--sky-mid);
  --color-meadow: var(--meadow);
  --color-leaf: var(--leaf);
  --color-leaf-dark: var(--leaf-dark);
  --color-cta-from: var(--cta-from);
  --color-cta-to: var(--cta-to);
  --color-cta-edge: var(--cta-edge);
  --color-cream-edge: var(--cream-edge);
```

`:root { … }` のコメントと色（`--background`〜`--ring`）を次に置き換える（`--chart-*`・`--radius`・`--sidebar-*` はそのまま残す）:

```css
  /* Spra Goと同じ空の雰囲気（company/spra/tane/docs/2026-10-14-game-foundation-design.md 4.4） */
  --background: #def4fb;
  --foreground: #3b3226;
  --card: #fffaf0;
  --card-foreground: #3b3226;
  --popover: #fffaf0;
  --popover-foreground: #3b3226;
  --primary: #3b7f26;
  --primary-foreground: #ffffff;
  --secondary: #fffaf0;
  --secondary-foreground: #3b3226;
  --muted: #efe5cf;
  --muted-foreground: #8a7a5a;
  --accent: #f2b632;
  --accent-foreground: #3b3226;
  --destructive: #e05a3a;
  --border: #e8dfcf;
  --input: #e8dfcf;
  --ring: #2b6fa3;
  --sky-top: #bfe7f7;
  --sky-mid: #def4fb;
  --meadow: #cdeeb0;
  --leaf: #5bb33e;
  --leaf-dark: #285a19;
  --cta-from: #ffb43d;
  --cta-to: #f28b1d;
  --cta-edge: #b8610f;
  --cream-edge: #e3d3b0;
```

`@layer base` の `body { @apply bg-background text-foreground; }` を次に置き換える:

```css
  body {
    @apply text-foreground;
    background: linear-gradient(var(--sky-top) 0%, var(--sky-mid) 55%, var(--meadow) 100%) fixed;
  }
```

`@layer utilities { … }` の中、既存の `character-bounce` の定義はそのまま残し（Task 10 で消す）、その下に足す:

```css
  @keyframes spru-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .animate-spru-bob { animation: spru-bob 2.4s ease-in-out infinite; }

  @keyframes spru-hop {
    0% { transform: translateY(0); }
    30% { transform: translateY(-18px); }
    55% { transform: translateY(0); }
    75% { transform: translateY(-6px); }
    100% { transform: translateY(0); }
  }
  .animate-spru-hop { animation: spru-hop 0.6s ease-out; }

  @keyframes pop-in {
    0% { transform: scale(0.3); opacity: 0; }
    60% { transform: scale(1.12); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-pop-in { animation: pop-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }

  @keyframes grow-out {
    to { transform: scale(0); opacity: 0; }
  }
  .animate-grow-out { animation: grow-out 0.35s ease-in forwards; }

  @keyframes grow-in {
    0% { transform: scale(0) translateY(8px); opacity: 0; }
    60% { transform: scale(1.25) translateY(-4px); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .animate-grow-in { animation: grow-in 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }

  @keyframes sparkle {
    0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); opacity: 0; }
  }
  .animate-sparkle { animation: sparkle 0.8s ease-out forwards; }

  @keyframes pulse-soft {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .animate-pulse-soft { animation: pulse-soft 1.6s ease-in-out infinite; }

  @keyframes bubble-in {
    0% { transform: scale(0.6) translateY(6px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .animate-bubble-in { animation: bubble-in 0.25s ease-out both; }

  @media (prefers-reduced-motion: reduce) {
    .animate-spru-bob,
    .animate-spru-hop,
    .animate-pop-in,
    .animate-grow-in,
    .animate-pulse-soft,
    .animate-bubble-in {
      animation: none !important;
    }
    .animate-sparkle,
    .animate-grow-out {
      display: none;
    }
  }
```

`src/app/layout.tsx`:
- `Hachi_Maru_Pop` の import と定義を消し、代わりに次を足す:

```tsx
import { Geist_Mono, M_PLUS_Rounded_1c, Zen_Maru_Gothic } from "next/font/google";

// 見出し・ロゴは Spra Go のロゴに近い太い丸文字（設計書4.4）
const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["800", "900"],
  subsets: ["latin"],
});
```

- `<html className=…>` の `${hachiMaruPop.variable}` を `${mPlusRounded.variable}` に変える
- `Zen_Maru_Gothic` の上のコメントを `// 本文は Zen Maru Gothic（設計書4.4）` の1行にする
- `viewport` を `export const viewport: Viewport = { themeColor: "#bfe7f7" };` にする
- `<body>` の className から `bg-background` を外し、`{children}` を幅の枠で包む:

```tsx
      <body className="flex min-h-full flex-col text-foreground">
        <SoundProvider>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
          <BgmRouter />
        </SoundProvider>
        <PwaRegister />
      </body>
```

`public/manifest.json` の `"background_color"` を `"#def4fb"`、`"theme_color"` を `"#bfe7f7"` にする。

- [ ] **Step 2: 部品を作る**

`src/lib/motion.ts`:

```ts
/** 動きを減らす設定。描画中ではなく、effect・操作のとき・クライアント専用の初期値で呼ぶ */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

`src/components/app/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// 下の縁を太くして立体に見せ、押すと沈む（Spra Go の AppButton と同じ作り）
export const appButtonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-display font-black transition-[transform,border-width] active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        cta: "border-b-[5px] border-cta-edge bg-linear-to-b from-cta-from to-cta-to text-white active:border-b-2",
        primary: "border-b-4 border-leaf-dark bg-primary text-primary-foreground active:border-b-2",
        cream: "border-2 border-b-4 border-cream-edge bg-card text-primary active:border-b-2",
        warning: "border-b-4 border-[#c98f12] bg-accent text-accent-foreground active:border-b-2",
        locked: "border-b-4 border-[#dccfb4] bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-10 px-3 text-sm",
        md: "h-12 px-5 text-base",
        lg: "h-14 px-6 text-xl",
        xl: "h-16 px-8 text-2xl",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "cream", size: "md" },
  }
);

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appButtonVariants> {}

export function AppButton({ className, variant, size, type = "button", ...props }: AppButtonProps) {
  return <button type={type} className={cn(appButtonVariants({ variant, size }), className)} {...props} />;
}
```

`src/components/app/panel.tsx`:

```tsx
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border-b-[6px] border-cream-edge bg-card p-4 text-card-foreground shadow-[0_8px_22px_rgba(40,70,90,0.16)]",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: 確かめる**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS。`npm run dev` で http://localhost:3001（3000は別のプロセスが使っているため、表示されたポートを使う）を開き、背景が空色のグラデーションになっていること、コンソールにフォントのエラーが出ていないことを見る（この時点の古い画面の見た目は崩れていてよい。Task 9・10 で置き換える）

- [ ] **Step 4: コミット**

```bash
git add src/app/globals.css src/app/layout.tsx public/manifest.json src/components/app/button.tsx src/components/app/panel.tsx src/lib/motion.ts
git commit -m "feat: Spra Goと同じ空の色・丸文字・立体ボタン・パネル・動きの土台を追加"
```

---

### Task 8: ステージ選択画面（`/mode/[modeId]`）とタネが育つ演出

**Files:**
- Create: `src/lib/mode-params.ts`、`src/components/app/sound-toggle.tsx`、`src/components/app/top-bar.tsx`、`src/components/app/stars-row.tsx`、`src/components/mode/mode-tabs.tsx`、`src/components/mode/stage-card.tsx`、`src/components/mode/stage-grid.tsx`、`src/components/mode/grow-image.tsx`、`src/components/mode/mode-screen.tsx`、`src/components/mode/mode-screen-loader.tsx`、`src/app/mode/[modeId]/page.tsx`
- Test: `src/lib/mode-params.test.ts`

**Interfaces:**
- Consumes: Task 3 の `MODES`・`MODE_IDS`・`stagesOfMode`・`getStage`・`isModeId`・`playPath`・`PROBLEMS_PER_STAGE`・`Stage`・`ModeId`、Task 4 の `starsOf`・`isUnlocked`・`initialFocusStage`・`growthForStars`・`Stars`・`StarMap`、Task 5 の `useProgress`・`useSettings`・`updateSettings`、Task 6 の `useSound`・`growthImage`・`SPRU_POSES`・`STAGE_BADGES`・`SOUND_ICONS`、Task 7 の `AppButton`・`appButtonVariants`・`Panel`・`prefersReducedMotion`
- Produces:
  - `@/lib/mode-params`: `interface ModeSearch { requestedStageId?: string; grewStageId?: string; grewFrom?: Stars }`、`parseModeSearchParams(mode, searchParams): ModeSearch`、`modeHref(mode, options?: { stageId?: string; grew?: { stageId: string; from: Stars } }): string`
  - `@/components/app/sound-toggle`: `SoundToggle`（効果音とBGMをまとめてON/OFF）
  - `@/components/app/top-bar`: `TopBar({ title, backHref })`
  - `@/components/app/stars-row`: `StarsRow({ stars, size?: "sm" | "md" | "lg", animate?: boolean })`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/mode-params.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { modeHref, parseModeSearchParams } from "@/lib/mode-params";

describe("parseModeSearchParams", () => {
  it("同じあそびのステージだけを受け付ける", () => {
    expect(parseModeSearchParams("add", { stage: "add-4" })).toEqual({ requestedStageId: "add-4" });
    expect(parseModeSearchParams("add", { stage: "sub-3" })).toEqual({});
    expect(parseModeSearchParams("add", { stage: "add-99" })).toEqual({});
  });

  it("grew と from を読み、from は0〜2以外なら0", () => {
    expect(parseModeSearchParams("add", { stage: "add-5", grew: "add-4", from: "1" })).toEqual({
      requestedStageId: "add-5",
      grewStageId: "add-4",
      grewFrom: 1,
    });
    expect(parseModeSearchParams("add", { grew: "add-4", from: "9" })).toEqual({ grewStageId: "add-4", grewFrom: 0 });
    expect(parseModeSearchParams("add", { grew: "flash-1" })).toEqual({});
  });

  it("同じ名前が2つ来たら最初を使う", () => {
    expect(parseModeSearchParams("add", { stage: ["add-2", "add-3"] })).toEqual({ requestedStageId: "add-2" });
  });
});

describe("modeHref", () => {
  it("指定が無ければ /mode/<あそび>", () => {
    expect(modeHref("mul")).toBe("/mode/mul");
  });

  it("stage と grew を付ける", () => {
    expect(modeHref("add", { stageId: "add-5", grew: { stageId: "add-4", from: 0 } })).toBe(
      "/mode/add?stage=add-5&grew=add-4&from=0"
    );
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/mode-params.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: URLの読み書きを実装する**

`src/lib/mode-params.ts`:

```ts
import { getStage, type ModeId } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";

export interface ModeSearch {
  requestedStageId?: string;
  grewStageId?: string;
  grewFrom?: Stars;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseModeSearchParams(mode: ModeId, searchParams: SearchParams): ModeSearch {
  const inMode = (id: string | undefined) => {
    const stage = id ? getStage(id) : undefined;
    return stage && stage.mode === mode ? stage.id : undefined;
  };
  const requestedStageId = inMode(first(searchParams.stage));
  const grewStageId = inMode(first(searchParams.grew));
  const from = Number(first(searchParams.from));
  const grewFrom: Stars = from === 1 || from === 2 ? from : 0;

  return {
    ...(requestedStageId ? { requestedStageId } : {}),
    ...(grewStageId ? { grewStageId, grewFrom } : {}),
  };
}

export function modeHref(
  mode: ModeId,
  options: { stageId?: string; grew?: { stageId: string; from: Stars } } = {}
): string {
  const query = new URLSearchParams();
  if (options.stageId) query.set("stage", options.stageId);
  if (options.grew) {
    query.set("grew", options.grew.stageId);
    query.set("from", String(options.grew.from));
  }
  const text = query.toString();
  return text ? `/mode/${mode}?${text}` : `/mode/${mode}`;
}
```

Run: `npx vitest run src/lib/mode-params.test.ts`
Expected: PASS

- [ ] **Step 4: 共通の部品を作る**

`src/components/app/sound-toggle.tsx`:

```tsx
"use client";

import Image from "next/image";

import { appButtonVariants } from "@/components/app/button";
import { updateSettings, useSettings } from "@/lib/settings-store";
import { SOUND_ICONS } from "@/lib/spru-images";

export function SoundToggle() {
  const { se, bgm } = useSettings();
  const on = se || bgm;
  return (
    <button
      type="button"
      aria-label={on ? "おとを けす" : "おとを だす"}
      aria-pressed={on}
      onClick={() => updateSettings({ se: !on, bgm: !on })}
      className={appButtonVariants({ variant: "cream", size: "icon" })}
    >
      <Image src={on ? SOUND_ICONS.on : SOUND_ICONS.off} alt="" width={30} height={30} />
    </button>
  );
}
```

`src/components/app/top-bar.tsx`:

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { SoundToggle } from "@/components/app/sound-toggle";

export function TopBar({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 pt-3">
      <Link href={backHref} aria-label="もどる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
        <ArrowLeft className="h-6 w-6" strokeWidth={3} />
      </Link>
      <h1 className="rounded-xl border-b-4 border-leaf-dark bg-primary px-6 py-1.5 font-display text-xl font-black tracking-wider text-primary-foreground">
        {title}
      </h1>
      <SoundToggle />
    </header>
  );
}
```

`src/components/app/stars-row.tsx`:

```tsx
import type { Stars } from "@/lib/game/stars";
import { cn } from "@/lib/utils";

const SIZE = { sm: "text-[10px]", md: "text-xl", lg: "text-4xl" } as const;

export function StarsRow({
  stars,
  size = "md",
  animate = false,
}: {
  stars: Stars;
  size?: keyof typeof SIZE;
  animate?: boolean;
}) {
  return (
    <span className={cn("inline-flex leading-none", SIZE[size])} role="img" aria-label={`ほし ${stars}こ`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden
          className={cn(n <= stars ? "text-accent" : "text-cream-edge", animate && n <= stars && "animate-pop-in")}
          style={animate ? { animationDelay: `${n * 180}ms` } : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 5: ステージ選択の部品を作る**

`src/components/mode/mode-tabs.tsx`:

```tsx
import Link from "next/link";

import { MODE_IDS, MODES, type ModeId } from "@/data/stages/catalog";
import { cn } from "@/lib/utils";

export function ModeTabs({ current }: { current: ModeId }) {
  return (
    <nav aria-label="あそび" className="flex justify-center gap-1.5 px-3 py-2">
      {MODE_IDS.map((id) => (
        <Link
          key={id}
          href={`/mode/${id}`}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-full px-2.5 py-1 font-display text-[11px] font-black",
            id === current ? "bg-primary text-primary-foreground" : "bg-card text-primary"
          )}
        >
          {MODES[id].label}
        </Link>
      ))}
    </nav>
  );
}
```

`src/components/mode/grow-image.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { useSound } from "@/components/app/sound-provider";
import type { SpruColor } from "@/data/stages/colors";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { prefersReducedMotion } from "@/lib/motion";
import { growthImage } from "@/lib/spru-images";

const SPARKLES = [
  { dx: -26, dy: -30 },
  { dx: 24, dy: -34 },
  { dx: -34, dy: -4 },
  { dx: 32, dy: -6 },
  { dx: -14, dy: -42 },
  { dx: 12, dy: -44 },
];
const SWAP_MS = 450;

/** 前の育ち具合が縮んで消え、次の育ち具合が弾むように出てキラキラが散る */
export function GrowImage({ color, from, to }: { color: SpruColor; from: Stars; to: Stars }) {
  const { play } = useSound();
  // この部品は ssr: false の画面の中でだけ使うので、初期値で window を見てよい
  const [phase, setPhase] = useState<"before" | "after">(() => (prefersReducedMotion() ? "after" : "before"));

  useEffect(() => {
    play("coin");
  }, [play]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = setTimeout(() => setPhase("after"), SWAP_MS);
    return () => clearTimeout(timer);
  }, []);

  if (phase === "before") {
    return (
      <Image
        key="before"
        src={growthImage(color, growthForStars(from))}
        alt=""
        width={56}
        height={70}
        className="h-14 w-auto animate-grow-out object-contain"
      />
    );
  }
  return (
    <span className="relative flex h-14 items-end justify-center">
      <Image
        key="after"
        src={growthImage(color, growthForStars(to))}
        alt=""
        width={56}
        height={70}
        className="h-14 w-auto animate-grow-in object-contain"
      />
      {SPARKLES.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 animate-sparkle rounded-full bg-accent"
          style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, animationDelay: `${i * 30}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}
```

`src/components/mode/stage-card.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Crown, Lock } from "lucide-react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import { PROBLEMS_PER_STAGE, type Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { SPRU_POSES, STAGE_BADGES } from "@/lib/spru-images";

interface StageCardProps {
  stage: Stage;
  total: number;
  stars: Stars;
  unlocked: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onStart: () => void;
}

export function StageCard({ stage, total, stars, unlocked, onPrev, onNext, onStart }: StageCardProps) {
  return (
    <Panel className="relative mx-4 mt-7 pt-6">
      <span className="absolute -top-3 left-4 rounded-full bg-accent px-3 py-0.5 font-display text-xs font-black text-accent-foreground">
        ステージ {stage.number} / {total}
      </span>
      <Image
        src={unlocked ? SPRU_POSES.cheer : STAGE_BADGES.locked}
        alt=""
        width={64}
        height={88}
        priority
        className="absolute -top-10 -right-2 h-auto w-16 animate-spru-bob"
      />
      <h2 className="flex items-center justify-center gap-1 font-display text-xl font-black">
        {stage.isBoss && <Crown className="h-5 w-5 text-accent" fill="currentColor" aria-label="ボス" />}
        {stage.name}
      </h2>
      <p className="text-center text-sm font-bold text-muted-foreground">
        {stage.description} ・ {PROBLEMS_PER_STAGE}もん
      </p>
      <p className="mt-1 text-center">
        <StarsRow stars={stars} />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <AppButton size="icon" aria-label="まえのステージ" onClick={onPrev} disabled={!onPrev}>
          <ChevronLeft className="h-6 w-6" strokeWidth={3} />
        </AppButton>
        <AppButton
          variant={unlocked ? "cta" : "locked"}
          size="lg"
          className="flex-1"
          onClick={onStart}
          disabled={!unlocked}
        >
          {unlocked ? (
            "はじめる！"
          ) : (
            <>
              <Lock className="h-5 w-5" /> まだ ひらいてないよ
            </>
          )}
        </AppButton>
        <AppButton size="icon" aria-label="つぎのステージ" onClick={onNext} disabled={!onNext}>
          <ChevronRight className="h-6 w-6" strokeWidth={3} />
        </AppButton>
      </div>
      {!unlocked && (
        <p className="mt-2 text-center text-xs font-bold text-muted-foreground">まえのステージを クリアしてね</p>
      )}
    </Panel>
  );
}
```

`src/components/mode/stage-grid.tsx`:

```tsx
"use client";

import Image from "next/image";
import { Crown } from "lucide-react";

import { StarsRow } from "@/components/app/stars-row";
import { GrowImage } from "@/components/mode/grow-image";
import type { Stage } from "@/data/stages/catalog";
import { isUnlocked, starsOf, type StarMap } from "@/lib/game/progression";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

interface StageGridProps {
  stages: readonly Stage[];
  stars: StarMap;
  focusedId: string;
  grew?: { stageId: string; from: Stars };
  onSelect: (stageId: string) => void;
}

export function StageGrid({ stages, stars, focusedId, grew, onSelect }: StageGridProps) {
  return (
    <ul className="grid grid-cols-4 gap-2 px-4 pt-5 pb-6">
      {stages.map((stage, index) => {
        const earned = starsOf(stars, stage.id);
        const unlocked = isUnlocked(stage, stars);
        const focused = stage.id === focusedId;
        const growing = grew?.stageId === stage.id;
        return (
          <li key={stage.id} className="animate-pop-in" style={{ animationDelay: `${index * 35}ms` }}>
            <button
              type="button"
              onClick={() => onSelect(stage.id)}
              aria-label={`ステージ${stage.number} ${stage.name}${unlocked ? "" : "（まだ ひらいてない）"}`}
              aria-current={focused ? "true" : undefined}
              className={cn(
                "relative flex h-20 w-full items-end justify-center rounded-2xl pb-1 transition active:translate-y-[2px]",
                unlocked ? "bg-card/80" : "bg-white/40",
                focused && "ring-[3px] ring-accent"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 rounded-md px-1.5 font-display text-[10px] font-black text-white",
                  unlocked ? "bg-primary" : "bg-[#9aa39a]"
                )}
              >
                {stage.number}
              </span>
              {stage.isBoss && (
                <Crown className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-accent" fill="currentColor" />
              )}
              {earned > 0 && (
                <span className="absolute top-1 right-1">
                  <StarsRow stars={earned} size="sm" animate={growing} />
                </span>
              )}
              {!unlocked ? (
                <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#7fa38a]">
                  ?
                </span>
              ) : growing && grew ? (
                <GrowImage color={stage.color} from={grew.from} to={earned} />
              ) : (
                <Image
                  src={growthImage(stage.color, growthForStars(earned))}
                  alt=""
                  width={56}
                  height={70}
                  className={cn("w-auto object-contain", earned === 0 ? "h-9" : "h-14")}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

`src/components/mode/mode-screen.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { TopBar } from "@/components/app/top-bar";
import { ModeTabs } from "@/components/mode/mode-tabs";
import { StageCard } from "@/components/mode/stage-card";
import { StageGrid } from "@/components/mode/stage-grid";
import { MODES, playPath, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { initialFocusStage, isUnlocked, starsOf } from "@/lib/game/progression";
import { modeHref, type ModeSearch } from "@/lib/mode-params";
import { useProgress } from "@/lib/progress-store";

export function ModeScreen({ modeId, requestedStageId, grewStageId, grewFrom }: { modeId: ModeId } & ModeSearch) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const stages = stagesOfMode(modeId);
  const [focusedId, setFocusedId] = useState(() => initialFocusStage(modeId, stars, requestedStageId).id);
  const [grew] = useState(() => (grewStageId ? { stageId: grewStageId, from: grewFrom ?? 0 } : undefined));

  // 戻る・再読み込みで育つ演出がくり返されないよう、URL から grew を消す（画面は作り直さない）
  useEffect(() => {
    if (grewStageId) {
      window.history.replaceState(null, "", modeHref(modeId, { stageId: requestedStageId }));
    }
  }, [grewStageId, modeId, requestedStageId]);

  const index = stages.findIndex((stage) => stage.id === focusedId);
  const stage = stages[index];
  const unlocked = isUnlocked(stage, stars);

  function start() {
    play("select");
    router.push(playPath(stage));
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title={MODES[modeId].label} backHref="/" />
      <ModeTabs current={modeId} />
      <StageCard
        stage={stage}
        total={stages.length}
        stars={starsOf(stars, stage.id)}
        unlocked={unlocked}
        onPrev={index > 0 ? () => setFocusedId(stages[index - 1].id) : undefined}
        onNext={index < stages.length - 1 ? () => setFocusedId(stages[index + 1].id) : undefined}
        onStart={start}
      />
      <StageGrid stages={stages} stars={stars} focusedId={focusedId} grew={grew} onSelect={setFocusedId} />
    </main>
  );
}
```

`src/components/mode/mode-screen-loader.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

import type { ModeId } from "@/data/stages/catalog";
import type { ModeSearch } from "@/lib/mode-params";

// 最初に見せるステージは localStorage の★で決まるため、サーバーでは描かない
const ModeScreen = dynamic(() => import("@/components/mode/mode-screen").then((mod) => mod.ModeScreen), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export function ModeScreenLoader(props: { modeId: ModeId } & ModeSearch) {
  return <ModeScreen {...props} />;
}
```

`src/app/mode/[modeId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { ModeScreenLoader } from "@/components/mode/mode-screen-loader";
import { isModeId } from "@/data/stages/catalog";
import { parseModeSearchParams } from "@/lib/mode-params";

export default async function ModePage({
  params,
  searchParams,
}: {
  params: Promise<{ modeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { modeId } = await params;
  if (!isModeId(modeId)) notFound();
  const search = parseModeSearchParams(modeId, await searchParams);
  // あそびを切り替えたら、選んでいるステージを引き継がずに作り直す
  return <ModeScreenLoader key={modeId} modeId={modeId} {...search} />;
}
```

- [ ] **Step 6: 自動テスト・型・lint・ビルド**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 7: 画面で確かめる（Playwright）**

作業用フォルダ（`/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/<セッションID>/scratchpad`。無ければ `npm init -y && npm i playwright@1 && npx playwright install chromium`）に `check-mode.mjs` を作り、`npm run dev` のポート（例: 3001）を引数で渡して動かす:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(base);
await page.evaluate(() =>
  localStorage.setItem("tane:progress:v1", JSON.stringify({ stars: { "add-1": 3, "add-2": 2, "add-3": 1 }, titleSeen: true }))
);

// 1. 開いているいちばん後ろ（add-4）がカードに出る
await page.goto(`${base}/mode/add`);
await page.getByText("ステージ 4 / 12").waitFor();
await page.screenshot({ path: "mode-add.png" });

// 2. ‹ › で切り替わる。鍵のステージは始められない
await page.getByLabel("つぎのステージ").click();
await page.getByText("ステージ 5 / 12").waitFor();
if (!(await page.getByRole("button", { name: /まだ ひらいてないよ/ }).isDisabled())) throw new Error("鍵のステージが押せる");

// 3. タブで切り替わる
await page.getByRole("link", { name: "ひきざん" }).click();
await page.getByText("ステージ 1 / 12").waitFor();

// 4. 育つ演出のあと、URL から grew が消える
await page.goto(`${base}/mode/add?stage=add-4&grew=add-3&from=0`);
await page.waitForTimeout(1500);
await page.screenshot({ path: "mode-grew.png" });
if (page.url().includes("grew=")) throw new Error(`grew が残っている: ${page.url()}`);

// 5. 違うあそびの stage は無視、知らないあそびは404
await page.goto(`${base}/mode/add?stage=sub-3`);
await page.getByText("ステージ 4 / 12").waitFor();
const res = await page.goto(`${base}/mode/foo`);
if (res.status() !== 404) throw new Error(`/mode/foo が ${res.status()}`);

// 6. はじめる！でプレイ画面へ
await page.goto(`${base}/mode/add`);
await page.getByRole("button", { name: "はじめる！" }).click();
await page.waitForURL(/\/stage\/add-4$/);

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-mode.mjs http://localhost:3001`
Expected: `OK`。`mode-add.png`・`mode-grew.png` を開き、空の背景・クリーム色のカード・オレンジの「はじめる！」・4列のタネの一覧になっていること、`mode-grew.png` でステージ3が芽に育っていることを目で確かめる（Task 10 まではプレイ画面に `add-4` が無く「ステージが見つかりません」と出るが、URLが変われば合格）

- [ ] **Step 8: コミット**

```bash
git add src/lib/mode-params.ts src/lib/mode-params.test.ts src/components/app/sound-toggle.tsx src/components/app/top-bar.tsx src/components/app/stars-row.tsx src/components/mode "src/app/mode"
git commit -m "feat: あそびごとのステージ選択画面と、タネが育つ演出を追加"
```

---

### Task 9: ホーム（Spruのにわ）と初回のタイトル

**Files:**
- Create: `src/data/spru-lines.ts`、`src/components/app/bottom-nav.tsx`、`src/components/home/title-screen.tsx`、`src/components/home/home-hud.tsx`、`src/components/home/garden.tsx`、`src/components/home/continue-button.tsx`、`src/components/home/mode-buttons.tsx`、`src/components/home/home-screen.tsx`、`src/components/home/home-screen-loader.tsx`
- Modify: `src/app/page.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: Task 3〜8 の各部品（`continueTarget`・`gardenFriends`・`friendsCount`・`totalStars`・`modeStarSummary`・`isChallengeUnlocked`・`CHALLENGE_UNLOCK_STARS`・`useProgress`・`markTitleSeen`・`useSound`・`AppButton`・`appButtonVariants`・`SoundToggle`・`growthImage`・`SPRU_POSES`）
- Produces:
  - `@/components/app/bottom-nav`: `BottomNav`（あそぶ `/`・なかま `/friends`・せってい `/settings`）
  - `@/data/spru-lines`: `SPRU_LINES: readonly string[]`

- [ ] **Step 1: 部品を作る**

`src/data/spru-lines.ts`:

```ts
// Spruの声は、くだけた友だち口調（company/spra/spra-theme の方針）
export const SPRU_LINES: readonly string[] = [
  "きょうも そだてよう！",
  "いっしょに がんばろ！",
  "つぎは どのタネに する？",
  "★3で おはなが さくよ！",
  "はやく とけたら かっこいい！",
  "なかまが ふえてきたね！",
];
```

`src/components/app/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flower2, Gamepad2, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "あそぶ", Icon: Gamepad2 },
  { href: "/friends", label: "なかま", Icon: Flower2 },
  { href: "/settings", label: "せってい", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メニュー"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-cream-edge bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md justify-around">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 w-20 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-black",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`src/components/home/title-screen.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { markTitleSeen } from "@/lib/progress-store";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

const ROW = [
  { src: growthImage("spru", "seed"), width: 44 },
  { src: growthImage("spru", "sprout"), width: 56 },
  { src: SPRU_POSES.front, width: 110 },
  { src: growthImage("spru", "flower"), width: 66 },
];

export function TitleScreen() {
  const { play } = useSound();
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden pt-16">
      <div
        aria-hidden
        className="absolute -inset-x-10 -bottom-32 h-80 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_20%,#8fd16a,#5bb33e_60%,#3b7f26)]"
      />
      <h1 className="font-display text-6xl font-black tracking-wide text-primary">
        T<span className="text-cta-to">a</span>ne
      </h1>
      <p className="mt-1 font-display text-sm font-black">けいさんの タネを そだてよう</p>
      <div className="relative mt-12 flex items-end gap-1">
        {ROW.map((item, i) => (
          <Image
            key={item.src}
            src={item.src}
            alt=""
            width={item.width}
            height={Math.round(item.width * 1.4)}
            priority
            className="h-auto animate-pop-in"
            style={{ width: item.width, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <AppButton
        variant="cta"
        size="xl"
        className="relative mt-auto mb-24 w-4/5 animate-pulse-soft"
        onClick={() => {
          play("select");
          markTitleSeen();
        }}
      >
        はじめる
      </AppButton>
    </main>
  );
}
```

`src/components/home/home-hud.tsx`:

```tsx
import { Sprout, Star } from "lucide-react";

import { SoundToggle } from "@/components/app/sound-toggle";
import { friendsCount, totalStars, type StarMap } from "@/lib/game/progression";

export function HomeHud({ stars }: { stars: StarMap }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-3">
      <p className="mr-auto font-display text-2xl font-black text-primary">
        T<span className="text-cta-to">a</span>ne
      </p>
      <span className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        <Star className="h-4 w-4 text-accent" fill="currentColor" aria-label="ほし" /> {totalStars(stars)}
      </span>
      <span className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        <Sprout className="h-4 w-4 text-leaf" aria-label="なかま" /> {friendsCount(stars)}
      </span>
      <SoundToggle />
    </header>
  );
}
```

`src/components/home/garden.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { SPRU_LINES } from "@/data/spru-lines";
import { gardenFriends, starsOf, type StarMap } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

// 育てたSpruを置く場所（左右に交互、手前ほど小さく）
const SLOTS = [
  { left: "6%", top: 112, width: 52 },
  { right: "6%", top: 108, width: 52 },
  { left: "24%", top: 146, width: 42 },
  { right: "24%", top: 148, width: 42 },
  { left: "1%", top: 162, width: 40 },
  { right: "1%", top: 164, width: 40 },
  { left: "38%", top: 178, width: 34 },
  { right: "38%", top: 180, width: 34 },
] as const;

export function Garden({ stars }: { stars: StarMap }) {
  const { play } = useSound();
  const [hops, setHops] = useState(0);
  const [line, setLine] = useState(0);
  const friends = gardenFriends(stars);

  function talk() {
    play("select");
    setHops((n) => n + 1);
    setLine((n) => (n + 1) % SPRU_LINES.length);
  }

  return (
    <section aria-label="Spruの にわ" className="relative h-60 overflow-hidden">
      <div
        aria-hidden
        className="absolute -inset-x-10 -bottom-28 h-52 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_20%,#8fd16a,#5bb33e_60%,#3b7f26)]"
      />
      {friends.map((stage, i) => {
        const slot = SLOTS[i];
        return (
          <Image
            key={stage.id}
            src={growthImage(stage.color, growthForStars(starsOf(stars, stage.id)))}
            alt=""
            width={slot.width}
            height={Math.round(slot.width * 1.35)}
            className="absolute h-auto animate-spru-bob"
            style={{
              left: "left" in slot ? slot.left : undefined,
              right: "right" in slot ? slot.right : undefined,
              top: slot.top,
              width: slot.width,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        );
      })}
      <button
        type="button"
        onClick={talk}
        aria-label="Spruに はなしかける"
        className="absolute top-5 left-1/2 -translate-x-1/2"
      >
        {/* 跳ねる動きと揺れる動きは transform がぶつかるので、別の要素に分ける */}
        <span key={hops} className={hops > 0 ? "block animate-spru-hop" : "block"}>
          <Image
            src={SPRU_POSES.cheer}
            alt=""
            width={110}
            height={152}
            priority
            className="h-auto w-[110px] animate-spru-bob"
          />
        </span>
      </button>
      <p
        key={line}
        role="status"
        className="absolute top-3 left-3 max-w-[42%] animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black shadow-[0_2px_0_var(--cream-edge)]"
      >
        {SPRU_LINES[line]}
      </p>
    </section>
  );
}
```

`src/components/home/continue-button.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { MODES, playPath, type ModeId } from "@/data/stages/catalog";
import { continueTarget, type StarMap } from "@/lib/game/progression";

export function ContinueButton({ stars, lastModeId }: { stars: StarMap; lastModeId?: ModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const stage = continueTarget(stars, lastModeId);
  return (
    <AppButton
      variant="cta"
      className="h-[72px] w-full flex-col gap-0 leading-tight"
      onClick={() => {
        play("select");
        router.push(playPath(stage));
      }}
    >
      <span className="flex items-center gap-1 text-2xl">
        つづきから <Play className="h-6 w-6" fill="currentColor" />
      </span>
      <span className="text-xs font-bold tracking-normal">
        {MODES[stage.mode].label} ステージ{stage.number} ・ {stage.name}
      </span>
    </AppButton>
  );
}
```

`src/components/home/mode-buttons.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Timer, Zap } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { MODE_IDS, MODES } from "@/data/stages/catalog";
import { CHALLENGE_UNLOCK_STARS, isChallengeUnlocked, modeStarSummary, type StarMap } from "@/lib/game/progression";
import { cn } from "@/lib/utils";

const NOTICE_MS = 2000;
const TILE = "h-16 flex-col gap-0 px-1 text-xs";

export function ModeButtons({ stars }: { stars: StarMap }) {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengeOpen = isChallengeUnlocked(stars);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function showChallengeNotice() {
    setNotice(challengeOpen ? "もうすぐ あそべるよ！" : `★を ${CHALLENGE_UNLOCK_STARS}こ あつめると ひらくよ`);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }

  return (
    <section aria-label="あそびを えらぶ" className="relative mt-4 grid grid-cols-3 gap-2 px-4">
      {MODE_IDS.map((id) => {
        const summary = modeStarSummary(id, stars);
        return (
          <Link key={id} href={`/mode/${id}`} className={cn(appButtonVariants({ variant: "cream" }), TILE)}>
            <span className="text-2xl leading-none">{MODES[id].symbol ?? <Zap className="h-6 w-6" fill="currentColor" />}</span>
            {MODES[id].label}
            <span className="text-[10px] text-[#c98a1b]">
              ★ {summary.earned}/{summary.max}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={showChallengeNotice}
        className={cn(appButtonVariants({ variant: challengeOpen ? "warning" : "locked" }), TILE)}
      >
        <Timer className="h-6 w-6" />
        チャレンジ
        <span className="text-[10px]">{challengeOpen ? "ひらいた！" : `★${CHALLENGE_UNLOCK_STARS}で ひらくよ`}</span>
      </button>
      {notice && (
        <p
          role="status"
          className="absolute -top-10 right-4 animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black shadow"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
```

`src/components/home/home-screen.tsx`:

```tsx
"use client";

import { BottomNav } from "@/components/app/bottom-nav";
import { ContinueButton } from "@/components/home/continue-button";
import { Garden } from "@/components/home/garden";
import { HomeHud } from "@/components/home/home-hud";
import { ModeButtons } from "@/components/home/mode-buttons";
import { TitleScreen } from "@/components/home/title-screen";
import { useProgress } from "@/lib/progress-store";

export function HomeScreen() {
  const { stars, lastModeId, titleSeen } = useProgress();
  if (!titleSeen) return <TitleScreen />;
  return (
    <main className="flex flex-1 flex-col pb-24">
      <HomeHud stars={stars} />
      <Garden stars={stars} />
      <div className="px-4">
        <ContinueButton stars={stars} lastModeId={lastModeId} />
      </div>
      <ModeButtons stars={stars} />
      <BottomNav />
    </main>
  );
}
```

`src/components/home/home-screen-loader.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

// タイトルを出すかどうかが localStorage で決まるため、サーバーでは描かない（ちらつき防止）
const HomeScreen = dynamic(() => import("@/components/home/home-screen").then((mod) => mod.HomeScreen), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export function HomeScreenLoader() {
  return <HomeScreen />;
}
```

`src/app/page.tsx` を置き換える:

```tsx
import { HomeScreenLoader } from "@/components/home/home-screen-loader";

export default function HomePage() {
  return <HomeScreenLoader />;
}
```

- [ ] **Step 2: 自動テスト・型・lint・ビルド**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 3: 画面で確かめる（Playwright）**

作業用フォルダに `check-home.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// 1. 初回はタイトル
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole("button", { name: "はじめる" }).waitFor();
await page.screenshot({ path: "title.png" });

// 2. はじめる → ホーム。つづきからは たしざん ステージ1
await page.getByRole("button", { name: "はじめる" }).click();
await page.getByText("たしざん ステージ1 ・ こたえが5まで").waitFor();
await page.screenshot({ path: "home-empty.png" });

// 3. 2回目はタイトルが出ない
await page.reload();
await page.getByText("つづきから").waitFor();

// 4. 記録があると にわ に並び、つづきからが進む
await page.evaluate(() =>
  localStorage.setItem(
    "tane:progress:v1",
    JSON.stringify({ stars: { "add-1": 3, "add-2": 2, "add-3": 1, "sub-1": 3 }, lastModeId: "add", titleSeen: true })
  )
);
await page.reload();
await page.getByText("たしざん ステージ4").waitFor();
await page.screenshot({ path: "home-garden.png" });

// 5. Spruをタップすると吹き出しが変わる
const before = await page.getByRole("status").first().textContent();
await page.getByLabel("Spruに はなしかける").click();
const after = await page.getByRole("status").first().textContent();
if (before === after) throw new Error("吹き出しが変わらない");

// 6. チャレンジは鍵のお知らせ、あそびボタンはステージ選択へ
await page.getByRole("button", { name: /チャレンジ/ }).click();
await page.getByText("★を 30こ あつめると ひらくよ").waitFor();
await page.getByRole("link", { name: /ひきざん/ }).click();
await page.waitForURL(/\/mode\/sub$/);

// 7. つづきからで、すぐプレイ画面へ
await page.goto(base);
await page.getByRole("button", { name: /つづきから/ }).click();
await page.waitForURL(/\/stage\/add-4$/);

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-home.mjs http://localhost:3001`
Expected: `OK`。`title.png`・`home-empty.png`・`home-garden.png` を開き、設計の見本Bに近い配置（上の帯・にわ・オレンジの「つづきから」・3列×2段のあそびボタン・下のメニュー）で、文字が重なったり切れたりしていないことを目で確かめる。にわのSpruの位置が丘からはみ出すなら `SLOTS` の `top` を調整する

- [ ] **Step 4: コミット**

```bash
git add src/data/spru-lines.ts src/components/app/bottom-nav.tsx src/components/home src/app/page.tsx
git commit -m "feat: Spruのにわ・つづきから・あそびボタンのホームと、初回のタイトル画面を追加"
```

---

### Task 10: プレイ画面を新しいステージの表と★につなぎ、見た目を空に合わせる

**Files:**
- Create: `src/lib/result-links.ts`、`src/components/play/play-header.tsx`、`src/components/play/stage-result.tsx`、`src/components/play/stage-not-found.tsx`、`src/components/play/feedback-text.tsx`
- Modify: `src/components/stage-player.tsx`（全体を置き換え）、`src/components/flash-stage-player.tsx`（全体を置き換え）、`src/components/numeric-keypad.tsx:33-45`、`src/app/globals.css`（`character-bounce` を消す）
- Delete: `src/data/problems/`、`src/lib/game/problem-generator.ts`、`src/lib/game/problem-generator.test.ts`、`src/lib/game/progress.ts`、`src/lib/game/progress.test.ts`、`src/lib/storage.ts`、`src/components/stage-list-section.tsx`、`src/components/spru-character.tsx`
- Test: `src/lib/result-links.test.ts`

**Interfaces:**
- Consumes: Task 1 の `generateProblems`・`Problem`・`Operator`、Task 2 の `generateFlashStageProblems`・`FlashProblem`、Task 3 の `getStage`・`nextStageInMode`・`PROBLEMS_PER_STAGE`・`Stage`・`ArithmeticStage`・`FlashStage`、Task 4 の `starsForResult`・`mistakesOf`・`Stars`、Task 5 の `recordStageResult`・`rememberLastMode`、Task 6 の `useSound`・`SPRU_POSES`、Task 7 の `AppButton`・`appButtonVariants`・`Panel`、Task 8 の `modeHref`・`StarsRow`
- Produces:
  - `@/lib/result-links`: `interface ResultLinks { nextHref?: string; backHref: string }`、`resultLinks(stage, outcome: { cleared: boolean; improved: boolean; before: Stars }): ResultLinks`
  - `@/components/play/stage-result`: `interface StageOutcome { stars: Stars; improved: boolean; before: Stars }`、`StageResult({ stage, cleared, correctCount, total, outcome, onRetry })`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/result-links.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getStage } from "@/data/stages/catalog";
import { resultLinks } from "@/lib/result-links";

describe("resultLinks", () => {
  it("★が上がったクリアは、次へ・もどるの両方に育つ演出を付ける", () => {
    expect(resultLinks(getStage("add-3")!, { cleared: true, improved: true, before: 1 })).toEqual({
      nextHref: "/mode/add?stage=add-4&grew=add-3&from=1",
      backHref: "/mode/add?stage=add-3&grew=add-3&from=1",
    });
  });

  it("★が上がらなかったクリアは、演出を付けない", () => {
    expect(resultLinks(getStage("add-3")!, { cleared: true, improved: false, before: 3 })).toEqual({
      nextHref: "/mode/add?stage=add-4",
      backHref: "/mode/add?stage=add-3",
    });
  });

  it("失敗は次へが無く、演出も付けない", () => {
    expect(resultLinks(getStage("sub-2")!, { cleared: false, improved: false, before: 0 })).toEqual({
      backHref: "/mode/sub?stage=sub-2",
    });
  });

  it("ボスをクリアしても次へは無い", () => {
    expect(resultLinks(getStage("flash-6")!, { cleared: true, improved: true, before: 0 }).nextHref).toBeUndefined();
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/result-links.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 結果のリンクを実装する**

`src/lib/result-links.ts`:

```ts
import { nextStageInMode, type Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";

export interface ResultLinks {
  nextHref?: string;
  backHref: string;
}

export function resultLinks(
  stage: Stage,
  outcome: { cleared: boolean; improved: boolean; before: Stars }
): ResultLinks {
  const grew = outcome.cleared && outcome.improved ? { stageId: stage.id, from: outcome.before } : undefined;
  const next = outcome.cleared ? nextStageInMode(stage) : undefined;
  return {
    ...(next ? { nextHref: modeHref(stage.mode, { stageId: next.id, grew }) } : {}),
    backHref: modeHref(stage.mode, { stageId: stage.id, grew }),
  };
}
```

Run: `npx vitest run src/lib/result-links.test.ts`
Expected: PASS

- [ ] **Step 4: プレイ画面の共通部品を作る**

`src/components/play/play-header.tsx`:

```tsx
import Link from "next/link";
import { X } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { HpGauge } from "@/components/hp-gauge";
import { INITIAL_HP } from "@/lib/game/hp";

export function PlayHeader({ backHref, hp, index, total }: { backHref: string; hp: number; index: number; total: number }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-3">
      <Link href={backHref} aria-label="やめる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
        <X className="h-6 w-6" strokeWidth={3} />
      </Link>
      <HpGauge value={hp} max={INITIAL_HP} />
      <span className="ml-auto rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        {index} / {total}
      </span>
    </header>
  );
}
```

`src/components/play/feedback-text.tsx`:

```tsx
import { cn } from "@/lib/utils";

export type Feedback = "correct" | "incorrect" | null;

export function FeedbackText({ feedback }: { feedback: Feedback }) {
  return (
    <p
      key={feedback ?? "none"}
      aria-live="polite"
      className={cn(
        "h-8 font-display text-2xl font-black",
        feedback === "correct" && "animate-pop-in text-primary",
        feedback === "incorrect" && "animate-pop-in text-destructive"
      )}
    >
      {feedback === "correct" ? "せいかい！" : feedback === "incorrect" ? "おしい！" : " "}
    </p>
  );
}

export function poseFor(feedback: Feedback): "happy" | "sad" | "think" {
  return feedback === "correct" ? "happy" : feedback === "incorrect" ? "sad" : "think";
}
```

`src/components/play/stage-not-found.tsx`:

```tsx
import Link from "next/link";

import { appButtonVariants } from "@/components/app/button";

export function StageNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="font-display text-lg font-black">ステージが みつかりません</p>
      <Link href="/" className={appButtonVariants({ variant: "cta", size: "lg" })}>
        ホームへ もどる
      </Link>
    </main>
  );
}
```

`src/components/play/stage-result.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import type { Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { resultLinks } from "@/lib/result-links";
import { SPRU_POSES } from "@/lib/spru-images";

export interface StageOutcome {
  stars: Stars;
  improved: boolean;
  before: Stars;
}

interface StageResultProps {
  stage: Stage;
  cleared: boolean;
  correctCount: number;
  total: number;
  outcome: StageOutcome;
  onRetry: () => void;
}

export function StageResult({ stage, cleared, correctCount, total, outcome, onRetry }: StageResultProps) {
  const links = resultLinks(stage, { cleared, improved: outcome.improved, before: outcome.before });
  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image
          src={cleared ? SPRU_POSES.cheer : SPRU_POSES.sad}
          alt=""
          width={120}
          height={160}
          priority
          className="h-36 w-auto animate-pop-in"
        />
        <h1 className="font-display text-3xl font-black">{cleared ? "ステージクリア！" : "ざんねん…"}</h1>
        {cleared && <StarsRow stars={outcome.stars} size="lg" animate />}
        <p className="font-bold">
          {correctCount} / {total} もん せいかい
        </p>
        {cleared && outcome.improved && (
          <p className="font-display text-sm font-black text-primary">タネが そだったよ！ みにいこう</p>
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        {cleared ? (
          links.nextHref && (
            <Link href={links.nextHref} className={appButtonVariants({ variant: "cta", size: "xl" })}>
              つぎのステージへ
            </Link>
          )
        ) : (
          <AppButton variant="cta" size="xl" onClick={onRetry}>
            もういちど
          </AppButton>
        )}
        <Link href={links.backHref} className={appButtonVariants({ variant: "cream", size: "lg" })}>
          もどる
        </Link>
      </div>
    </main>
  );
}
```

`src/components/numeric-keypad.tsx` の `<button … className="…">` を次に変える（import に `import { appButtonVariants } from "@/components/app/button";` と `import { cn } from "@/lib/utils";` を足す）:

```tsx
        <button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          disabled={disabled || (key === "OK" && !canSubmit(value))}
          className={cn(appButtonVariants({ variant: key === "OK" ? "cta" : "cream", size: "lg" }), "w-full")}
        >
          {key}
        </button>
```

- [ ] **Step 5: 四則演算のプレイ画面を置き換える**

`src/components/stage-player.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { PlayHeader } from "@/components/play/play-header";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { getStage, PROBLEMS_PER_STAGE, type ArithmeticStage } from "@/data/stages/catalog";
import { generateProblems, type Operator, type Problem } from "@/lib/game/problem-rules";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { mistakesOf, starsForResult } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";
import { recordStageResult, rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";

const FEEDBACK_DELAY_MS = 600;

const OPERATOR_SYMBOL: Record<Operator, string> = { add: "＋", sub: "−", mul: "×", div: "÷" };

function newStage(stage: ArithmeticStage): StageState<Problem> {
  return createStage(generateProblems(stage.rule, PROBLEMS_PER_STAGE));
}

export function StagePlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "arithmetic" ? found : undefined;
  const { play } = useSound();

  // 問題は Math.random で作るため、StagePlayerLoader が ssr: false・key={stageId} で読み込む
  const [state, setState] = useState<StageState<Problem> | null>(() => (stage ? newStage(stage) : null));
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [outcome, setOutcome] = useState<StageOutcome | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage) rememberLastMode(stage.mode);
  }, [stage]);

  if (!stage || !state) return <StageNotFound />;
  const current = stage;

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || state.status !== "in-progress") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        const stars = starsForResult(next.status, mistakesOf(next));
        const { improved, before } = recordStageResult(current.id, stars);
        setOutcome({ stars, improved, before });
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    setState(newStage(current));
    setOutcome(null);
    setInputValue("");
  }

  if (state.status !== "in-progress" && outcome) {
    return (
      <StageResult
        stage={current}
        cleared={state.status === "cleared"}
        correctCount={state.correctCount}
        total={state.problems.length}
        outcome={outcome}
        onRetry={retry}
      />
    );
  }

  const problem = currentProblem(state);

  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <Panel className="mx-4 flex flex-1 flex-col items-center justify-center gap-2">
        <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        {problem && (
          <p className="font-display text-4xl font-black tracking-wide">
            {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
          </p>
        )}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} disabled={feedback !== null} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: フラッシュのプレイ画面を置き換える**

`src/components/flash-stage-player.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { PlayHeader } from "@/components/play/play-header";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { getStage, PROBLEMS_PER_STAGE, type FlashStage } from "@/data/stages/catalog";
import { generateFlashStageProblems, type FlashProblem } from "@/lib/game/flash-problem";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { mistakesOf, starsForResult } from "@/lib/game/stars";
import { modeHref } from "@/lib/mode-params";
import { recordStageResult, rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { useFlashSequence } from "@/lib/use-flash-sequence";

const FEEDBACK_DELAY_MS = 600;

// useFlashSequence に毎回新しい [] を渡すと effect の依存が毎回変わり、表示が止まらなくなる
const EMPTY_SEQUENCE: number[] = [];

function formatFlashNumber(value: number, index: number): string {
  if (index === 0) return String(value);
  return value >= 0 ? `+${value}` : String(value);
}

function newStage(stage: FlashStage): StageState<FlashProblem> {
  return createStage(generateFlashStageProblems(stage.rule, PROBLEMS_PER_STAGE));
}

export function FlashStagePlayer({ stageId }: { stageId: string }) {
  const found = getStage(stageId);
  const stage = found?.kind === "flash" ? found : undefined;
  const { play } = useSound();

  // 問題は Math.random で作るため、FlashStagePlayerLoader が ssr: false・key={stageId} で読み込む
  const [state, setState] = useState<StageState<FlashProblem> | null>(() => (stage ? newStage(stage) : null));
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [outcome, setOutcome] = useState<StageOutcome | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage) rememberLastMode(stage.mode);
  }, [stage]);

  const problem = state && state.status === "in-progress" ? currentProblem(state) : null;
  const flash = useFlashSequence(
    problem?.sequence ?? EMPTY_SEQUENCE,
    stage?.rule.stepMs ?? 0,
    stage?.rule.gapMs ?? 0
  );

  if (!stage || !state) return <StageNotFound />;
  const current = stage;

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || flash.phase !== "answering") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        const stars = starsForResult(next.status, mistakesOf(next));
        const { improved, before } = recordStageResult(current.id, stars);
        setOutcome({ stars, improved, before });
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    setState(newStage(current));
    setOutcome(null);
    setInputValue("");
  }

  if (state.status !== "in-progress" && outcome) {
    return (
      <StageResult
        stage={current}
        cleared={state.status === "cleared"}
        correctCount={state.correctCount}
        total={state.problems.length}
        outcome={outcome}
        onRetry={retry}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <Panel className="mx-4 flex flex-1 flex-col items-center justify-center gap-2">
        <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        {flash.phase === "flashing" ? (
          <p className="flex h-24 items-center font-display text-6xl font-black">
            {flash.currentNumber !== null ? formatFlashNumber(flash.currentNumber, flash.index) : " "}
          </p>
        ) : (
          <>
            <p className="font-display text-2xl font-black">ぜんぶで いくつ？</p>
            <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
              {inputValue || " "}
            </p>
          </>
        )}
        <FeedbackText feedback={feedback} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null || flash.phase !== "answering"}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: 使わなくなったファイルを消す**

```bash
git rm -r src/data/problems src/lib/game/problem-generator.ts src/lib/game/problem-generator.test.ts src/lib/game/progress.ts src/lib/game/progress.test.ts src/lib/storage.ts src/components/stage-list-section.tsx src/components/spru-character.tsx
grep -rn "problem-generator\|data/problems\|lib/storage\|stage-list-section\|spru-character\|game/progress\"\|font-hachi\|character-bounce" src || echo "参照なし"
```

`src/app/globals.css` の `@layer utilities` から `@keyframes character-bounce`・`.animate-character-bounce` と、それに対応する `prefers-reduced-motion` のブロックを消す。

Expected: grep の結果は `参照なし`（globals.css を直したあと）

- [ ] **Step 8: 自動テスト・型・lint・ビルド**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 9: 画面で確かめる（Playwright）**

作業用フォルダに `check-play.mjs` を作る（問題の数字を画面から読んで答える。フラッシュは表示された数を集めて足す）:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

async function typeAnswer(n) {
  for (const d of String(n)) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await page.waitForTimeout(700);
}

await page.goto(base);
await page.evaluate(() => localStorage.setItem("tane:progress:v1", JSON.stringify({ stars: {}, titleSeen: true })));

// 1. たしざん1を全問正解 → ★3 → もどる で育つ演出
await page.goto(`${base}/stage/add-1`);
for (let i = 0; i < 20; i++) {
  const text = await page.locator("main p").filter({ hasText: "＝" }).first().textContent();
  const [a, b] = text.match(/\d+/g).map(Number);
  if (i === 0) await page.screenshot({ path: "play-add.png" });
  await typeAnswer(a + b);
}
await page.getByText("ステージクリア！").waitFor();
await page.screenshot({ path: "result-clear.png" });
await page.getByRole("link", { name: "つぎのステージへ" }).click();
await page.waitForURL(/\/mode\/add\?stage=add-2/);
await page.waitForTimeout(1500);
await page.screenshot({ path: "after-clear-grew.png" });
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("tane:progress:v1")).stars["add-1"]);
if (stored !== 3) throw new Error(`★が ${stored}`);

// 2. 5回まちがえると失敗 → もういちど で最初から
await page.goto(`${base}/stage/add-2`);
for (let i = 0; i < 5; i++) await typeAnswer(9999);
await page.getByText("ざんねん…").waitFor();
await page.getByRole("button", { name: "もういちど" }).click();
await page.getByText("1 / 20").waitFor();

// 3. フラッシュ1を1問解く（表示された数を集める）
await page.goto(`${base}/flash/flash-1`);
const seen = [];
while (!(await page.getByText("ぜんぶで いくつ？").isVisible())) {
  const t = (await page.locator("main p.text-6xl").textContent().catch(() => ""))?.trim();
  if (t && /^[+-]?\d+$/.test(t) && seen.at(-1) !== t) seen.push(t);
  await page.waitForTimeout(50);
}
await page.screenshot({ path: "play-flash.png" });
await typeAnswer(seen.reduce((s, v) => s + Number(v), 0));
await page.getByText("2 / 20").waitFor();

// 4. 種類違い・知らないステージ
for (const url of ["/stage/flash-1", "/flash/add-1", "/stage/add-99"]) {
  await page.goto(base + url);
  await page.getByText("ステージが みつかりません").waitFor();
}

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-play.mjs http://localhost:3001`
Expected: `OK`。`play-add.png`・`result-clear.png`・`after-clear-grew.png`・`play-flash.png` を開き、空の背景・クリーム色のパネル・立体のキーで、黒板・木の色が残っていないことを確かめる

- [ ] **Step 10: コミット**

```bash
git add -A src
git status --short   # 意図しないファイルが入っていないか確かめる
git commit -m "feat: プレイ画面を54ステージの表と★につなぎ、結果からタネの成長へ戻る流れにする"
```

---

### Task 11: なかま・せってい

**Files:**
- Create: `src/components/app/confirm-dialog.tsx`、`src/components/friends/friends-screen.tsx`、`src/components/settings/settings-screen.tsx`、`src/app/friends/page.tsx`、`src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `MODE_IDS`・`MODES`・`stagesOfMode`・`STAGES`、`friendsCount`・`starsOf`、`growthForStars`、`useProgress`・`resetProgress`、`useSettings`・`updateSettings`、`growthImage`、`AppButton`・`Panel`、`BottomNav`
- Produces: `@/components/app/confirm-dialog`: `ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel })`

- [ ] **Step 1: 確認ダイアログを作る**

`src/components/app/confirm-dialog.tsx`:

```tsx
"use client";

import { useEffect } from "react";

import { AppButton } from "@/components/app/button";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        className="w-full max-w-sm animate-pop-in rounded-3xl bg-card p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="confirm-message" className="text-center font-display text-lg font-black">
          {message}
        </p>
        <div className="mt-4 flex gap-3">
          <AppButton className="flex-1" onClick={onCancel} autoFocus>
            {cancelLabel}
          </AppButton>
          <AppButton variant="warning" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: なかまの画面を作る**

`src/components/friends/friends-screen.tsx`:

```tsx
"use client";

import Image from "next/image";

import { BottomNav } from "@/components/app/bottom-nav";
import { MODE_IDS, MODES, STAGES, stagesOfMode } from "@/data/stages/catalog";
import { friendsCount, starsOf } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { useProgress } from "@/lib/progress-store";
import { growthImage } from "@/lib/spru-images";

export function FriendsScreen() {
  const { stars } = useProgress();
  return (
    <main className="flex flex-1 flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-4">
        <h1 className="font-display text-2xl font-black text-primary">なかま</h1>
        <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
          {friendsCount(stars)} / {STAGES.length}
        </span>
      </header>
      {MODE_IDS.map((mode) => (
        <section key={mode} aria-labelledby={`friends-${mode}`} className="px-4 pt-4">
          <h2 id={`friends-${mode}`} className="mb-2 font-display text-lg font-black">
            {MODES[mode].label}
          </h2>
          <ul className="grid grid-cols-4 gap-2">
            {stagesOfMode(mode).map((stage) => {
              const earned = starsOf(stars, stage.id);
              return (
                <li key={stage.id} className="relative flex h-24 flex-col items-center justify-end rounded-2xl bg-card/80 p-1">
                  {earned > 0 ? (
                    <>
                      <Image
                        src={growthImage(stage.color, growthForStars(earned))}
                        alt=""
                        width={56}
                        height={70}
                        className="h-14 w-auto object-contain"
                      />
                      <span className="line-clamp-1 text-[10px] font-bold">{stage.name}</span>
                    </>
                  ) : (
                    <>
                      <Image
                        src={growthImage(stage.color, "flower")}
                        alt=""
                        width={56}
                        height={70}
                        className="h-14 w-auto object-contain opacity-15 brightness-0"
                      />
                      <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#c9bfa8]">
                        ?
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <BottomNav />
    </main>
  );
}
```

`src/app/friends/page.tsx`:

```tsx
import { FriendsScreen } from "@/components/friends/friends-screen";

export default function FriendsPage() {
  return <FriendsScreen />;
}
```

- [ ] **Step 3: せっていの画面を作る**

`src/components/settings/settings-screen.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { BottomNav } from "@/components/app/bottom-nav";
import { AppButton } from "@/components/app/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Panel } from "@/components/app/panel";
import { resetProgress } from "@/lib/progress-store";
import { updateSettings, useSettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between font-display font-black">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-8 w-14 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left]",
            checked ? "left-7" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { se, bgm } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const closeDialog = useCallback(() => setConfirming(false), []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
      <h1 className="font-display text-2xl font-black text-primary">せってい</h1>
      <Panel className="flex flex-col gap-4">
        <ToggleRow label="こうかおん" checked={se} onChange={(value) => updateSettings({ se: value })} />
        <ToggleRow label="BGM" checked={bgm} onChange={(value) => updateSettings({ bgm: value })} />
      </Panel>
      <Panel>
        <p className="text-sm font-bold">きろくを けすと、★と そだてた なかまが ぜんぶ なくなります。</p>
        <AppButton variant="warning" className="mt-3 w-full" onClick={() => setConfirming(true)}>
          きろくを けす
        </AppButton>
      </Panel>
      {confirming && (
        <ConfirmDialog
          message="ほんとうに けしますか？"
          confirmLabel="けす"
          cancelLabel="やめる"
          onConfirm={() => {
            resetProgress();
            router.push("/");
          }}
          onCancel={closeDialog}
        />
      )}
      <BottomNav />
    </main>
  );
}
```

`src/app/settings/page.tsx`:

```tsx
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return <SettingsScreen />;
}
```

- [ ] **Step 4: 自動テスト・型・lint・ビルド**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 5: 画面で確かめる（Playwright）**

作業用フォルダに `check-friends-settings.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3001";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(base);
await page.evaluate(() => {
  localStorage.setItem("tane:progress:v1", JSON.stringify({ stars: { "add-1": 3, "add-2": 1, "flash-1": 2 }, titleSeen: true }));
  localStorage.setItem("tane:settings:v1", JSON.stringify({ se: true, bgm: true }));
});

// なかま
await page.goto(`${base}/friends`);
await page.getByText("3 / 54").waitFor();
await page.screenshot({ path: "friends.png", fullPage: true });

// せってい: 切り替えが保存される
await page.goto(`${base}/settings`);
await page.getByRole("switch", { name: "BGM" }).click();
const settings = await page.evaluate(() => JSON.parse(localStorage.getItem("tane:settings:v1")));
if (settings.bgm !== false || settings.se !== true) throw new Error(JSON.stringify(settings));

// リセット: やめる では消えない、けす で消えてタイトルへ（音の設定は残る）
await page.getByRole("button", { name: "きろくを けす" }).click();
await page.getByRole("button", { name: "やめる" }).click();
if (!(await page.evaluate(() => localStorage.getItem("tane:progress:v1")))) throw new Error("やめるで消えた");
await page.getByRole("button", { name: "きろくを けす" }).click();
await page.getByRole("button", { name: "けす", exact: true }).click();
await page.waitForURL(`${base}/`);
await page.getByRole("button", { name: "はじめる" }).waitFor();
if (!(await page.evaluate(() => localStorage.getItem("tane:settings:v1")))) throw new Error("音の設定まで消えた");
await page.screenshot({ path: "settings-after-reset.png" });

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-friends-settings.mjs http://localhost:3001`
Expected: `OK`。`friends.png` で育てた3体と、それ以外のシルエットと「?」が並んでいることを確かめる

- [ ] **Step 6: コミット**

```bash
git add src/components/app/confirm-dialog.tsx src/components/friends src/components/settings src/app/friends src/app/settings
git commit -m "feat: 育てたSpruを並べる「なかま」と、音・記録の「せってい」を追加"
```

---

### Task 12: 通しの確認・記録・プッシュ

**Files:**
- Modify: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（末尾に追記）

- [ ] **Step 1: すべてのチェック**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 2: 通しの画面確認（Playwright）**

`npm run build && npx next start -p 3002` で本番と同じ形で起動し（Service Worker の確認のため）、作業用フォルダに `check-e2e.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3002";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// 1. 壊れた・古い記録があっても起動する
await page.goto(base);
await page.evaluate(() => {
  localStorage.setItem("tane:progress:v1", "{broken");
  localStorage.setItem("tane:cleared-stages", '["add-1"]');
  localStorage.setItem("tane:settings:v1", "nope");
});
await page.reload();
await page.getByRole("button", { name: "はじめる" }).waitFor();
await page.getByRole("button", { name: "はじめる" }).click();
await page.getByText("つづきから").waitFor();
if (await page.evaluate(() => localStorage.getItem("tane:cleared-stages"))) throw new Error("古いキーが残っている");

// 2. Service Worker が音声の Range 要求を横取りしない
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 }).catch(() => {});
await page.reload();
const status = await page.evaluate(() => fetch("/sounds/coin.mp3", { headers: { Range: "bytes=0-99" } }).then((r) => r.status));
if (status !== 206) throw new Error(`Range要求が ${status}`);

// 3. 動きを減らす設定で、育つ演出が止まって結果だけ出る
await page.emulateMedia({ reducedMotion: "reduce" });
await page.evaluate(() => localStorage.setItem("tane:progress:v1", JSON.stringify({ stars: { "add-1": 2 }, titleSeen: true })));
await page.goto(`${base}/mode/add?stage=add-1&grew=add-1&from=1`);
await page.waitForTimeout(300);
await page.screenshot({ path: "e2e-reduced-motion.png" });

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-e2e.mjs http://localhost:3002`、続けて Task 8〜11 の4つの確認スクリプトも `http://localhost:3002` で流す
Expected: すべて `OK`

BGMの確認は自動ではできないため、`npm run dev` の画面をブラウザで開き、手で確かめる:
- 初回: タイトルの「はじめる」でBGMが鳴る
- 再読み込み後（タイトルなし）: 画面のどこかをタップするとBGMが鳴り始める
- プレイ画面に入るとクイズ用の曲に変わり、戻るとホーム用に戻る
- せっていでBGMをOFFにすると止まり、ONで再開する。効果音OFFで正解の音が鳴らない

- [ ] **Step 3: 開発の記録に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` の末尾に、次の形で追記する（実際に起きたことに合わせて書く）:

```markdown

## 2026-10-14 ゲームの土台とトップ画面（分割1）

- 方針: Spra Go と同じ空の雰囲気、ホームは「Spruのにわ＋つづきから」、ステージは54（たし・ひき・かけ・わり各12、フラッシュ6）、★でタネが育つ
- 設計書: `2026-10-14-game-foundation-design.md`、実装計画: `docs/superpowers/plans/2026-10-14-tane-game-foundation.md`
- できたこと: （画面ごとに1行）
- 決めたこと・つまずいたこと: （実装中の判断と、その理由）
- 次: 分割2（コンボ・フィーバー・目標タイム・チャレンジ）
```

- [ ] **Step 4: プッシュ**

```bash
git push -u origin feature/game-foundation
```

（`master` へのマージは、最後のレビューのあと Owner に確認してから行う）
