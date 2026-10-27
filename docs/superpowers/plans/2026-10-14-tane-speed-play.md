# Tane スピードのあるプレイ画面（分割2a） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プレイ画面に、ゲージ・フィーバー（紫のステージと仲間の応援）・点数と最高記録・★3の目標タイムを入れる。

**Architecture:** ルールは画面を含まない純粋関数（`play-session.ts`・`answer-clock.ts`・`stars.ts`）にまとめ、テストで固める。画面側は `useSpeedPlay` フックが「時間を測る→答えを渡す→フィーバーの曲を切り替える」をまとめ、四則演算とフラッシュの2つのプレイ画面で共有する。見た目の部品（ゲージ・点数・残り時間・飛び出す数字・コンボ・フィーバー）は `components/play/` に置く。

**Tech Stack:** Next.js 16.2.10（App Router）、React 19.2.4、TypeScript、Tailwind CSS v4、Vitest 3。画面の確認は Playwright（作業用フォルダに単体で入れる。リポジトリには入れない）。

**Spec:** `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-10-14-speed-play-design.md`（前提: `2026-10-14-game-foundation-design.md`）

**作業場所:** リポジトリは `projects/tane`（gitのルート）。コマンドはすべて `projects/tane/frontend` で実行する。作業ブランチ `feature/speed-play` を `master` から切る。

## Global Constraints

- ドキュメント・UIの文言・コメントは日本語。子ども向けの文言はひらがな中心（例: 「あと 3もん」「さいこうきろく！」「★3は つぎ がんばろう」）
- 新しい npm パッケージは追加しない
- アニメーションは CSS の keyframes（と数え上げの requestAnimationFrame）だけで作り、`prefers-reduced-motion: reduce` では止めて結果だけ出す
- ルールの数値（設計書2.1・2.2）は `src/lib/game/play-rules.ts` の定数にまとめる: ゲージ 正解+10・速い正解さらに+5・不正解−20・満タン100、フィーバー5問・点数2倍、1問100点＋速さの点0〜100、コンボ表示は3以上
- 目安の秒数は設計書2.5の表のとおり。目標タイム = 目安の秒数 × 20問
- ★3 = ミスなし かつ 答えにかかった時間の合計 ≤ 目標タイム。★1・★2は今のまま
- 時間は「問題が出てから OK を押すまで」。正解・不正解の演出中、フラッシュの数字が出ている間、ページが隠れている間は数えない
- 記録のキーは `tane:progress:v1` のまま。`best` が無い古い記録・壊れた値でも起動する
- `react-hooks/set-state-in-effect` などの lint に違反しない（effect の中で同期的に setState しない。ref を描画中に読まない）
- 絵文字を UI に使わない。コメントは理由が分かりにくいところだけに1行
- コミットはタスクの最後に1回。メッセージは既存の形（`feat: …` の日本語）で、最後に `Co-Authored-By: <実行するモデル名> <noreply@anthropic.com>`

## Review Focus

1. **フィーバー中の離脱・やり直し・終わり方**: フィーバー中に「やめる」・ブラウザの戻る・失敗→「もういちど」をしても、紫の画面とフィーバーの曲が残らないこと。最後の問題でフィーバーが終わっても曲がクイズ用に戻ること（Task 6 の `reset`、Task 7 の画面確認）
2. **ゆっくり解く子**: 目標タイムを過ぎてもプレイは止まらず、バーが灰色で「★3は つぎ がんばろう」、ミスなしなら★2と「あと ○びょう」が出ること（Task 2 の `missedThreeByMs` のテスト、Task 7 の時計を早送りする画面確認）
3. **タブを切り替える・席を立つ**: ページが隠れている間は時間が増えないこと（Task 4 の時計のテスト、Task 7 で `visibilitychange` を起こして確認）
4. **古い記録**: 分割1の記録（`best` が無い）・壊れた `best` でも起動し、★はそのまま残ること（Task 3 のテスト、Task 8 で古い形の記録を入れて起動）
5. **動きを減らす設定**: 揺れ・飛び出す数字・光の筋・数え上げが止まり、点数とフィーバーの状態は正しく出ること（Task 6 の CSS、Task 7 の画面確認）

---

## ファイル構成

| ファイル | 役割 | タスク |
|---|---|---|
| `src/lib/game/play-rules.ts` | ルールの定数 | 1 |
| `src/lib/game/play-session.ts` | 1回のプレイの状態と、1問答えたときの計算 | 1 |
| `src/lib/game/stars.ts` | ★に時間の条件を足す・「あと○びょう」 | 2 |
| `src/data/stages/catalog.ts` | 目安の秒数・目標タイム | 2 |
| `src/lib/progress-store.ts` | 最高点 `best` | 3 |
| `src/lib/game/answer-clock.ts` | 答えにかかった時間を測る時計（止める・再開） | 4 |
| `src/lib/bgm-route.ts`・`src/lib/sound-files.ts`・`public/sounds/` | フィーバーの曲 | 5 |
| `src/components/play/use-speed-play.ts` | 画面側のまとめ役のフック | 6 |
| `src/components/play/use-count-up.ts` | 数え上げ | 6 |
| `src/components/play/{speed-hud,gauge-bar,score-counter,time-bar,points-popup,combo-text,fever-stage,fever-friends}.tsx` | 見た目の部品 | 6 |
| `src/components/play/finish-stage.ts` | 終わったときの★・記録・結果の組み立て | 7 |
| `src/components/play/stage-result.tsx`・`stage-player.tsx`・`flash-stage-player.tsx` | 画面への組み込み | 7 |

---

### Task 0: 作業ブランチ

- [ ] **Step 1: ブランチを切る**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git status --short   # 何も出ないことを確認（出たら止めて報告）
git switch master && git pull
git switch -c feature/speed-play
cd frontend && npm test   # 161件が通ることを確認
```

---

### Task 1: ゲージ・フィーバー・点数の計算

**Files:**
- Create: `src/lib/game/play-rules.ts`、`src/lib/game/play-session.ts`
- Test: `src/lib/game/play-session.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `play-rules.ts`: `GAUGE_MAX = 100`、`GAUGE_CORRECT = 10`、`GAUGE_FAST_BONUS = 5`、`GAUGE_WRONG = -20`、`FEVER_PROBLEMS = 5`、`BASE_POINTS = 100`、`MAX_SPEED_POINTS = 100`、`FEVER_MULTIPLIER = 2`、`COMBO_SHOW_FROM = 3`、`FEVER_BANNER_MS = 800`
  - `play-session.ts`:
    - `interface PlaySession { gauge: number; feverLeft: number; score: number; combo: number; elapsedMs: number; answered: number }`
    - `INITIAL_SESSION: PlaySession`（すべて0）
    - `interface AnswerInput { correct: boolean; elapsedMs: number; secondsPerProblem: number; remainingAfter: number }`（`remainingAfter` = この問題のあとに残っている問題の数。ステージが終わったら0）
    - `interface AnswerOutcome { session: PlaySession; gained: number; inFever: boolean; feverStarted: boolean; feverEnded: boolean }`（`inFever` = この問題がフィーバー中に答えたものか）
    - `speedPoints(elapsedMs: number, secondsPerProblem: number): number`
    - `answer(session: PlaySession, input: AnswerInput): AnswerOutcome`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/play-session.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { answer, INITIAL_SESSION, speedPoints, type AnswerInput, type PlaySession } from "@/lib/game/play-session";

const SLOW = 9000; // 目安(4秒)より遅い
const FAST = 1000; // 目安より速い
const input = (correct: boolean, elapsedMs: number, remainingAfter = 10): AnswerInput => ({
  correct,
  elapsedMs,
  secondsPerProblem: 4,
  remainingAfter,
});

/** 何回か答えたあとの状態 */
function play(answers: AnswerInput[], from: PlaySession = INITIAL_SESSION) {
  let session = from;
  const outcomes = answers.map((a) => {
    const outcome = answer(session, a);
    session = outcome.session;
    return outcome;
  });
  return { session, outcomes };
}

describe("speedPoints", () => {
  it("すぐ答えると100、目安ちょうど・それより遅いと0、半分なら50", () => {
    expect(speedPoints(0, 4)).toBe(100);
    expect(speedPoints(2000, 4)).toBe(50);
    expect(speedPoints(4000, 4)).toBe(0);
    expect(speedPoints(9000, 4)).toBe(0);
  });

  it("小数点以下は切り捨て", () => {
    expect(speedPoints(1000, 3)).toBe(66);
  });
});

describe("ゲージ", () => {
  it("正解で+10、速い正解で+15、不正解で−20（0未満にならない）", () => {
    expect(answer(INITIAL_SESSION, input(true, SLOW)).session.gauge).toBe(10);
    expect(answer(INITIAL_SESSION, input(true, FAST)).session.gauge).toBe(15);
    expect(answer({ ...INITIAL_SESSION, gauge: 30 }, input(false, FAST)).session.gauge).toBe(10);
    expect(answer({ ...INITIAL_SESSION, gauge: 5 }, input(false, FAST)).session.gauge).toBe(0);
  });

  it("100に届いたらフィーバーが始まり、5問続く", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW));
    expect(outcome.feverStarted).toBe(true);
    expect(outcome.inFever).toBe(false);
    expect(outcome.session.feverLeft).toBe(5);
    expect(outcome.session.gauge).toBe(100);
  });

  it("フィーバー中はゲージが増減せず、5問答えると終わって0に戻る", () => {
    const start = { ...INITIAL_SESSION, gauge: 100, feverLeft: 5 };
    const { session, outcomes } = play([input(true, FAST), input(false, FAST), input(true, SLOW), input(true, FAST), input(true, FAST)], start);
    expect(outcomes.map((o) => o.inFever)).toEqual([true, true, true, true, true]);
    expect(outcomes.slice(0, 4).map((o) => o.session.gauge)).toEqual([100, 100, 100, 100]);
    expect(outcomes[4].feverEnded).toBe(true);
    expect(session.feverLeft).toBe(0);
    expect(session.gauge).toBe(0);
  });

  it("残りの問題が5問より少なければ、残りの数だけ続く", () => {
    expect(answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW, 3)).session.feverLeft).toBe(3);
  });

  it("最後の問題で満タンになってもフィーバーにはならない", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW, 0));
    expect(outcome.feverStarted).toBe(false);
    expect(outcome.session.feverLeft).toBe(0);
  });

  it("速く正解し続けると7問目で満タンになる（設計の目安）", () => {
    const { outcomes } = play(Array.from({ length: 7 }, () => input(true, FAST)));
    expect(outcomes.map((o) => o.feverStarted)).toEqual([false, false, false, false, false, false, true]);
  });
});

describe("点数・コンボ・時間", () => {
  it("正解は100＋速さの点、不正解は0", () => {
    expect(answer(INITIAL_SESSION, input(true, 2000)).gained).toBe(150);
    expect(answer(INITIAL_SESSION, input(false, 100)).gained).toBe(0);
  });

  it("フィーバー中は2倍", () => {
    expect(answer({ ...INITIAL_SESSION, gauge: 100, feverLeft: 3 }, input(true, 2000)).gained).toBe(300);
  });

  it("点数・時間・答えた数を足し上げ、コンボは不正解で0に戻る", () => {
    const { session, outcomes } = play([input(true, 2000), input(true, 4000), input(false, 1000), input(true, 4000)]);
    expect(session.score).toBe(150 + 100 + 0 + 100);
    expect(session.elapsedMs).toBe(11000);
    expect(session.answered).toBe(4);
    expect(outcomes.map((o) => o.session.combo)).toEqual([1, 2, 0, 1]);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/play-session.test.ts`
Expected: FAIL（`Cannot find module '@/lib/game/play-session'`）

- [ ] **Step 3: 実装する**

`src/lib/game/play-rules.ts`:

```ts
// 数値はすべて初期値。遊んでみて調整する（設計書 2.1〜2.3）
export const GAUGE_MAX = 100;
export const GAUGE_CORRECT = 10;
export const GAUGE_FAST_BONUS = 5;
export const GAUGE_WRONG = -20;
export const FEVER_PROBLEMS = 5;
export const BASE_POINTS = 100;
export const MAX_SPEED_POINTS = 100;
export const FEVER_MULTIPLIER = 2;
export const COMBO_SHOW_FROM = 3;
export const FEVER_BANNER_MS = 800;
```

`src/lib/game/play-session.ts`:

```ts
import {
  BASE_POINTS,
  FEVER_MULTIPLIER,
  FEVER_PROBLEMS,
  GAUGE_CORRECT,
  GAUGE_FAST_BONUS,
  GAUGE_MAX,
  GAUGE_WRONG,
  MAX_SPEED_POINTS,
} from "@/lib/game/play-rules";

export interface PlaySession {
  gauge: number;
  feverLeft: number;
  score: number;
  combo: number;
  elapsedMs: number;
  answered: number;
}

export const INITIAL_SESSION: PlaySession = { gauge: 0, feverLeft: 0, score: 0, combo: 0, elapsedMs: 0, answered: 0 };

export interface AnswerInput {
  correct: boolean;
  elapsedMs: number;
  secondsPerProblem: number;
  remainingAfter: number;
}

export interface AnswerOutcome {
  session: PlaySession;
  gained: number;
  inFever: boolean;
  feverStarted: boolean;
  feverEnded: boolean;
}

export function speedPoints(elapsedMs: number, secondsPerProblem: number): number {
  const targetMs = secondsPerProblem * 1000;
  const points = Math.floor((MAX_SPEED_POINTS * (targetMs - elapsedMs)) / targetMs);
  return Math.max(0, Math.min(MAX_SPEED_POINTS, points));
}

export function answer(session: PlaySession, input: AnswerInput): AnswerOutcome {
  const inFever = session.feverLeft > 0;
  const base = input.correct ? BASE_POINTS + speedPoints(input.elapsedMs, input.secondsPerProblem) : 0;
  const gained = inFever ? base * FEVER_MULTIPLIER : base;
  const common = {
    score: session.score + gained,
    combo: input.correct ? session.combo + 1 : 0,
    elapsedMs: session.elapsedMs + input.elapsedMs,
    answered: session.answered + 1,
  };

  if (inFever) {
    const feverLeft = session.feverLeft - 1;
    const feverEnded = feverLeft === 0;
    return {
      session: { ...common, gauge: feverEnded ? 0 : session.gauge, feverLeft },
      gained,
      inFever,
      feverStarted: false,
      feverEnded,
    };
  }

  const fast = input.elapsedMs < input.secondsPerProblem * 1000;
  const delta = input.correct ? GAUGE_CORRECT + (fast ? GAUGE_FAST_BONUS : 0) : GAUGE_WRONG;
  const gauge = Math.max(0, Math.min(GAUGE_MAX, session.gauge + delta));
  // 最後の問題で満タンになっても、続く問題が無いのでフィーバーにはしない
  const feverStarted = gauge >= GAUGE_MAX && input.remainingAfter > 0;
  return {
    session: { ...common, gauge, feverLeft: feverStarted ? Math.min(FEVER_PROBLEMS, input.remainingAfter) : 0 },
    gained,
    inFever,
    feverStarted,
    feverEnded: false,
  };
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/play-session.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/play-rules.ts src/lib/game/play-session.ts src/lib/game/play-session.test.ts
git commit -m "feat: ゲージ・フィーバー・点数・コンボを計算する仕組みを追加"
```

---

### Task 2: 目安の秒数と、★3の時間の条件

**Files:**
- Modify: `src/data/stages/catalog.ts`（`StageBase` に `secondsPerProblem`、表と `targetMs` を追加）
- Modify: `src/lib/game/stars.ts`（`starsForResult` の引数を変更、`missedThreeByMs` を追加）
- Modify: `src/components/stage-player.tsx`・`src/components/flash-stage-player.tsx`（`starsForResult` の呼び方だけ。Task 7 で置き換えるまでの仮）
- Test: `src/lib/game/stars.test.ts`（置き換え）、`src/data/stages/catalog.test.ts`（追記）

**Interfaces:**
- Consumes: 既存の `StageStatus`（`@/lib/game/stage`）
- Produces:
  - `catalog.ts`: `Stage` に `readonly secondsPerProblem: number`、`SECONDS_PER_PROBLEM: Record<ModeId, readonly number[]>`、`targetMs(stage: Stage): number`
  - `stars.ts`: `interface StageResultInput { status: StageStatus; mistakes: number; elapsedMs: number; targetMs: number }`、`starsForResult(input: StageResultInput): Stars`、`missedThreeByMs(input: StageResultInput): number | null`（ミスなしでクリアしたのに時間で★3を逃したときの超過ミリ秒。それ以外は null）。`mistakesOf`・`growthForStars` はそのまま

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/stars.test.ts` を置き換える:

```ts
import { describe, expect, it } from "vitest";

import { growthForStars, missedThreeByMs, mistakesOf, starsForResult, type StageResultInput } from "@/lib/game/stars";

const result = (overrides: Partial<StageResultInput>): StageResultInput => ({
  status: "cleared",
  mistakes: 0,
  elapsedMs: 50_000,
  targetMs: 80_000,
  ...overrides,
});

describe("starsForResult", () => {
  it("ミスなし かつ 目標タイム以内で★3（ちょうども含む）", () => {
    expect(starsForResult(result({}))).toBe(3);
    expect(starsForResult(result({ elapsedMs: 80_000 }))).toBe(3);
  });

  it("ミスなしでも目標タイムを過ぎたら★2", () => {
    expect(starsForResult(result({ elapsedMs: 80_001 }))).toBe(2);
  });

  it("ミス1〜2回は★2、3回以上は★1（時間は関係ない）", () => {
    expect(starsForResult(result({ mistakes: 1 }))).toBe(2);
    expect(starsForResult(result({ mistakes: 2, elapsedMs: 999_999 }))).toBe(2);
    expect(starsForResult(result({ mistakes: 3 }))).toBe(1);
    expect(starsForResult(result({ mistakes: 4 }))).toBe(1);
  });

  it("失敗・途中は★0", () => {
    expect(starsForResult(result({ status: "failed" }))).toBe(0);
    expect(starsForResult(result({ status: "in-progress" }))).toBe(0);
  });
});

describe("missedThreeByMs", () => {
  it("ミスなしでクリアして時間を過ぎたときだけ、超えたミリ秒を返す", () => {
    expect(missedThreeByMs(result({ elapsedMs: 83_500 }))).toBe(3_500);
    expect(missedThreeByMs(result({}))).toBeNull();
    expect(missedThreeByMs(result({ mistakes: 1, elapsedMs: 90_000 }))).toBeNull();
    expect(missedThreeByMs(result({ status: "failed", elapsedMs: 90_000 }))).toBeNull();
  });
});

it("mistakesOf は答えた数 − 正解の数", () => {
  expect(mistakesOf({ currentIndex: 20, correctCount: 17 })).toBe(3);
});

it("growthForStars はタネ→芽→つぼみ→花", () => {
  expect([0, 1, 2, 3].map((s) => growthForStars(s as 0 | 1 | 2 | 3))).toEqual(["seed", "sprout", "bud", "flower"]);
});
```

`src/data/stages/catalog.test.ts` の末尾に足す（import に `SECONDS_PER_PROBLEM`・`targetMs` を足す）:

```ts
describe("目安の秒数と目標タイム（設計書2.5）", () => {
  it("あそびごとの秒数が設計書の表どおり", () => {
    expect(SECONDS_PER_PROBLEM).toEqual({
      add: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
      sub: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
      mul: [4, 4, 4, 4, 4, 4, 5, 7, 7, 10, 12, 9],
      div: [5, 5, 5, 5, 5, 6, 8, 10, 12, 9, 14, 10],
      flash: [5, 5, 5, 6, 5, 8],
    });
  });

  it("すべてのステージに秒数があり、目標タイムは 秒数×20問", () => {
    for (const s of STAGES) expect(s.secondsPerProblem).toBeGreaterThan(0);
    expect(targetMs(getStage("add-1")!)).toBe(80_000);
    expect(targetMs(getStage("div-11")!)).toBe(280_000);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/stars.test.ts src/data/stages/catalog.test.ts`
Expected: FAIL（`missedThreeByMs` が無い、`SECONDS_PER_PROBLEM` が無い、など）

- [ ] **Step 3: 実装する**

`src/lib/game/stars.ts` の `starsForResult` を置き換え、`missedThreeByMs` を足す（`mistakesOf`・`growthForStars`・型はそのまま）:

```ts
export interface StageResultInput {
  status: StageStatus;
  mistakes: number;
  elapsedMs: number;
  targetMs: number;
}

export function starsForResult({ status, mistakes, elapsedMs, targetMs }: StageResultInput): Stars {
  if (status !== "cleared") return 0;
  if (mistakes === 0 && elapsedMs <= targetMs) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

/** ミスなしでクリアしたのに時間で★3を逃したとき、目標タイムを超えたミリ秒。それ以外は null */
export function missedThreeByMs({ status, mistakes, elapsedMs, targetMs }: StageResultInput): number | null {
  if (status !== "cleared" || mistakes !== 0 || elapsedMs <= targetMs) return null;
  return elapsedMs - targetMs;
}
```

（元の `// 分割2で★3に…` のコメントは消す）

`src/data/stages/catalog.ts`:
- `StageBase` に `readonly secondsPerProblem: number;` を足す
- `PROBLEMS_PER_STAGE` の下に足す:

```ts
// 1問の目安の秒数（設計書2.5）。フラッシュは答える時間だけ
export const SECONDS_PER_PROBLEM: Record<ModeId, readonly number[]> = {
  add: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
  sub: [4, 4, 4, 4, 6, 6, 6, 8, 8, 8, 10, 8],
  mul: [4, 4, 4, 4, 4, 4, 5, 7, 7, 10, 12, 9],
  div: [5, 5, 5, 5, 5, 6, 8, 10, 12, 9, 14, 10],
  flash: [5, 5, 5, 6, 5, 8],
};
```

- `build` の中で作る `StageBase` に `secondsPerProblem: SECONDS_PER_PROBLEM[mode][index],` を足す
- ファイルの最後に足す:

```ts
export function targetMs(stage: Stage): number {
  return stage.secondsPerProblem * 1000 * PROBLEMS_PER_STAGE;
}
```

`src/components/stage-player.tsx` と `src/components/flash-stage-player.tsx` の
`const stars = starsForResult(next.status, mistakesOf(next));`
を次に変える（Task 7 で時間を正しく渡すまでの仮。時間0なのでミスなしなら★3のまま＝今と同じ動き）。import に `targetMs` を足す:

```ts
        const stars = starsForResult({
          status: next.status,
          mistakes: mistakesOf(next),
          elapsedMs: 0,
          targetMs: targetMs(current),
        });
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/stars.ts src/lib/game/stars.test.ts src/data/stages/catalog.ts src/data/stages/catalog.test.ts src/components/stage-player.tsx src/components/flash-stage-player.tsx
git commit -m "feat: ステージごとの目安の秒数と、★3の目標タイムの条件を追加"
```

---

### Task 3: 最高点の保存

**Files:**
- Modify: `src/lib/progress-store.ts`
- Test: `src/lib/progress-store.test.ts`（置き換え）

**Interfaces:**
- Consumes: 既存の `getStage`・`isModeId`・`createLocalStore`・`StarMap`・`Stars`・`EarnedStars`
- Produces:
  - `interface Progress { stars: StarMap; best: Readonly<Record<string, number>>; lastModeId?: ModeId; titleSeen: boolean }`
  - `EMPTY_PROGRESS = { stars: {}, best: {}, titleSeen: false }`
  - `withResult(progress, stageId, stars: Stars, score: number | null = null): { progress: Progress; improved: boolean; newBest: boolean }`
  - `recordStageResult(stageId, stars: Stars, score: number | null = null): { improved: boolean; before: Stars; newBest: boolean; bestBefore: number | null }`
  - ほかの関数（`readProgress`・`useProgress`・`rememberLastMode`・`markTitleSeen`・`resetProgress`・`parseProgress`）の名前は変えない

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/progress-store.test.ts` を置き換える:

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
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 3, "flash-6": 2 }, best: {}, titleSeen: true });
  });

  it("lastModeId は知っているあそびだけ、titleSeen は true のときだけ", () => {
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "mul", titleSeen: "yes" }))).toEqual({
      stars: {},
      best: {},
      lastModeId: "mul",
      titleSeen: false,
    });
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "challenge" })).lastModeId).toBeUndefined();
  });

  it("best は0以上の整数だけ、知らないステージidは捨てる", () => {
    const raw = JSON.stringify({ stars: {}, best: { "add-1": 1530, "add-2": -5, "add-3": 1.5, "zzz-1": 100, "flash-1": "200" } });
    expect(parseProgress(raw).best).toEqual({ "add-1": 1530 });
  });

  it("分割1の記録（best が無い）も★を残して読める", () => {
    const raw = JSON.stringify({ stars: { "add-1": 2 }, lastModeId: "add", titleSeen: true });
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 2 }, best: {}, lastModeId: "add", titleSeen: true });
  });
});

describe("withResult", () => {
  it("前より★が多いときだけ★を更新する", () => {
    const first = withResult(EMPTY_PROGRESS, "add-1", 2);
    expect(first).toEqual({ progress: { ...EMPTY_PROGRESS, stars: { "add-1": 2 } }, improved: true, newBest: false });
    expect(withResult(first.progress, "add-1", 2).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 1).improved).toBe(false);
    expect(withResult(first.progress, "add-1", 3).progress.stars["add-1"]).toBe(3);
  });

  it("★0（失敗）は記録しない", () => {
    expect(withResult(EMPTY_PROGRESS, "add-1", 0)).toEqual({ progress: EMPTY_PROGRESS, improved: false, newBest: false });
  });

  it("点数は前の最高点を上回ったときだけ保存する（初めては最高記録）", () => {
    const first = withResult(EMPTY_PROGRESS, "add-1", 2, 1200);
    expect(first.newBest).toBe(true);
    expect(first.progress.best).toEqual({ "add-1": 1200 });

    const lower = withResult(first.progress, "add-1", 3, 1000);
    expect(lower.newBest).toBe(false);
    expect(lower.improved).toBe(true);
    expect(lower.progress.best).toEqual({ "add-1": 1200 });

    const same = withResult(first.progress, "add-1", 2, 1200);
    expect(same.newBest).toBe(false);

    const higher = withResult(first.progress, "add-1", 1, 1500);
    expect(higher).toMatchObject({ improved: false, newBest: true });
    expect(higher.progress.stars["add-1"]).toBe(2);
    expect(higher.progress.best["add-1"]).toBe(1500);
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

  it("recordStageResult は上がったときだけ保存し、前の★と前の最高点を返す", () => {
    expect(recordStageResult("add-1", 2, 900)).toEqual({ improved: true, before: 0, newBest: true, bestBefore: null });
    expect(recordStageResult("add-1", 1, 800)).toEqual({ improved: false, before: 2, newBest: false, bestBefore: 900 });
    expect(readProgress().stars).toEqual({ "add-1": 2 });
    expect(readProgress().best).toEqual({ "add-1": 900 });
  });

  it("点数を渡さない（失敗した回）は最高点を変えない", () => {
    recordStageResult("add-1", 2, 900);
    expect(recordStageResult("add-1", 0)).toEqual({ improved: false, before: 2, newBest: false, bestBefore: 900 });
    expect(readProgress().best).toEqual({ "add-1": 900 });
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
    recordStageResult("add-1", 3, 1000);
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

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/progress-store.test.ts`
Expected: FAIL（`best` が無い、`newBest` が無い）

- [ ] **Step 3: 実装する**

`src/lib/progress-store.ts`:
- `Progress` に `readonly best: Readonly<Record<string, number>>;` を足し、`EMPTY_PROGRESS` を `{ stars: {}, best: {}, titleSeen: false }` にする
- `parseProgress` の `stars` を読むところの下に足し、戻り値に `best` を入れる:

```ts
  const best: Record<string, number> = {};
  if (isRecord(data.best)) {
    for (const [id, value] of Object.entries(data.best)) {
      if (getStage(id) && typeof value === "number" && Number.isInteger(value) && value >= 0) best[id] = value;
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  return { stars, best, titleSeen: data.titleSeen === true, ...(lastModeId ? { lastModeId } : {}) };
```

- `withResult` を置き換える:

```ts
export function withResult(
  progress: Progress,
  stageId: string,
  stars: Stars,
  score: number | null = null
): { progress: Progress; improved: boolean; newBest: boolean } {
  const before = progress.stars[stageId] ?? 0;
  const improved = stars > 0 && stars > before;
  const bestBefore = progress.best[stageId];
  const newBest = score !== null && (bestBefore === undefined || score > bestBefore);
  if (!improved && !newBest) return { progress, improved, newBest };
  return {
    progress: {
      ...progress,
      stars: improved ? { ...progress.stars, [stageId]: stars as EarnedStars } : progress.stars,
      best: newBest ? { ...progress.best, [stageId]: score as number } : progress.best,
    },
    improved,
    newBest,
  };
}
```

- `recordStageResult` を置き換える:

```ts
export function recordStageResult(
  stageId: string,
  stars: Stars,
  score: number | null = null
): { improved: boolean; before: Stars; newBest: boolean; bestBefore: number | null } {
  const current = store.read();
  const before: Stars = current.stars[stageId] ?? 0;
  const bestBefore = current.best[stageId] ?? null;
  const { progress, improved, newBest } = withResult(current, stageId, stars, score);
  if (improved || newBest) save(progress);
  return { improved, before, newBest, bestBefore };
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS（プレイ画面の `recordStageResult(id, stars)` は第3引数を省けるのでそのまま動く）

- [ ] **Step 5: コミット**

```bash
git add src/lib/progress-store.ts src/lib/progress-store.test.ts
git commit -m "feat: ステージごとの最高点を保存し、古い記録もそのまま読めるようにする"
```

---

### Task 4: 答えにかかった時間を測る時計

**Files:**
- Create: `src/lib/game/answer-clock.ts`
- Test: `src/lib/game/answer-clock.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `createAnswerClock(now: () => number): AnswerClock`。`interface AnswerClock { start(): void; pause(): void; resume(): void; stop(): number; peek(): number }`
  - `start`: 0から測り始める（測っている途中でも0に戻す）
  - `pause`/`resume`: 止める・再開する（二重に呼んでも安全）
  - `stop`: 測った時間を返して止める（測っていなければ0）
  - `peek`: 止めずに今までの時間を返す（測っていなければ0）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/answer-clock.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { createAnswerClock } from "@/lib/game/answer-clock";

let t = 0;
const clock = () => createAnswerClock(() => t);

beforeEach(() => {
  t = 0;
});

describe("createAnswerClock", () => {
  it("start から stop までの時間を返す", () => {
    const c = clock();
    c.start();
    t = 1500;
    expect(c.stop()).toBe(1500);
  });

  it("止めている間（ページが隠れている間）は数えない", () => {
    const c = clock();
    c.start();
    t = 1000;
    c.pause();
    t = 61_000;
    c.resume();
    t = 61_500;
    expect(c.stop()).toBe(1500);
  });

  it("pause・resume を二重に呼んでも、測っていないときに呼んでも安全", () => {
    const c = clock();
    c.pause();
    c.resume();
    c.start();
    t = 1000;
    c.pause();
    c.pause();
    t = 2000;
    c.resume();
    c.resume();
    t = 2500;
    expect(c.stop()).toBe(1500);
  });

  it("peek は止めずに今までの時間を返す。stop のあとは0", () => {
    const c = clock();
    expect(c.peek()).toBe(0);
    c.start();
    t = 700;
    expect(c.peek()).toBe(700);
    t = 900;
    expect(c.stop()).toBe(900);
    expect(c.peek()).toBe(0);
    expect(c.stop()).toBe(0);
  });

  it("start をもう一度呼ぶと0から測り直す", () => {
    const c = clock();
    c.start();
    t = 5000;
    c.start();
    t = 5300;
    expect(c.stop()).toBe(300);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/game/answer-clock.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 実装する**

`src/lib/game/answer-clock.ts`:

```ts
export interface AnswerClock {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): number;
  peek(): number;
}

export function createAnswerClock(now: () => number): AnswerClock {
  let startedAt: number | null = null;
  let accumulated = 0;
  let paused = false;

  function peek(): number {
    if (startedAt === null) return 0;
    return accumulated + (paused ? 0 : now() - startedAt);
  }

  return {
    start() {
      startedAt = now();
      accumulated = 0;
      paused = false;
    },
    pause() {
      if (startedAt === null || paused) return;
      accumulated += now() - startedAt;
      paused = true;
    },
    resume() {
      if (startedAt === null || !paused) return;
      startedAt = now();
      paused = false;
    },
    stop() {
      const total = peek();
      startedAt = null;
      accumulated = 0;
      paused = false;
      return total;
    },
    peek,
  };
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/answer-clock.test.ts && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/answer-clock.ts src/lib/game/answer-clock.test.ts
git commit -m "feat: 答えにかかった時間を、止める・再開つきで測る時計を追加"
```

---

### Task 5: フィーバーの曲

**Files:**
- Create（コピー）: `public/sounds/bgm-minigame.mp3`
- Modify: `src/lib/bgm-route.ts`（`BgmTrack` に `"fever"`）、`src/lib/sound-files.ts`（`BGM_FILES.fever`）、`public/sounds/README.md`（表に1行）
- Test: `src/lib/sound-files.test.ts`（既存。ファイルがあることを確かめる）、`src/lib/bgm-route.test.ts`（追記）

**Interfaces:**
- Produces: `type BgmTrack = "home" | "quiz" | "fever"`。`bgmTrackFor` は今までどおり `"home"` か `"quiz"` だけを返す（フィーバーの曲はプレイ画面から `playBgm("fever")` で切り替える）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/bgm-route.test.ts` の先頭の import に `import { BGM_FILES } from "@/lib/sound-files";` を足し、末尾に足す:

```ts
it("フィーバーの曲がある（画面のURLからは選ばれない）", () => {
  expect(BGM_FILES.fever).toBe("/sounds/bgm-minigame.mp3");
  expect(bgmTrackFor("/stage/add-1")).not.toBe("fever");
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/lib/bgm-route.test.ts`
Expected: FAIL（`BGM_FILES.fever` が undefined。型エラーでも可）

- [ ] **Step 3: 実装する**

```bash
cp ../../Spra-go/frontend/public/sounds/bgm-minigame.mp3 public/sounds/
```

`src/lib/bgm-route.ts` の型を `export type BgmTrack = "home" | "quiz" | "fever";` にする。

`src/lib/sound-files.ts` の `BGM_FILES` に `fever: "/sounds/bgm-minigame.mp3",` を足す。

`public/sounds/README.md` の表の `bgm-quiz.mp3` の行の下に足す:

```markdown
| bgm-minigame.mp3 | フィーバー中（プレイ画面から切り替える） |
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS（`sound-files.test.ts` が新しいファイルの存在も確かめる）

- [ ] **Step 5: コミット**

```bash
git add public/sounds/bgm-minigame.mp3 public/sounds/README.md src/lib/bgm-route.ts src/lib/bgm-route.test.ts src/lib/sound-files.ts
git commit -m "feat: フィーバー用のBGMを追加"
```

---

### Task 6: 画面のまとめ役のフックと、見た目の部品

**Files:**
- Modify: `src/app/globals.css`（フィーバーの色・新しい動き）
- Create: `src/components/play/use-speed-play.ts`、`src/components/play/use-count-up.ts`、`src/components/play/gauge-bar.tsx`、`src/components/play/score-counter.tsx`、`src/components/play/time-bar.tsx`、`src/components/play/speed-hud.tsx`、`src/components/play/points-popup.tsx`、`src/components/play/combo-text.tsx`、`src/components/play/fever-stage.tsx`、`src/components/play/fever-friends.tsx`

この Task では部品を作るだけで、プレイ画面にはつながない（Task 7 でつなぐ）。部品は画面がらみなので自動テストは書かず、型・lint・ビルドで確かめ、Task 7 の Playwright で動きを確かめる。

**Interfaces:**
- Consumes: Task 1 の `answer`・`INITIAL_SESSION`・`PlaySession`・`AnswerOutcome`・`COMBO_SHOW_FROM`・`FEVER_BANNER_MS`、Task 4 の `createAnswerClock`、Task 5 の `"fever"`、既存の `useSound`・`useProgress`・`gardenFriends`・`starsOf`・`growthForStars`・`growthImage`・`SPRU_POSES`・`prefersReducedMotion`・`cn`
- Produces:
  - `useSpeedPlay({ secondsPerProblem, answerable, questionKey }): { session: PlaySession; banner: boolean; lastGain: LastGain | null; submit(correct: boolean, remainingAfter: number): AnswerOutcome; reset(): void; getElapsedMs(): number }`
    - `answerable`: いま答えられる状態か（四則演算: 問題中で演出中でない、フラッシュ: 答える段階で演出中でない）。true になるたび（`questionKey` が変わるたび）に時計を0から動かす
    - `submit`: 時計を止め、答えを計算し、点数の飛び出し・フィーバーの文字・曲の切り替えを行い、結果を返す
    - `reset`: やり直しのとき。フィーバー中だったら曲をクイズ用に戻す
  - `interface LastGain { amount: number; doubled: boolean; key: number }`
  - `useCountUp(target: number, durationMs?: number, initial?: number): number`
  - `<SpeedHud session targetMs getElapsedMs />`、`<PointsPopup gain />`、`<ComboText combo />`、`<FeverStage active />`、`<FeverBanner show />`（`fever-stage.tsx` から）、`<FeverFriends hopKey />`、`<ScoreCounter score />`

- [ ] **Step 1: CSS を足す**

`src/app/globals.css`:
- `@theme inline { … }` の最後に足す:

```css
  --color-fever-from: var(--fever-from);
  --color-fever-mid: var(--fever-mid);
  --color-fever-to: var(--fever-to);
```

- `:root { … }` の `--cream-edge` の下に足す:

```css
  --fever-from: #ff7ac8;
  --fever-mid: #8a2be2;
  --fever-to: #2a0f5c;
```

- `@layer utilities` の中、`.animate-bubble-in` の定義の下に足す:

```css
  @keyframes float-up {
    0% { transform: translate(-50%, 0) scale(0.8); opacity: 0; }
    15% { transform: translate(-50%, -6px) scale(1.1); opacity: 1; }
    100% { transform: translate(-50%, -64px) scale(1); opacity: 0; }
  }
  .animate-float-up { animation: float-up 0.9s ease-out forwards; }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.4s ease-in-out; }

  @keyframes fever-banner {
    0% { transform: scale(0.3) rotate(-8deg); opacity: 0; }
    40% { transform: scale(1.15) rotate(-4deg); opacity: 1; }
    100% { transform: scale(1) rotate(-4deg); opacity: 1; }
  }
  .animate-fever-banner { animation: fever-banner 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both; }

  @keyframes beams-spin {
    to { transform: rotate(360deg); }
  }
  .animate-beams { animation: beams-spin 12s linear infinite; }
```

- 既存の `@media (prefers-reduced-motion: reduce)` のブロックを次に置き換える:

```css
  @media (prefers-reduced-motion: reduce) {
    .animate-spru-bob,
    .animate-spru-hop,
    .animate-pop-in,
    .animate-grow-in,
    .animate-pulse-soft,
    .animate-bubble-in,
    .animate-shake,
    .animate-fever-banner,
    .animate-beams {
      animation: none !important;
    }
    .animate-sparkle,
    .animate-grow-out,
    .animate-float-up {
      display: none;
    }
  }
```

- [ ] **Step 2: フックを作る**

`src/components/play/use-count-up.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

/** 表示する数を target まで少しずつ近づける。動きを減らす設定ではすぐ target にする */
export function useCountUp(target: number, durationMs = 400, initial = target): number {
  const [shown, setShown] = useState(initial);
  const shownRef = useRef(initial);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const duration = prefersReducedMotion() ? 0 : durationMs;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      const value = Math.round(from + (target - from) * progress);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
```

`src/components/play/use-speed-play.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { createAnswerClock } from "@/lib/game/answer-clock";
import { FEVER_BANNER_MS } from "@/lib/game/play-rules";
import { answer, INITIAL_SESSION, type AnswerOutcome, type PlaySession } from "@/lib/game/play-session";

export interface LastGain {
  amount: number;
  doubled: boolean;
  key: number;
}

interface Options {
  secondsPerProblem: number;
  answerable: boolean;
  questionKey: number;
}

export function useSpeedPlay({ secondsPerProblem, answerable, questionKey }: Options) {
  const { playBgm } = useSound();
  // プレイ画面は ssr: false で読み込むので、初期値で performance を使ってよい
  const [clock] = useState(() => createAnswerClock(() => performance.now()));
  const [session, setSession] = useState<PlaySession>(INITIAL_SESSION);
  const [banner, setBanner] = useState(false);
  const [lastGain, setLastGain] = useState<LastGain | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 問題が答えられる状態になるたびに、0から測り始める（演出中・フラッシュの表示中は数えない）
  useEffect(() => {
    if (answerable) clock.start();
  }, [answerable, questionKey, clock]);

  // 別のタブ・アプリにいる間は数えない
  useEffect(() => {
    const onVisibility = () => (document.visibilityState === "hidden" ? clock.pause() : clock.resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [clock]);

  function submit(correct: boolean, remainingAfter: number): AnswerOutcome {
    const outcome = answer(session, { correct, elapsedMs: clock.stop(), secondsPerProblem, remainingAfter });
    setSession(outcome.session);
    setLastGain(
      outcome.gained > 0 ? { amount: outcome.gained, doubled: outcome.inFever, key: outcome.session.answered } : null
    );
    if (outcome.feverStarted) {
      playBgm("fever");
      setBanner(true);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(false), FEVER_BANNER_MS);
    }
    if (outcome.feverEnded) playBgm("quiz");
    return outcome;
  }

  function reset() {
    if (session.feverLeft > 0) playBgm("quiz");
    clock.stop();
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setSession(INITIAL_SESSION);
    setLastGain(null);
    setBanner(false);
  }

  function getElapsedMs(): number {
    return session.elapsedMs + clock.peek();
  }

  return { session, banner, lastGain, submit, reset, getElapsedMs };
}
```

- [ ] **Step 3: 見た目の部品を作る**

`src/components/play/score-counter.tsx`:

```tsx
"use client";

import { useCountUp } from "@/components/play/use-count-up";

export function ScoreCounter({ score }: { score: number }) {
  const shown = useCountUp(score);
  return (
    <span className="rounded-full border-b-[3px] border-[#c98f12] bg-accent px-3 py-0.5 font-display text-sm font-black text-accent-foreground">
      PT {shown.toLocaleString("ja-JP")}
    </span>
  );
}
```

`src/components/play/gauge-bar.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function GaugeBar({ gauge, feverLeft }: { gauge: number; feverLeft: number }) {
  const fever = feverLeft > 0;
  return (
    <div
      role="img"
      aria-label={fever ? `フィーバー あと${feverLeft}もん` : `ゲージ ${gauge}`}
      className="flex flex-1 items-center gap-2"
    >
      <span className={cn("font-display text-xs font-black", fever ? "text-[#ffe14d]" : "text-primary")}>
        {fever ? "FEVER" : "ゲージ"}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            fever ? "bg-linear-to-r from-[#ff3d8b] to-[#ffe14d]" : "bg-linear-to-r from-leaf to-accent"
          )}
          style={{ width: `${fever ? 100 : gauge}%` }}
        />
      </div>
      {fever && <span className="font-display text-xs font-black whitespace-nowrap text-white">あと{feverLeft}もん</span>}
    </div>
  );
}
```

`src/components/play/time-bar.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const TICK_MS = 200;

/** 目標タイムまでの残りを減っていくバーで出す。過ぎても止めない */
export function TimeBar({ targetMs, getElapsedMs }: { targetMs: number; getElapsedMs: () => number }) {
  const [elapsed, setElapsed] = useState(0);
  const getRef = useRef(getElapsedMs);

  useEffect(() => {
    getRef.current = getElapsedMs;
  });

  useEffect(() => {
    const id = setInterval(() => setElapsed(getRef.current()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const over = elapsed > targetMs;
  const remainingRatio = Math.max(0, 1 - elapsed / targetMs);
  const remainingSec = Math.ceil(Math.max(0, targetMs - elapsed) / 1000);

  return (
    <div className="px-4" data-time-over={over ? "true" : "false"}>
      <div className="h-2 overflow-hidden rounded-full bg-white/60">
        <div
          className={cn("h-full rounded-full transition-[width] duration-200", over ? "bg-[#b9b2a3]" : "bg-[#2b6fa3]")}
          style={{ width: `${over ? 100 : remainingRatio * 100}%` }}
        />
      </div>
      <p className={cn("mt-0.5 text-right font-display text-[11px] font-black", over ? "text-muted-foreground" : "text-[#2b6fa3]")}>
        {over ? "★3は つぎ がんばろう" : `★3まで あと ${remainingSec}びょう`}
      </p>
    </div>
  );
}
```

`src/components/play/speed-hud.tsx`:

```tsx
"use client";

import { GaugeBar } from "@/components/play/gauge-bar";
import { ScoreCounter } from "@/components/play/score-counter";
import { TimeBar } from "@/components/play/time-bar";
import type { PlaySession } from "@/lib/game/play-session";

export function SpeedHud({
  session,
  targetMs,
  getElapsedMs,
}: {
  session: PlaySession;
  targetMs: number;
  getElapsedMs: () => number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={session.gauge} feverLeft={session.feverLeft} />
        <ScoreCounter score={session.score} />
      </div>
      <TimeBar targetMs={targetMs} getElapsedMs={getElapsedMs} />
    </div>
  );
}
```

`src/components/play/points-popup.tsx`:

```tsx
import type { LastGain } from "@/components/play/use-speed-play";
import { cn } from "@/lib/utils";

/** 正解したときに「+150」を飛び出させる。key が変わるたびに動きが最初から始まる */
export function PointsPopup({ gain }: { gain: LastGain | null }) {
  if (!gain) return null;
  return (
    <span
      key={gain.key}
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/4 left-1/2 animate-float-up font-display font-black whitespace-nowrap",
        gain.doubled ? "text-4xl text-[#ff3d8b]" : "text-3xl text-cta-to"
      )}
    >
      +{gain.amount}
      {gain.doubled && " ×2"}
    </span>
  );
}
```

`src/components/play/combo-text.tsx`:

```tsx
import { COMBO_SHOW_FROM } from "@/lib/game/play-rules";

export function ComboText({ combo }: { combo: number }) {
  if (combo < COMBO_SHOW_FROM) return null;
  return (
    <p
      key={combo}
      className="absolute top-3 right-3 animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white"
    >
      {combo}コンボ！
    </p>
  );
}
```

`src/components/play/fever-stage.tsx`:

```tsx
const FLAG_COLORS = ["#ffe14d", "#3dd6c6", "#ff3d8b", "#7ab8ff"];

/** フィーバー中の紫のステージ（背景）。main の中で一番後ろに置く */
export function FeverStage({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,var(--fever-from)_0%,var(--fever-mid)_50%,var(--fever-to)_100%)]"
    >
      <div className="absolute -inset-1/2 animate-beams bg-[conic-gradient(from_0deg,transparent_0deg_10deg,rgba(255,255,255,0.12)_10deg_16deg,transparent_16deg_40deg,rgba(255,255,255,0.1)_40deg_46deg,transparent_46deg_80deg,rgba(255,255,255,0.12)_80deg_86deg,transparent_86deg_120deg)]" />
      <div className="absolute inset-x-0 top-[124px] flex justify-between px-1">
        {Array.from({ length: 13 }, (_, i) => (
          <i
            key={i}
            className="block h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent"
            style={{ borderTopColor: FLAG_COLORS[i % FLAG_COLORS.length] }}
          />
        ))}
      </div>
    </div>
  );
}

/** 「FEVER!」の文字。すべての上に重ねる */
export function FeverBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-fever-banner text-center font-display text-6xl font-black text-[#ffe14d] [text-shadow:0_4px_0_#b81e5d,0_0_18px_#ff3d8b]"
    >
      FEVER!
    </p>
  );
}
```

`src/components/play/fever-friends.tsx`:

```tsx
"use client";

import Image from "next/image";

import { gardenFriends, starsOf } from "@/lib/game/progression";
import { growthForStars } from "@/lib/game/stars";
import { useProgress } from "@/lib/progress-store";
import { growthImage, SPRU_POSES } from "@/lib/spru-images";

/** フィーバー中に応援に集まる仲間。hopKey が変わるたび（正解のたび）に跳ねる */
export function FeverFriends({ hopKey }: { hopKey: number }) {
  const { stars } = useProgress();
  const friends = gardenFriends(stars);
  return (
    <div aria-hidden className="flex h-14 items-end justify-center gap-1 px-4">
      {friends.length === 0 ? (
        <span key={hopKey} className="block animate-spru-hop">
          <Image src={SPRU_POSES.jump} alt="" width={44} height={60} className="h-14 w-auto" />
        </span>
      ) : (
        friends.map((stage, i) => (
          <span key={`${stage.id}-${hopKey}`} className="block animate-spru-hop" style={{ animationDelay: `${i * 40}ms` }}>
            <Image
              src={growthImage(stage.color, growthForStars(starsOf(stars, stage.id)))}
              alt=""
              width={40}
              height={54}
              className="h-12 w-auto"
            />
          </span>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: 確かめる**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS（部品はまだどこからも使われていないが、型・lint・ビルドが通ること）

- [ ] **Step 5: コミット**

```bash
git add src/app/globals.css src/components/play
git commit -m "feat: ゲージ・点数・残り時間・フィーバーの見た目の部品と、プレイをまとめるフックを追加"
```

---

### Task 7: プレイ画面と結果画面につなぐ

**Files:**
- Create: `src/components/play/finish-stage.ts`
- Modify: `src/components/play/stage-result.tsx`（置き換え）、`src/components/stage-player.tsx`（置き換え）、`src/components/flash-stage-player.tsx`（置き換え）
- Test: `src/components/play/finish-stage.test.ts`

**Interfaces:**
- Consumes: Task 1〜6 のすべて、既存の `recordStageResult`・`resultLinks`・`StarsRow`・`Panel`・`AppButton`・`appButtonVariants`・`PlayHeader`・`FeedbackText`・`poseFor`・`StageNotFound`・`NumericKeypad`・`useFlashSequence`
- Produces:
  - `interface StageOutcome { stars: Stars; improved: boolean; before: Stars; score: number; newBest: boolean; elapsedMs: number; targetMs: number; missedThreeByMs: number | null }`（`stage-result.tsx` から export）
  - `finishStage(stage: Stage, next: { status: StageStatus; currentIndex: number; correctCount: number }, session: PlaySession): StageOutcome`（★を計算し、記録を保存し、結果画面に渡す値を返す。クリアのときだけ点数を保存する）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/play/finish-stage.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { finishStage } from "@/components/play/finish-stage";
import { getStage } from "@/data/stages/catalog";
import { INITIAL_SESSION } from "@/lib/game/play-session";
import { readProgress } from "@/lib/progress-store";

const add1 = getStage("add-1")!; // 目標タイム 80秒

beforeEach(() => {
  const store = new Map<string, string>();
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

describe("finishStage", () => {
  it("ミスなし・時間内のクリアは★3と点数を保存する", () => {
    const outcome = finishStage(add1, { status: "cleared", currentIndex: 20, correctCount: 20 }, { ...INITIAL_SESSION, score: 3200, elapsedMs: 50_000 });
    expect(outcome).toEqual({
      stars: 3,
      improved: true,
      before: 0,
      score: 3200,
      newBest: true,
      elapsedMs: 50_000,
      targetMs: 80_000,
      missedThreeByMs: null,
    });
    expect(readProgress().best["add-1"]).toBe(3200);
  });

  it("ミスなしでも時間を過ぎたら★2と、超えた時間を返す", () => {
    const outcome = finishStage(add1, { status: "cleared", currentIndex: 20, correctCount: 20 }, { ...INITIAL_SESSION, score: 2000, elapsedMs: 83_400 });
    expect(outcome.stars).toBe(2);
    expect(outcome.missedThreeByMs).toBe(3_400);
  });

  it("失敗した回は★も点数も保存しない", () => {
    const outcome = finishStage(add1, { status: "failed", currentIndex: 7, correctCount: 2 }, { ...INITIAL_SESSION, score: 500, elapsedMs: 9_000 });
    expect(outcome).toMatchObject({ stars: 0, improved: false, newBest: false });
    expect(readProgress().best).toEqual({});
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npx vitest run src/components/play/finish-stage.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 終わりの処理と結果画面を作る**

`src/components/play/finish-stage.ts`:

```ts
import type { StageOutcome } from "@/components/play/stage-result";
import { targetMs, type Stage } from "@/data/stages/catalog";
import type { PlaySession } from "@/lib/game/play-session";
import type { StageStatus } from "@/lib/game/stage";
import { missedThreeByMs, mistakesOf, starsForResult } from "@/lib/game/stars";
import { recordStageResult } from "@/lib/progress-store";

/** ステージが終わったときに★を決め、記録を保存し、結果画面に渡す値を返す */
export function finishStage(
  stage: Stage,
  next: { status: StageStatus; currentIndex: number; correctCount: number },
  session: PlaySession
): StageOutcome {
  const input = {
    status: next.status,
    mistakes: mistakesOf(next),
    elapsedMs: session.elapsedMs,
    targetMs: targetMs(stage),
  };
  const stars = starsForResult(input);
  const cleared = next.status === "cleared";
  const record = recordStageResult(stage.id, stars, cleared ? session.score : null);
  return {
    stars,
    improved: record.improved,
    before: record.before,
    score: session.score,
    newBest: record.newBest,
    elapsedMs: session.elapsedMs,
    targetMs: input.targetMs,
    missedThreeByMs: missedThreeByMs(input),
  };
}
```

`src/components/play/stage-result.tsx` を置き換える:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import { useCountUp } from "@/components/play/use-count-up";
import type { Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { resultLinks } from "@/lib/result-links";
import { SPRU_POSES } from "@/lib/spru-images";

export interface StageOutcome {
  stars: Stars;
  improved: boolean;
  before: Stars;
  score: number;
  newBest: boolean;
  elapsedMs: number;
  targetMs: number;
  missedThreeByMs: number | null;
}

interface StageResultProps {
  stage: Stage;
  cleared: boolean;
  correctCount: number;
  total: number;
  outcome: StageOutcome;
  onRetry: () => void;
}

const SCORE_COUNT_MS = 1200;

export function StageResult({ stage, cleared, correctCount, total, outcome, onRetry }: StageResultProps) {
  const links = resultLinks(stage, { cleared, improved: outcome.improved, before: outcome.before });
  const score = useCountUp(outcome.score, SCORE_COUNT_MS, 0);
  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image
          src={cleared ? SPRU_POSES.cheer : SPRU_POSES.sad}
          alt=""
          width={120}
          height={160}
          priority
          className="h-32 w-auto animate-pop-in"
        />
        <h1 className="font-display text-3xl font-black">{cleared ? "ステージクリア！" : "ざんねん…"}</h1>
        {cleared && <StarsRow stars={outcome.stars} size="lg" animate />}
        {cleared && (
          <p className="font-display text-4xl font-black text-cta-to" aria-label={`${outcome.score}てん`}>
            {score.toLocaleString("ja-JP")}
            <span className="ml-1 text-lg">PT</span>
          </p>
        )}
        {cleared && outcome.newBest && (
          <p className="animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white">
            さいこうきろく！
          </p>
        )}
        <p className="font-bold">
          {correctCount} / {total} もん せいかい
        </p>
        {cleared && (
          <p className="text-sm font-bold text-muted-foreground">
            かかった じかん {Math.round(outcome.elapsedMs / 1000)}びょう / もくひょう {Math.round(outcome.targetMs / 1000)}びょう
          </p>
        )}
        {outcome.missedThreeByMs !== null && (
          <p className="font-display text-sm font-black text-[#2b6fa3]">
            あと {Math.ceil(outcome.missedThreeByMs / 1000)}びょう はやければ ★3！
          </p>
        )}
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

Run: `npx vitest run src/components/play/finish-stage.test.ts`
Expected: PASS

- [ ] **Step 4: 四則演算のプレイ画面を置き換える**

`src/components/stage-player.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { finishStage } from "@/components/play/finish-stage";
import { PlayHeader } from "@/components/play/play-header";
import { PointsPopup } from "@/components/play/points-popup";
import { SpeedHud } from "@/components/play/speed-hud";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { getStage, PROBLEMS_PER_STAGE, targetMs, type ArithmeticStage } from "@/data/stages/catalog";
import { generateProblems, type Operator, type Problem } from "@/lib/game/problem-rules";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { modeHref } from "@/lib/mode-params";
import { rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

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
  const speed = useSpeedPlay({
    secondsPerProblem: stage?.secondsPerProblem ?? 1,
    answerable: state !== null && state.status === "in-progress" && feedback === null,
    questionKey: state?.currentIndex ?? 0,
  });

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
    const remainingAfter = next.status === "in-progress" ? next.problems.length - next.currentIndex : 0;
    const result = speed.submit(isCorrect, remainingAfter);
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        setOutcome(finishStage(current, next, result.session));
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    speed.reset();
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
  const inFever = speed.session.feverLeft > 0;

  return (
    <main data-fever={inFever ? "true" : "false"} className="relative isolate flex flex-1 flex-col gap-2 pb-4">
      <FeverStage active={inFever} />
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <SpeedHud session={speed.session} targetMs={targetMs(current)} getElapsedMs={speed.getElapsedMs} />
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-2",
          feedback === "incorrect" && "animate-shake"
        )}
      >
        <ComboText combo={speed.session.combo} />
        {/* 正解のたびに跳ねる。key を答えた数にして、毎回動きを最初から始める */}
        <span key={speed.session.answered} className={feedback === "correct" ? "block animate-spru-hop" : "block"}>
          <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        </span>
        {problem && (
          <p className="font-display text-4xl font-black tracking-wide">
            {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
          </p>
        )}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
        <PointsPopup gain={feedback === "correct" ? speed.lastGain : null} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} disabled={feedback !== null} />
      </div>
      <FeverBanner show={speed.banner} />
    </main>
  );
}
```

- [ ] **Step 5: フラッシュのプレイ画面を置き換える**

`src/components/flash-stage-player.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { finishStage } from "@/components/play/finish-stage";
import { PlayHeader } from "@/components/play/play-header";
import { PointsPopup } from "@/components/play/points-popup";
import { SpeedHud } from "@/components/play/speed-hud";
import { StageNotFound } from "@/components/play/stage-not-found";
import { StageResult, type StageOutcome } from "@/components/play/stage-result";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { getStage, PROBLEMS_PER_STAGE, targetMs, type FlashStage } from "@/data/stages/catalog";
import { generateFlashStageProblems, type FlashProblem } from "@/lib/game/flash-problem";
import { createStage, currentProblem, submitAnswer, type StageState } from "@/lib/game/stage";
import { modeHref } from "@/lib/mode-params";
import { rememberLastMode } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { useFlashSequence } from "@/lib/use-flash-sequence";
import { cn } from "@/lib/utils";

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

  const problem = state && state.status === "in-progress" ? currentProblem(state) : null;
  const flash = useFlashSequence(problem?.sequence ?? EMPTY_SEQUENCE, stage?.rule.stepMs ?? 0, stage?.rule.gapMs ?? 0);
  // 数字が出ている間は時間を数えない（答える時間だけを測る）
  const speed = useSpeedPlay({
    secondsPerProblem: stage?.secondsPerProblem ?? 1,
    answerable: problem !== null && flash.phase === "answering" && feedback === null,
    questionKey: state?.currentIndex ?? 0,
  });

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
    if (!state || inputValue === "" || feedback !== null || flash.phase !== "answering") return;
    const isCorrect = Number(inputValue) === currentProblem(state).answer;
    const next = submitAnswer(state, Number(inputValue));
    const remainingAfter = next.status === "in-progress" ? next.problems.length - next.currentIndex : 0;
    const result = speed.submit(isCorrect, remainingAfter);
    setFeedback(isCorrect ? "correct" : "incorrect");
    play(isCorrect ? "correct" : "incorrect");
    setInputValue("");

    // 結果の記録は、このタイマーの中で1回だけ行う
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(next);
      setFeedback(null);
      if (next.status !== "in-progress") {
        setOutcome(finishStage(current, next, result.session));
        if (next.status === "cleared") play("allCorrect");
      }
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    speed.reset();
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

  const inFever = speed.session.feverLeft > 0;

  return (
    <main data-fever={inFever ? "true" : "false"} className="relative isolate flex flex-1 flex-col gap-2 pb-4">
      <FeverStage active={inFever} />
      <PlayHeader
        backHref={modeHref(current.mode, { stageId: current.id })}
        hp={state.hp}
        index={Math.min(state.currentIndex + 1, state.problems.length)}
        total={state.problems.length}
      />
      <SpeedHud session={speed.session} targetMs={targetMs(current)} getElapsedMs={speed.getElapsedMs} />
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-2",
          feedback === "incorrect" && "animate-shake"
        )}
      >
        <ComboText combo={speed.session.combo} />
        {/* 正解のたびに跳ねる。key を答えた数にして、毎回動きを最初から始める */}
        <span key={speed.session.answered} className={feedback === "correct" ? "block animate-spru-hop" : "block"}>
          <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        </span>
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
        <PointsPopup gain={feedback === "correct" ? speed.lastGain : null} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={feedback !== null || flash.phase !== "answering"}
        />
      </div>
      <FeverBanner show={speed.banner} />
    </main>
  );
}
```

- [ ] **Step 6: 自動テスト・型・lint・ビルド**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 7: 画面で確かめる（Playwright）**

`npm run dev` で起動し（ポートは表示されたものを使う。止めるときは `lsof -nP -iTCP:<port> -sTCP:LISTEN` で PID を調べて `kill <PID>`。`pkill` は使わない）、作業用フォルダ（`/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/<セッションID>/scratchpad`、Playwright は入っている）に `check-speed.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const errors = [];

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...options });
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return page;
}

async function seed(page, progress = { stars: { "add-1": 3, "add-2": 2 }, titleSeen: true }) {
  await page.goto(base);
  await page.evaluate((p) => localStorage.setItem("tane:progress:v1", JSON.stringify(p)), progress);
}

async function solveArithmetic(page) {
  const text = await page.locator("main p").filter({ hasText: "＝" }).first().textContent();
  const nums = text.match(/\d+/g).map(Number);
  const op = text.match(/[＋−×÷]/)[0];
  return { "＋": nums[0] + nums[1], "−": nums[0] - nums[1], "×": nums[0] * nums[1], "÷": nums[0] / nums[1] }[op];
}

async function type(page, n) {
  for (const d of String(n)) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
}

const isFever = (page) => page.locator("main").getAttribute("data-fever");

// 1. 速く全問正解 → 7問目のあとフィーバー → 5問で空に戻る → ★3・点数・さいこうきろく
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  const fever = [];
  for (let i = 0; i < 20; i++) {
    await type(page, await solveArithmetic(page));
    if (i === 6) {
      await page.getByText("FEVER!").waitFor();
      await page.screenshot({ path: "speed-fever-banner.png" });
    }
    await page.waitForTimeout(700);
    if (i === 8) await page.screenshot({ path: "speed-fever.png" });
    fever.push(await isFever(page).catch(() => "result"));
  }
  const expected = ["false", "false", "false", "false", "false", "false", "true", "true", "true", "true", "true", "false"];
  if (JSON.stringify(fever.slice(0, 12)) !== JSON.stringify(expected)) throw new Error(`フィーバーの並び: ${fever.join(",")}`);
  await page.getByText("ステージクリア！").waitFor();
  await page.getByText("さいこうきろく！").waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "speed-result.png" });
  if (!(await page.getByRole("img", { name: "ほし 3こ" }).isVisible())) throw new Error("★3になっていない");
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem("tane:progress:v1")).best["add-1"]);
  if (!(best > 2000)) throw new Error(`最高点が ${best}`);
  await page.close();
}

// 2. ゆっくり解く（時計を早送り）→ バーが灰色 → ミスなしでも★2と「あと○びょう」
{
  const page = await newPage();
  await page.clock.install();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  for (let i = 0; i < 20; i++) {
    await page.clock.fastForward(5000); // 目安4秒より遅く答える
    await type(page, await solveArithmetic(page));
    await page.clock.runFor(700);
    if (i === 17) {
      await page.getByText("★3は つぎ がんばろう").waitFor();
      await page.screenshot({ path: "speed-slow-over.png" });
    }
  }
  await page.getByText("ステージクリア！").waitFor();
  await page.getByText(/あと \d+びょう はやければ ★3！/).waitFor();
  if (!(await page.getByRole("img", { name: "ほし 2こ" }).isVisible())) throw new Error("★2になっていない");
  await page.close();
}

// 3. タブを隠している間は時間が増えない
{
  const page = await newPage();
  await page.clock.install();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  await page.getByText(/★3まで あと/).waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(120_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(400);
  const label = await page.getByText(/★3まで あと \d+びょう/).textContent();
  const sec = Number(label.match(/\d+/)[0]);
  if (sec < 78) throw new Error(`隠している間も数えている: ${label}`);
  await page.close();
}

// 4. フィーバー中に失敗 → もういちど で空・クイズの状態に戻る
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  for (let i = 0; i < 7; i++) {
    await type(page, await solveArithmetic(page));
    await page.waitForTimeout(700);
  }
  if ((await isFever(page)) !== "true") throw new Error("フィーバーに入っていない");
  for (let i = 0; i < 5; i++) {
    await type(page, 9999);
    await page.waitForTimeout(700);
  }
  await page.getByText("ざんねん…").waitFor();
  await page.getByRole("button", { name: "もういちど" }).click();
  await page.getByText("1 / 20").waitFor();
  if ((await isFever(page)) !== "false") throw new Error("やり直しでフィーバーが残っている");
  if (!(await page.getByText("PT 0").isVisible())) throw new Error("点数が0に戻っていない");
  await page.close();
}

// 5. フラッシュでも点数とゲージが動く
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/flash/flash-1`);
  const seen = [];
  while (!(await page.getByText("ぜんぶで いくつ？").isVisible())) {
    const t = (await page.locator("main p.text-6xl").textContent().catch(() => ""))?.trim();
    if (t && /^[+-]?\d+$/.test(t) && seen.at(-1) !== t) seen.push(t);
    await page.waitForTimeout(50);
  }
  await type(page, seen.reduce((s, v) => s + Number(v), 0));
  await page.waitForTimeout(700);
  await page.getByText("2 / 20").waitFor();
  if (await page.getByText("PT 0").isVisible()) throw new Error("フラッシュで点数が入っていない");
  await page.screenshot({ path: "speed-flash.png" });
  await page.close();
}

// 6. 動きを減らす設定: 飛び出す数字は出ず、点数は正しい
{
  const page = await newPage({ reducedMotion: "reduce" });
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  await type(page, await solveArithmetic(page));
  const popup = page.locator(".animate-float-up");
  if ((await popup.count()) > 0 && (await popup.first().isVisible())) throw new Error("動きを減らす設定で数字が飛び出している");
  await page.waitForTimeout(700);
  if (await page.getByText("PT 0").isVisible()) throw new Error("点数が入っていない");
  await page.close();
}

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-speed.mjs http://localhost:3000`
Expected: `OK`。`speed-fever-banner.png`（FEVER! の文字）・`speed-fever.png`（紫の背景・旗・仲間・「あと○もん」・×2の点数）・`speed-result.png`（★3・点数・さいこうきろく！・時間）・`speed-slow-over.png`（灰色のバーと「★3は つぎ がんばろう」）・`speed-flash.png` を開いて、文字の重なりや切れがないかを目で確かめる。

続けて分割1の確認スクリプト（`check-mode.mjs`・`check-home.mjs`・`check-play.mjs`・`check-friends-settings.mjs`・`check-back.mjs`）も流し、`OK` を確かめる（`check-mode.mjs` の404は `/mode/foo` を開く確認によるもので正常）。`check-play.mjs` の★3の確認は、速く解くので時間内に収まる。

- [ ] **Step 8: コミット**

```bash
git add src/components/play src/components/stage-player.tsx src/components/flash-stage-player.tsx
git status --short
git commit -m "feat: プレイ画面にゲージ・フィーバー・点数・残り時間を入れ、結果画面に点数と最高記録を出す"
```

---

### Task 8: 通しの確認・記録・プッシュ

**Files:**
- Modify: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（末尾に追記。gitの管理外）

- [ ] **Step 1: すべてのチェック**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 2: 古い記録で起動する（Playwright）**

`npx next start -p 3002` で本番と同じ形で起動し、作業用フォルダに `check-old-record.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3002";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// 分割1の形（best なし）と、壊れた best
await page.goto(base);
await page.evaluate(() =>
  localStorage.setItem(
    "tane:progress:v1",
    JSON.stringify({ stars: { "add-1": 3, "add-2": 1 }, best: { "add-1": "x", "add-2": -1 }, lastModeId: "add", titleSeen: true })
  )
);
await page.reload();
await page.getByText("たしざん ステージ3").waitFor();
await page.goto(`${base}/mode/add`);
await page.getByText("ステージ 3 / 12").waitFor();

console.log(errors.length ? `エラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-old-record.mjs http://localhost:3002` と、Task 7 の `check-speed.mjs http://localhost:3002`
Expected: どちらも `OK`

BGM（フィーバーの曲への切り替えと戻り）は、Owner が実機で確かめる。

- [ ] **Step 3: 開発の記録に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` の末尾に、実際に起きたことに合わせて追記する:

```markdown

## 2026-10-14 スピードのあるプレイ画面（分割2a）

- 設計書: `2026-10-14-speed-play-design.md`、実装計画: `docs/superpowers/plans/2026-10-14-tane-speed-play.md`
- できたこと: ゲージ（正解+10・速い正解+15・不正解−20）、フィーバー（満タンで5問、紫のステージ・仲間の応援・点数2倍・専用BGM）、点数と最高記録、★3の目標タイム（目安の秒数×20問）、残り時間のバー、結果画面の点数・時間・「あと○びょう」
- 決めたこと・つまずいたこと: （実装中の判断と、その理由）
- 次: 分割2b（チャレンジ）。数値は遊んでみて調整する（`src/lib/game/play-rules.ts`・`catalog.ts` の `SECONDS_PER_PROBLEM`）
```

- [ ] **Step 4: プッシュ**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git push -u origin feature/speed-play
```

（`master` へのマージは、最後のレビューのあと Owner に確認してから行う）
