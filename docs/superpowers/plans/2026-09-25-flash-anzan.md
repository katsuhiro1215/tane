# フラッシュ暗算モード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `projects/tane/frontend` に、既存の四則演算モードとは独立した「フラッシュ暗算」ゲームモード（たし算・ひき算混在数列、Lv.1〜3）を追加する。

**Architecture:** 既存の`lib/game/stage.ts`（HP管理・20問進行・クリア/失敗判定）を`T extends { answer: number }`のジェネリックにリファクタリングし、既存の四則演算モードと新規のフラッシュ暗算モードで共通利用する。フラッシュ暗算専用の問題生成（`lib/game/flash-problem.ts`）と数字の時間差表示エンジン（`lib/use-flash-sequence.ts`）を新規追加し、UI（HPゲージ・Spruキャラクター・数字キーボード・正誤フィードバック）は既存コンポーネントをそのまま再利用する。ルーティングは`/flash/[stageId]`として既存の`/stage/[stageId]`と並列に追加し、同じ`ssr:false + key={stageId}`パターンでSSR/ハイドレーション不一致を回避する。

**Tech Stack:** Next.js (App Router) / React / TypeScript / Tailwind CSS / Vitest（既存MVPと同一）

**Spec:** `company/spra/tane/docs/2026-09-25-flash-anzan-design.md`

## Global Constraints

- 対象演算はたし算・ひき算の混在数列のみ（かけ算・わり算のフラッシュは対象外）。
- 数字は1桁固定。レベルは3段階、数字の個数と表示速度のみ変化させる：Lv.1=3個/1200ms表示/300ms空白、Lv.2=4個/900ms表示/250ms空白、Lv.3=5個/700ms表示/200ms空白。
- 数列の最初の要素は必ず正の開始値。**途中の合計はどの時点でも0未満にならない**ように生成する。
- 既存の四則演算12ステージ（`add-1`等）とは**独立した新トラック**（id: `flash-1`〜`flash-3`）とする。
- 1ステージ = 20問、HP = 5、クリア/失敗判定は既存の四則演算モードと同じロジックを共有する。
- ゲームロジック（`lib/game/`配下）はUI非依存の純粋関数として実装し、Vitestでユニットテストする。UI・タイマー制御は手動確認のみでよい（既存プロジェクトの方針を踏襲）。
- ドキュメントは日本語で作成する。

## Review Focus

- 数列生成で途中合計が負になると、暗算として成立しない問題が出題される → Task 2で実乱数を使ったプロパティテストで保証する。
- 固定乱数のテストだけでは境界条件の破壊（境界を壊しても相関のせいでテストが通ってしまう）を検出できない（`problem-generator.test.ts`で実際に踏んだ教訓）→ Task 2は最初から実乱数ベースのテストを用意する。
- `useFlashSequence`のフォールバック値（問題がまだ無い時に渡す空配列）を呼び出し側で毎回新しいリテラル`[]`として渡すと、useEffectの依存配列が毎回変わり無限に再スケジュールされる（`storage.ts`の`getServerSnapshot`で実際に踏んだのと同種のバグ）→ Task 5でモジュールスコープの定数配列を使う。
- 存在しないflash stageId（URL直打ち）でアクセスするとクラッシュする可能性がある → Task 3で`getFlashStageById`が未知のIDに対して`undefined`を返すことをテストし、Task 5でUI側のフォールバック表示を実装する。
- フラッシュ表示中に数字キーボードが操作できてしまうと、数字を全部見る前に答えを入力できてしまい「見て覚える」という体験の核心が壊れる → Task 5で`disabled={flash.phase !== "answering"}`を実装し、動作確認時に明示的にチェックする。

---

## Task 1: `lib/game/stage.ts`のジェネリック化

**Files:**
- Modify: `projects/tane/frontend/src/lib/game/stage.ts`
- Modify: `projects/tane/frontend/src/components/stage-player.tsx`
- Test: `projects/tane/frontend/src/lib/game/stage.test.ts`（変更なし、既存テストが通ることで後方互換性を確認する）

**Interfaces:**
- Produces:
  - `type StageStatus = "in-progress" | "cleared" | "failed"`（変更なし）
  - `interface StageState<T extends { answer: number }> { problems: T[]; currentIndex: number; hp: number; correctCount: number; status: StageStatus }`
  - `createStage<T extends { answer: number }>(problems: T[]): StageState<T>`
  - `currentProblem<T extends { answer: number }>(state: StageState<T>): T`
  - `submitAnswer<T extends { answer: number }>(state: StageState<T>, answer: number): StageState<T>`

現在の`stage.ts`は`Problem`型に直接依存しているが、実際に使っているのは`.answer`プロパティのみ。ジェネリック化して四則演算・フラッシュ暗算の両方で共有する。

- [ ] **Step 1: 既存テストが green であることを確認する（ベースライン）**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- stage.test
```

Expected: PASS（8 tests）

- [ ] **Step 2: `stage.ts`をジェネリックにリファクタリングする**

`src/lib/game/stage.ts`の全体を以下に置き換える:

```typescript
import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";

export type StageStatus = "in-progress" | "cleared" | "failed";

export interface StageState<T extends { answer: number }> {
  problems: T[];
  currentIndex: number;
  hp: number;
  correctCount: number;
  status: StageStatus;
}

export function createStage<T extends { answer: number }>(problems: T[]): StageState<T> {
  if (problems.length === 0) {
    throw new Error("problems must not be empty");
  }
  return {
    problems,
    currentIndex: 0,
    hp: INITIAL_HP,
    correctCount: 0,
    status: "in-progress",
  };
}

export function currentProblem<T extends { answer: number }>(state: StageState<T>): T {
  return state.problems[state.currentIndex];
}

export function submitAnswer<T extends { answer: number }>(
  state: StageState<T>,
  answer: number
): StageState<T> {
  if (state.status !== "in-progress") {
    return state;
  }

  const problem = currentProblem(state);
  const correct = answer === problem.answer;
  const hp = correct ? state.hp : applyDamage(state.hp);
  const correctCount = correct ? state.correctCount + 1 : state.correctCount;
  const nextIndex = state.currentIndex + 1;

  // HPが0になった場合は、全問終了と同時であってもfailedを優先する。
  let status: StageStatus = "in-progress";
  if (isDefeated(hp)) {
    status = "failed";
  } else if (nextIndex >= state.problems.length) {
    status = "cleared";
  }

  return {
    problems: state.problems,
    currentIndex: nextIndex,
    hp,
    correctCount,
    status,
  };
}
```

- [ ] **Step 3: 既存テストを実行し、リファクタリングだけで振る舞いが変わっていないことを確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- stage.test
```

Expected: PASS（8 tests、Step 1と同じ結果）

- [ ] **Step 4: `stage-player.tsx`の型引数を更新する**

`src/components/stage-player.tsx`内の`useState<StageState | null>`を`useState<StageState<Problem> | null>`に変更する（`Problem`は既に`@/lib/game/problem-generator`からimport済み）。該当箇所（41行目）:

```typescript
  const [state, setState] = useState<StageState<Problem> | null>(() => {
```

- [ ] **Step 5: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 6: 全テストを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test
```

Expected: PASS（40 tests、既存分すべて）

- [ ] **Step 7: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/lib/game/stage.ts frontend/src/components/stage-player.tsx -A && git commit -m "refactor: stage.tsをジェネリック化し四則演算・フラッシュ暗算で共有できるようにする"
```

---

## Task 2: フラッシュ暗算の問題生成ロジック

**Files:**
- Create: `projects/tane/frontend/src/lib/game/flash-problem.ts`
- Test: `projects/tane/frontend/src/lib/game/flash-problem.test.ts`

**Interfaces:**
- Produces:
  - `interface FlashProblem { sequence: number[]; answer: number }`
  - `generateFlashProblem(level: number, rng?: () => number): FlashProblem`
  - `generateFlashStageProblems(level: number, count?: number, rng?: () => number): FlashProblem[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/flash-problem.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { generateFlashProblem, generateFlashStageProblems } from "@/lib/game/flash-problem";

describe("generateFlashProblem", () => {
  it("Lv.1は3個の数字を生成し、答えが数列の合計と一致する", () => {
    const problem = generateFlashProblem(1, () => 0.5);
    expect(problem.sequence).toHaveLength(3);
    const total = problem.sequence.reduce((sum, value) => sum + value, 0);
    expect(problem.answer).toBe(total);
  });

  it("Lv.2は4個、Lv.3は5個の数字を生成する", () => {
    expect(generateFlashProblem(2, () => 0.5).sequence).toHaveLength(4);
    expect(generateFlashProblem(3, () => 0.5).sequence).toHaveLength(5);
  });

  it("最初の数字は必ず正で1〜9の範囲", () => {
    const rngValues = [0, 0.1, 0.5, 0.9, 0.99];
    for (const rngValue of rngValues) {
      const problem = generateFlashProblem(1, () => rngValue);
      expect(problem.sequence[0]).toBeGreaterThanOrEqual(1);
      expect(problem.sequence[0]).toBeLessThanOrEqual(9);
    }
  });

  it("未対応のlevelを渡すとエラーになる", () => {
    expect(() => generateFlashProblem(4, () => 0)).toThrow();
  });
});

describe("generateFlashProblem (実際の乱数を通した検証)", () => {
  // 固定rngだと各要素が同じ乱数値から導出され相関してしまい、
  // 途中合計が負になる境界条件の破壊を検出できない
  // (problem-generator.test.tsで実際に踏んだ教訓)。実乱数で多数回検証する。
  const ITERATIONS = 2000;

  it("どのレベルでも、途中の合計がどの時点でも0未満にならない", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateFlashProblem(level);
        let runningTotal = 0;
        for (const value of problem.sequence) {
          runningTotal += value;
          expect(runningTotal).toBeGreaterThanOrEqual(0);
        }
        expect(problem.answer).toBe(runningTotal);
      }
    }
  });

  it("どのレベルでも、各数字の絶対値は1〜9の範囲に収まる", () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateFlashProblem(level);
        for (const value of problem.sequence) {
          expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(value)).toBeLessThanOrEqual(9);
        }
      }
    }
  });
});

describe("generateFlashStageProblems", () => {
  it("指定した問数ぶんの問題を生成する", () => {
    const problems = generateFlashStageProblems(1, 20, () => 0.5);
    expect(problems).toHaveLength(20);
    for (const problem of problems) {
      const total = problem.sequence.reduce((sum, value) => sum + value, 0);
      expect(problem.answer).toBe(total);
    }
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- flash-problem
```

Expected: FAIL（`Cannot find module '@/lib/game/flash-problem'`）

- [ ] **Step 3: 実装する**

`src/lib/game/flash-problem.ts`:

```typescript
export interface FlashProblem {
  sequence: number[];
  answer: number;
}

const LEVEL_LENGTH: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
};

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateFlashProblem(
  level: number,
  rng: () => number = Math.random
): FlashProblem {
  const length = LEVEL_LENGTH[level];
  if (!length) {
    throw new Error(`Unsupported level for flash: ${level}`);
  }

  const start = randomInt(1, 9, rng);
  const sequence: number[] = [start];
  let runningTotal = start;

  while (sequence.length < length) {
    // 合計が0のときに引き算を選ぶと負になってしまうため、必ず足し算にする。
    const isAddition = runningTotal === 0 ? true : rng() < 0.5;
    const magnitude = isAddition
      ? randomInt(1, 9, rng)
      : randomInt(1, Math.min(9, runningTotal), rng);
    const value = isAddition ? magnitude : -magnitude;

    runningTotal += value;
    sequence.push(value);
  }

  return { sequence, answer: runningTotal };
}

export function generateFlashStageProblems(
  level: number,
  count: number = 20,
  rng: () => number = Math.random
): FlashProblem[] {
  return Array.from({ length: count }, () => generateFlashProblem(level, rng));
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- flash-problem
```

Expected: PASS（7 tests）

- [ ] **Step 5: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/lib/game/flash-problem.ts frontend/src/lib/game/flash-problem.test.ts -A && git commit -m "feat: フラッシュ暗算の問題生成ロジックを実装"
```

---

## Task 3: フラッシュ暗算のステージ定義データ

**Files:**
- Create: `projects/tane/frontend/src/data/problems/flash-stages.ts`
- Test: `projects/tane/frontend/src/data/problems/flash-stages.test.ts`

**Interfaces:**
- Produces:
  - `interface FlashStageDefinition { id: string; level: number; title: string }`
  - `const FLASH_STAGES: FlashStageDefinition[]`
  - `getFlashStageById(id: string): FlashStageDefinition | undefined`
  - `getNextFlashStage(id: string): FlashStageDefinition | undefined`

- [ ] **Step 1: 失敗するテストを書く**

`src/data/problems/flash-stages.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { FLASH_STAGES, getFlashStageById, getNextFlashStage } from "@/data/problems/flash-stages";

describe("FLASH_STAGES", () => {
  it("3ステージ定義されている（Lv.1〜3）", () => {
    expect(FLASH_STAGES).toHaveLength(3);
  });

  it("idが重複しない", () => {
    const ids = FLASH_STAGES.map((stage) => stage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("既存の四則演算ステージとidが重複しない", () => {
    for (const stage of FLASH_STAGES) {
      expect(stage.id).toMatch(/^flash-/);
    }
  });
});

describe("getFlashStageById", () => {
  it("存在するidを渡すと該当ステージを返す", () => {
    const stage = getFlashStageById("flash-1");
    expect(stage?.level).toBe(1);
  });

  it("存在しないidを渡すとundefinedを返す", () => {
    expect(getFlashStageById("does-not-exist")).toBeUndefined();
  });
});

describe("getNextFlashStage", () => {
  it("次のステージを返す", () => {
    const next = getNextFlashStage(FLASH_STAGES[0].id);
    expect(next?.id).toBe(FLASH_STAGES[1].id);
  });

  it("最後のステージの場合はundefinedを返す", () => {
    const last = FLASH_STAGES[FLASH_STAGES.length - 1];
    expect(getNextFlashStage(last.id)).toBeUndefined();
  });

  it("存在しないidの場合はundefinedを返す", () => {
    expect(getNextFlashStage("does-not-exist")).toBeUndefined();
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- flash-stages
```

Expected: FAIL（`Cannot find module '@/data/problems/flash-stages'`）

- [ ] **Step 3: 実装する**

`src/data/problems/flash-stages.ts`:

```typescript
export interface FlashStageDefinition {
  id: string;
  level: number;
  title: string;
}

const LEVELS = [1, 2, 3];

export const FLASH_STAGES: FlashStageDefinition[] = LEVELS.map((level) => ({
  id: `flash-${level}`,
  level,
  title: `フラッシュ暗算 Lv.${level}`,
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

- [ ] **Step 4: テストを実行して成功を確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test -- flash-stages
```

Expected: PASS（7 tests）

- [ ] **Step 5: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/data/problems/flash-stages.ts frontend/src/data/problems/flash-stages.test.ts -A && git commit -m "feat: フラッシュ暗算のステージ定義データを追加"
```

---

## Task 4: 数字の時間差表示エンジン（useFlashSequence）

**Files:**
- Create: `projects/tane/frontend/src/lib/use-flash-sequence.ts`

**Interfaces:**
- Produces:
  - `type FlashPhase = "flashing" | "answering"`
  - `useFlashSequence(sequence: number[], stepMs: number, gapMs: number): { phase: FlashPhase; currentNumber: number | null; index: number }`

このフックはUI層（タイマー・DOM）であり、Vitestでの自動テスト対象外（プロジェクトの既存方針。`storage.ts`の`useSyncExternalStore`部分と同様）。Task 5での統合と手動確認で動作を確かめる。

- [ ] **Step 1: 実装する**

`src/lib/use-flash-sequence.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export type FlashPhase = "flashing" | "answering";

interface FlashSequenceState {
  phase: FlashPhase;
  currentNumber: number | null;
  index: number; // 現在表示中の要素のインデックス。表示していない間は-1
}

const INITIAL_STATE: FlashSequenceState = {
  phase: "flashing",
  currentNumber: null,
  index: -1,
};

export function useFlashSequence(
  sequence: number[],
  stepMs: number,
  gapMs: number
): FlashSequenceState {
  const [state, setState] = useState<FlashSequenceState>(INITIAL_STATE);

  useEffect(() => {
    // 全タイマーをマウント時にまとめて予約する。setStateはどれも
    // setTimeoutのコールバック内(非同期)で呼ばれ、エフェクト本体から
    // 同期的には呼ばない(react-hooks/set-state-in-effectを踏まないため。
    // storage.tsのuseSyncExternalStore移行時に学んだのと同種の注意点)。
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    setState(INITIAL_STATE);

    sequence.forEach((value, index) => {
      timeoutIds.push(
        setTimeout(() => {
          setState({ phase: "flashing", currentNumber: value, index });
        }, elapsed)
      );
      elapsed += stepMs;

      timeoutIds.push(
        setTimeout(() => {
          setState({ phase: "flashing", currentNumber: null, index });
        }, elapsed)
      );
      elapsed += gapMs;
    });

    timeoutIds.push(
      setTimeout(() => {
        setState({ phase: "answering", currentNumber: null, index: sequence.length });
      }, elapsed)
    );

    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [sequence, stepMs, gapMs]);

  return state;
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/lib/use-flash-sequence.ts -A && git commit -m "feat: フラッシュ暗算の数字時間差表示エンジンを実装"
```

---

## Task 5: フラッシュ暗算ステージ画面の統合

**Files:**
- Create: `projects/tane/frontend/src/components/flash-stage-player.tsx`

**Interfaces:**
- Consumes:
  - `StageState`, `createStage`, `currentProblem`, `submitAnswer` from `@/lib/game/stage`（Task 1でジェネリック化済み）
  - `FlashProblem`, `generateFlashStageProblems` from `@/lib/game/flash-problem`（Task 2）
  - `FlashStageDefinition`, `getFlashStageById`, `getNextFlashStage` from `@/data/problems/flash-stages`（Task 3）
  - `useFlashSequence` from `@/lib/use-flash-sequence`（Task 4）
  - `HpGauge` from `@/components/hp-gauge`
  - `growthStageFor`, `SpruCharacter` from `@/components/spru-character`
  - `NumericKeypad` from `@/components/numeric-keypad`
  - `INITIAL_HP` from `@/lib/game/hp`
  - `markStageCleared` from `@/lib/storage`
- Produces: `FlashStagePlayer({ stageId }: { stageId: string })`

- [ ] **Step 1: 実装する**

`src/components/flash-stage-player.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HpGauge } from "@/components/hp-gauge";
import { NumericKeypad } from "@/components/numeric-keypad";
import { growthStageFor, SpruCharacter } from "@/components/spru-character";
import { getFlashStageById, getNextFlashStage } from "@/data/problems/flash-stages";
import { generateFlashStageProblems, type FlashProblem } from "@/lib/game/flash-problem";
import { INITIAL_HP } from "@/lib/game/hp";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { markStageCleared } from "@/lib/storage";
import { useFlashSequence } from "@/lib/use-flash-sequence";

const FEEDBACK_DELAY_MS = 600;

const LEVEL_TIMING: Record<number, { stepMs: number; gapMs: number }> = {
  1: { stepMs: 1200, gapMs: 300 },
  2: { stepMs: 900, gapMs: 250 },
  3: { stepMs: 700, gapMs: 200 },
};

// useFlashSequenceのフォールバック引数に毎回新しいリテラル[]を渡すと、
// useEffectの依存配列が毎レンダー変わり無限に再スケジュールされてしまう
// (storage.tsのgetServerSnapshotで踏んだのと同種のバグ)。
// モジュールスコープの定数配列を使い参照を安定させる。
const EMPTY_SEQUENCE: number[] = [];

function formatFlashNumber(value: number, index: number): string {
  if (index === 0) {
    return String(value);
  }
  return value >= 0 ? `+${value}` : String(value);
}

export function FlashStagePlayer({ stageId }: { stageId: string }) {
  const router = useRouter();
  const stageDefinition = getFlashStageById(stageId);

  // 問題生成にはMath.randomを使うため、サーバー側でレンダーすると
  // クライアントと異なる問題が焼き込まれハイドレーション不一致になる。
  // このコンポーネントはFlashStagePlayerLoader経由でssr:falseかつ
  // key={stageId}付きでマウントされる(既存のStagePlayerと同じパターン)。
  const [state, setState] = useState<StageState<FlashProblem> | null>(() => {
    if (!stageDefinition) {
      return null;
    }
    const problems = generateFlashStageProblems(stageDefinition.level);
    return createStage(problems);
  });
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timing = stageDefinition ? LEVEL_TIMING[stageDefinition.level] : undefined;
  const problem =
    state && state.status === "in-progress" ? currentProblem(state) : null;
  const flash = useFlashSequence(
    problem?.sequence ?? EMPTY_SEQUENCE,
    timing?.stepMs ?? 0,
    timing?.gapMs ?? 0
  );

  if (!stageDefinition || !state) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p>ステージが見つかりません</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
        >
          ステージ一覧に戻る
        </button>
      </div>
    );
  }

  function handleSubmit() {
    if (!state || inputValue === "" || feedback !== null || flash.phase !== "answering") {
      return;
    }
    const currentProb = currentProblem(state);
    const isCorrect = Number(inputValue) === currentProb.answer;
    const next = submitAnswer(state, Number(inputValue));

    setFeedback(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status === "cleared") {
        markStageCleared(stageId);
      }
    }, FEEDBACK_DELAY_MS);
  }

  if (state.status !== "in-progress") {
    const nextStage = getNextFlashStage(stageId);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-40 w-40"
        />
        <p className="text-2xl font-bold">
          {state.status === "cleared" ? "ステージクリア！" : "また挑戦しよう！"}
        </p>
        <p>
          {state.correctCount} / {state.problems.length} 問正解
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-secondary px-6 py-3 text-secondary-foreground"
          >
            ステージ一覧に戻る
          </button>
          {state.status === "cleared" && nextStage && (
            <button
              type="button"
              onClick={() => router.push(`/flash/${nextStage.id}`)}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground"
            >
              次のステージへ
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex w-full items-center justify-between">
        <HpGauge value={state.hp} max={INITIAL_HP} />
        <span className="text-sm text-muted-foreground">
          {state.currentIndex + 1} / {state.problems.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <SpruCharacter
          stage={growthStageFor(state.correctCount, state.problems.length)}
          className="h-20 w-20 shrink-0"
        />

        {flash.phase === "flashing" ? (
          <p className="flex h-16 items-center text-5xl font-bold">
            {flash.currentNumber !== null
              ? formatFlashNumber(flash.currentNumber, flash.index)
              : " "}
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold">合計は？</p>
            <p className="h-10 text-4xl font-mono">{inputValue || " "}</p>
          </>
        )}

        <p
          className={`h-8 text-xl font-bold ${
            feedback === "correct"
              ? "text-emerald-600"
              : feedback === "incorrect"
                ? "text-rose-600"
                : "text-transparent"
          }`}
        >
          {feedback === "correct" ? "せいかい！" : feedback === "incorrect" ? "ざんねん" : " "}
        </p>
      </div>

      <div className="flex w-full justify-center pb-2">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null || flash.phase !== "answering"}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 3: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/components/flash-stage-player.tsx -A && git commit -m "feat: フラッシュ暗算ステージ画面を統合実装"
```

---

## Task 6: フラッシュ暗算のルーティング

**Files:**
- Create: `projects/tane/frontend/src/components/flash-stage-player-loader.tsx`
- Create: `projects/tane/frontend/src/app/flash/[stageId]/page.tsx`

**Interfaces:**
- Consumes: `FlashStagePlayer` from `@/components/flash-stage-player`（Task 5）
- Produces: `FlashStagePlayerLoader({ stageId }: { stageId: string })`

- [ ] **Step 1: `flash-stage-player-loader.tsx`を実装する**

```tsx
"use client";

import dynamic from "next/dynamic";

const FlashStagePlayer = dynamic(
  () => import("@/components/flash-stage-player").then((mod) => mod.FlashStagePlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function FlashStagePlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId}により、ステージを移動するたびに新しいインスタンスとして
  // 再マウントされる(既存のStagePlayerLoaderと同じパターン)。
  return <FlashStagePlayer key={stageId} stageId={stageId} />;
}
```

- [ ] **Step 2: `app/flash/[stageId]/page.tsx`を実装する**

```bash
mkdir -p /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend/src/app/flash/\[stageId\]
```

```tsx
import { FlashStagePlayerLoader } from "@/components/flash-stage-player-loader";

export default async function FlashStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <FlashStagePlayerLoader stageId={stageId} />;
}
```

- [ ] **Step 3: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 4: 開発サーバーで手動確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run dev
```

`http://localhost:3000/flash/flash-1` にアクセスし、以下を確認する:
- 数字が1つずつ、指定した速度で表示される（最初は素の数字、2つ目以降は`+3`のように符号付きで表示される）
- 表示中は数字キーボードが操作できない（`disabled`状態）
- 全部表示し終わると「合計は？」に切り替わり、キーパッドが有効になる
- 正解するとHPが減らず次の問題（新しい数列）に進む
- 存在しないステージID（例: `/flash/unknown`）で「ステージが見つかりません」と表示される

確認後 `Ctrl+C` でサーバーを止める。

- [ ] **Step 5: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/components/flash-stage-player-loader.tsx frontend/src/app/flash -A && git commit -m "feat: フラッシュ暗算のルーティングを追加"
```

---

## Task 7: トップ画面にフラッシュ暗算セクションを追加

**Files:**
- Create: `projects/tane/frontend/src/components/stage-list-section.tsx`
- Modify: `projects/tane/frontend/src/app/page.tsx`

**Interfaces:**
- Consumes:
  - `StageLike`, `isStageUnlocked` from `@/lib/game/progress`
  - `FLASH_STAGES` from `@/data/problems/flash-stages`（Task 3）
  - `STAGES` from `@/data/problems/stages`
  - `useClearedStageIds` from `@/lib/storage`
- Produces: `StageListSection({ title, stages, clearedIds, hrefPrefix }: StageListSectionProps)`

既存の`app/page.tsx`はステージ一覧描画のロジックを1つのセクション分だけ持っている。フラッシュ暗算セクションを追加するにあたり、重複を避けるため`StageListSection`コンポーネントとして切り出す。

- [ ] **Step 1: `stage-list-section.tsx`を実装する**

```tsx
"use client";

import Link from "next/link";

import { isStageUnlocked, type StageLike } from "@/lib/game/progress";

interface StageListItem extends StageLike {
  title: string;
}

export function StageListSection({
  title,
  stages,
  clearedIds,
  hrefPrefix,
}: {
  title: string;
  stages: StageListItem[];
  clearedIds: string[];
  hrefPrefix: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {stages.map((stage) => {
          const unlocked = isStageUnlocked(stage.id, stages, clearedIds);
          const cleared = clearedIds.includes(stage.id);
          return (
            <li key={stage.id}>
              {unlocked ? (
                <Link
                  href={`${hrefPrefix}/${stage.id}`}
                  className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-secondary-foreground"
                >
                  <span>{stage.title}</span>
                  {cleared && <span aria-label="クリア済み">✅</span>}
                </Link>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-muted-foreground">
                  <span>{stage.title}</span>
                  <span aria-label="未解放">🔒</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: `app/page.tsx`を書き換える**

```tsx
"use client";

import { StageListSection } from "@/components/stage-list-section";
import { FLASH_STAGES } from "@/data/problems/flash-stages";
import { STAGES } from "@/data/problems/stages";
import { useClearedStageIds } from "@/lib/storage";

export default function HomePage() {
  const clearedIds = useClearedStageIds();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Tane</h1>
      <StageListSection
        title="四則演算"
        stages={STAGES}
        clearedIds={clearedIds}
        hrefPrefix="/stage"
      />
      <StageListSection
        title="フラッシュ暗算"
        stages={FLASH_STAGES}
        clearedIds={clearedIds}
        hrefPrefix="/flash"
      />
    </main>
  );
}
```

- [ ] **Step 3: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 4: 開発サーバーで手動確認する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run dev
```

`http://localhost:3000/` にアクセスし、以下を確認する:
- 「四則演算」セクションに既存の12ステージが表示される（変更前と同じ挙動）
- 「フラッシュ暗算」セクションに3ステージが表示され、`flash-1`だけが解放されている
- `flash-1`をクリアすると、トップに戻ったときに`flash-2`が解放されている

確認後 `Ctrl+C` でサーバーを止める。

- [ ] **Step 5: コミットする**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git add frontend/src/components/stage-list-section.tsx frontend/src/app/page.tsx -A && git commit -m "feat: トップ画面にフラッシュ暗算セクションを追加"
```

---

## Task 8: 最終動作確認

**Files:** なし（既存ファイルの検証のみ）

- [ ] **Step 1: Lintを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run lint
```

Expected: エラーなし

- [ ] **Step 2: 型チェックを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run typecheck
```

Expected: エラーなし

- [ ] **Step 3: 全ユニットテストを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm test
```

Expected: 全テストPASS（既存分 + `flash-problem` + `flash-stages`）

- [ ] **Step 4: 本番ビルドを実行する**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane/frontend && npm run build
```

Expected: ビルドが成功する

- [ ] **Step 5: 縦向きサイズでPlaywright実機確認する**

Playwrightで縦向きスマホサイズ（390×844）のブラウザを起動し、`flash-1`を最後（20問）までクリアし、以下を確認する:
- コンソールエラーが出ないこと（特にハイドレーション不一致・useEffectの無限ループ警告が出ないこと）
- 「ステージクリア！」画面が表示され、「次のステージへ」ボタンで`flash-2`に遷移すること
- `localStorage`の`tane:cleared-stages`に`flash-1`が保存されること

- [ ] **Step 6: 最終コミット**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane && git status
```

Expected: 未コミットの変更がないことを確認する（あれば `git add -A && git commit -m "chore: フラッシュ暗算モードの最終調整"`）
