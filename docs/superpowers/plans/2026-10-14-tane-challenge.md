# Tane チャレンジ（分割2b） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ★30で開く「チャレンジ」を作る。あそび（たしざん・ひきざん・かけざん・わりざん・まぜまぜ）を選んで60秒のタイムアタックをし、正解を続けると段が上がり、最高点とメダルが残る。ふつうのステージのクリア後にも「もういちど」を足す。

**Architecture:** ルールは画面を含まない純粋関数にまとめる。段のルール・メダル・残り時間は `challenge-rules.ts`、段の上がり下がりは `challenge-session.ts`、段の点は `play-session.ts` の `answer()` に「足す点」として渡す。画面は2aの `useSpeedPlay`（時計・ゲージ・フィーバー・曲）と見た目の部品を使い回し、チャレンジだけの部品（残り時間・段・カウントダウン・メダル・結果）を `components/challenge/` に置く。

**Tech Stack:** Next.js 16.2.10（App Router）、React 19.2.4、TypeScript、Tailwind CSS v4、Vitest 3、lucide-react。画面の確認は Playwright（作業用フォルダに入れてあるものを使う。リポジトリには入れない）。

**Spec:** `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-10-14-challenge-design.md`（前提: `2026-10-14-game-foundation-design.md`・`2026-10-14-speed-play-design.md`）

**作業場所:** リポジトリは `projects/tane`（gitのルート）。コマンドはすべて `projects/tane/frontend` で実行する。作業ブランチ `feature/challenge` を `master` から切る。画面の確認スクリプトは作業用フォルダ `/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/d770f439-71d9-4189-a7a7-4f836ce49f0c/scratchpad`（以下「scratchpad」。Playwright が入っている）に置いて、そこで実行する。

## Global Constraints

- ドキュメント・UIの文言・コメントは日本語。子ども向けの文言はひらがな中心（例: 「60びょうで どこまで いける？」「だん 5」「レベルアップ！」「タイムアップ！」「あと 320てんで ぎんメダル！」「まだ きろくなし」「あそびを えらぶ」）
- 新しい npm パッケージは追加しない。アイコンは lucide-react（`Medal`・`Shuffle`・`Timer`・`X`）
- アニメーションは globals.css にある keyframes（`animate-pop-in`・`animate-pulse-soft`・`animate-fever-banner` など）だけを使う。新しい keyframes を足さない（足すなら `prefers-reduced-motion` の止めるリストにも入れる）
- ルールの数値（設計書2.1〜2.4）は `src/lib/game/challenge-rules.ts` の定数にまとめる: 60秒、段1〜12、2問続けて正解で1段上がる、間違えると1段下がる、段の点 =（段−1）×20、残り10秒で赤、メダル（たし・ひき・かけ・まぜまぜ 1500/3000/4500、わり 1000/2000/3500）
- ゲージ・フィーバー・速さの点・コンボは2aの `play-rules.ts` をそのまま使う
- 時間は「問題が出ている間」だけ減る。演出中・カウントダウン中・ページが隠れている間は減らない
- 記録のキーは `tane:progress:v1` のまま。`challengeBest` が無い古い記録・壊れた値でも起動する。チャレンジの最高点は60秒を最後まで遊んだときだけ保存する
- `react-hooks/set-state-in-effect` などの lint に違反しない（effect の中で同期的に setState しない。ref を描画中に読まない）
- 絵文字を UI に使わない。コメントは理由が分かりにくいところだけに1行
- コミットはタスクの最後に1回。メッセージは既存の形（`feat: …` の日本語）で、最後に `Co-Authored-By: <実行するモデル名> <noreply@anthropic.com>`

## Review Focus

1. **時間切れの瞬間**: 答えの途中・フィーバー中に0秒になっても、記録は1回だけ保存され、紫の画面とフィーバーの曲が残らないこと。0秒を過ぎてから押した答えは数えないこと（Task 1 の `isTimeUp`、Task 6 の時計を早送りする画面確認）
2. **途中でやめる・もういちど**: 「やめる」で戻った回は最高点を保存しないこと。「もういちど」で段1・0点・60秒・フィーバーなしから始まり、前の回のタイマーが残らないこと（Task 6 の画面確認）
3. **タブを切り替える・席を立つ**: ページが隠れている間は残り時間が減らないこと（Task 6 で `visibilitychange` を起こして確認）
4. **鍵**: ★30未満で `/challenge`・`/challenge/add` を直接開くとホームへ戻り、`/challenge/flash` などはチャレンジの入口へ戻ること（Task 6 の画面確認）
5. **古い記録**: `challengeBest` が無い記録・壊れた値・知らないあそびの値でも起動し、★と最高点はそのまま残ること（Task 3 のテスト、Task 7 で古い形の記録を入れて起動）

---

## ファイル構成

| ファイル | 役割 | タスク |
|---|---|---|
| `src/lib/game/challenge-rules.ts` | 定数、`ChallengeModeId`、段のルール・目安の秒数・段の点・次の問題・メダル・残り時間 | 1 |
| `src/lib/game/challenge-session.ts` | 段・続けて正解した数・いちばん高かった段・正解の数 | 2 |
| `src/lib/game/play-session.ts` | `answer()` に「足す点」`bonusPoints` | 2 |
| `src/lib/progress-store.ts` | `challengeBest` と `recordChallengeResult` | 3 |
| `src/lib/bgm-route.ts` | `/challenge/…` はクイズの曲 | 4 |
| `src/components/play/use-speed-play.ts` | `submit` に足す点、時間切れ用の `finish()` | 4 |
| `src/components/play/problem-text.tsx` | 「3 ＋ 4 ＝」の表示（ステージとチャレンジで共有） | 4 |
| `src/components/play/stage-result.tsx` | クリアした結果画面の「もういちど」 | 4 |
| `src/components/challenge/{medal-badge,challenge-banners,challenge-timer,challenge-mode-card,challenge-result}.tsx` | チャレンジの見た目の部品 | 5 |
| `src/components/challenge/{challenge-entrance,challenge-entrance-loader,challenge-player,challenge-player-loader}.tsx` | 入口とプレイ画面 | 6 |
| `src/app/challenge/page.tsx`・`src/app/challenge/[modeId]/page.tsx` | ページ | 6 |
| `src/components/home/mode-buttons.tsx` | チャレンジボタンを入口へのリンクに | 6 |

---

### Task 0: 作業ブランチ

- [ ] **Step 1: ブランチを切る**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git status --short
git switch master
git switch -c feature/challenge
```

Expected: `git status --short` が空（作業中の変更が無い）。`Switched to a new branch 'feature/challenge'`

---

### Task 1: チャレンジのルール

**Files:**
- Create: `src/lib/game/challenge-rules.ts`
- Test: `src/lib/game/challenge-rules.test.ts`

**Interfaces:**
- Consumes: `getStage`・`MODES`（`@/data/stages/catalog`）、`generateProblem`・`ArithmeticRule`・`Operator`・`Problem`（`@/lib/game/problem-rules`）
- Produces:
  - 定数 `CHALLENGE_MS = 60_000`・`MAX_LEVEL = 12`・`STREAK_TO_LEVEL_UP = 2`・`LEVEL_POINTS = 20`・`WARNING_MS = 10_000`
  - `type ChallengeModeId = Operator | "mix"`、`CHALLENGE_MODE_IDS`、`CHALLENGE_LABELS: Record<ChallengeModeId, string>`、`isChallengeModeId(value: string): value is ChallengeModeId`
  - `levelRule(mode, level): ArithmeticRule`、`secondsFor(mode, level, problem): number`、`levelPoints(level): number`
  - `nextProblem(mode, level, previous: Problem | null, rng?: () => number): Problem`
  - `type Medal = "bronze" | "silver" | "gold"`、`MEDAL_SCORES`、`medalFor(mode, score: number | null): Medal | null`、`medalRank(medal: Medal | null): number`、`nextMedalGoal(mode, best: number): { medal: Medal; pointsLeft: number } | null`
  - `remainingMs(elapsedMs): number`、`isTimeUp(elapsedMs): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/challenge-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getStage } from "@/data/stages/catalog";
import {
  CHALLENGE_MODE_IDS,
  isChallengeModeId,
  isTimeUp,
  levelPoints,
  levelRule,
  MAX_LEVEL,
  medalFor,
  medalRank,
  nextMedalGoal,
  nextProblem,
  remainingMs,
  secondsFor,
} from "@/lib/game/challenge-rules";
import { satisfiesRule, type Operator, type Problem } from "@/lib/game/problem-rules";

function ruleOf(id: string) {
  const stage = getStage(id);
  if (stage?.kind !== "arithmetic") throw new Error(id);
  return stage.rule;
}

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

const problem = (operator: Operator): Problem => ({ operator, operandA: 1, operandB: 1, answer: 0 });

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

it("isChallengeModeId は計算4つとまぜまぜだけ", () => {
  expect(CHALLENGE_MODE_IDS.every(isChallengeModeId)).toBe(true);
  expect(isChallengeModeId("mix")).toBe(true);
  expect(isChallengeModeId("flash")).toBe(false);
  expect(isChallengeModeId("foo")).toBe(false);
});

describe("levelRule", () => {
  it("段nは、そのあそびのステージnのルール（段12はボス）", () => {
    expect(levelRule("add", 3)).toBe(ruleOf("add-3"));
    expect(levelRule("div", 12)).toBe(ruleOf("div-12"));
  });

  it("まぜまぜの段nは、4つのあそびのステージnを混ぜたルール", () => {
    expect(levelRule("mix", 5)).toEqual({
      op: "mix",
      rules: [ruleOf("add-5"), ruleOf("sub-5"), ruleOf("mul-5"), ruleOf("div-5")],
    });
  });

  it("どのあそびの、どの段でもルールがある", () => {
    for (const mode of CHALLENGE_MODE_IDS) {
      for (const level of LEVELS) expect(() => levelRule(mode, level)).not.toThrow();
    }
  });
});

describe("secondsFor", () => {
  it("その段のステージの目安の秒数", () => {
    expect(secondsFor("add", 5, problem("add"))).toBe(6);
    expect(secondsFor("mul", 11, problem("mul"))).toBe(12);
    // まぜまぜでないあそびは、出た問題の計算に関係なくそのあそびの値（ボスの混ざった問題でも）
    expect(secondsFor("add", 12, problem("sub"))).toBe(8);
  });

  it("まぜまぜは、出た問題の計算のステージの値", () => {
    expect(secondsFor("mix", 1, problem("add"))).toBe(4);
    expect(secondsFor("mix", 1, problem("div"))).toBe(5);
    expect(secondsFor("mix", 11, problem("add"))).toBe(10);
    expect(secondsFor("mix", 11, problem("div"))).toBe(14);
  });
});

it("levelPoints は（段−1）×20", () => {
  expect(levelPoints(1)).toBe(0);
  expect(levelPoints(2)).toBe(20);
  expect(levelPoints(12)).toBe(220);
});

describe("nextProblem", () => {
  it("その段のルールに合う問題を作る", () => {
    for (const mode of CHALLENGE_MODE_IDS) {
      for (const level of LEVELS) {
        const made = nextProblem(mode, level, null, seeded(level));
        expect(satisfiesRule(made, levelRule(mode, level))).toBe(true);
      }
    }
  });

  it("まぜまぜでは4つの計算が混ざって出る", () => {
    const rng = seeded(1);
    const operators = new Set(Array.from({ length: 200 }, () => nextProblem("mix", 3, null, rng).operator));
    expect(operators.size).toBe(4);
  });

  it("前と同じ問題が続かない", () => {
    const rng = seeded(7);
    let previous: Problem | null = null;
    for (let i = 0; i < 200; i++) {
      const made = nextProblem("add", 1, previous, rng);
      if (previous) expect(made).not.toEqual(previous);
      previous = made;
    }
  });
});

describe("メダル", () => {
  it("medalFor は最高点で決まる（境目ちょうどで取れる）", () => {
    expect(medalFor("add", null)).toBeNull();
    expect(medalFor("add", 1499)).toBeNull();
    expect(medalFor("add", 1500)).toBe("bronze");
    expect(medalFor("add", 2999)).toBe("bronze");
    expect(medalFor("add", 3000)).toBe("silver");
    expect(medalFor("add", 4499)).toBe("silver");
    expect(medalFor("mix", 4500)).toBe("gold");
  });

  it("わりざんは低め", () => {
    expect(medalFor("div", 999)).toBeNull();
    expect(medalFor("div", 1000)).toBe("bronze");
    expect(medalFor("div", 2000)).toBe("silver");
    expect(medalFor("div", 3500)).toBe("gold");
  });

  it("medalRank は無し0・銅1・銀2・金3", () => {
    expect([null, "bronze", "silver", "gold"].map((m) => medalRank(m as never))).toEqual([0, 1, 2, 3]);
  });

  it("nextMedalGoal は次のメダルと、あと何点か。金なら無し", () => {
    expect(nextMedalGoal("add", 0)).toEqual({ medal: "bronze", pointsLeft: 1500 });
    expect(nextMedalGoal("add", 1200)).toEqual({ medal: "bronze", pointsLeft: 300 });
    expect(nextMedalGoal("add", 1500)).toEqual({ medal: "silver", pointsLeft: 1500 });
    expect(nextMedalGoal("add", 4499)).toEqual({ medal: "gold", pointsLeft: 1 });
    expect(nextMedalGoal("add", 4500)).toBeNull();
    expect(nextMedalGoal("div", 3400)).toEqual({ medal: "gold", pointsLeft: 100 });
  });
});

describe("残り時間", () => {
  it("60秒から使った時間を引く。0未満にならない", () => {
    expect(remainingMs(0)).toBe(60_000);
    expect(remainingMs(59_500)).toBe(500);
    expect(remainingMs(61_000)).toBe(0);
  });

  it("60秒ちょうどで時間切れ", () => {
    expect(isTimeUp(59_999)).toBe(false);
    expect(isTimeUp(60_000)).toBe(true);
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/game/challenge-rules.test.ts`
Expected: FAIL（`@/lib/game/challenge-rules` が見つからない）

- [ ] **Step 3: 実装する**

`src/lib/game/challenge-rules.ts`:

```ts
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
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/challenge-rules.test.ts`
Expected: PASS（全部）。「前と同じ問題が続かない」が決まった乱数の並びのせいで落ちるときは、実装を疑う前に `seeded(7)` の並びで6回続けて同じ問題が出ていないかを確かめ、出ていれば種を変えて ledger に Ruling を残す

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/challenge-rules.ts src/lib/game/challenge-rules.test.ts
git commit -m "feat: チャレンジのルール（段の問題・目安の秒数・段の点・メダル・残り時間）を追加"
```

---

### Task 2: 段の上がり下がりと、足す点

**Files:**
- Create: `src/lib/game/challenge-session.ts`
- Test: `src/lib/game/challenge-session.test.ts`
- Modify: `src/lib/game/play-session.ts`（`AnswerInput` と `answer()`）
- Test: `src/lib/game/play-session.test.ts`（末尾に追加）

**Interfaces:**
- Consumes: `MAX_LEVEL`・`STREAK_TO_LEVEL_UP`（Task 1）
- Produces:
  - `interface ChallengeState { level: number; streak: number; topLevel: number; correctCount: number }`、`INITIAL_CHALLENGE`
  - `interface ChallengeStep { state: ChallengeState; leveledUp: boolean; leveledDown: boolean }`
  - `answerChallenge(state: ChallengeState, correct: boolean): ChallengeStep`
  - `AnswerInput` に `bonusPoints?: number`（正解のときだけ足す。フィーバー中は一緒に2倍）

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/challenge-session.test.ts`:

```ts
import { expect, it } from "vitest";

import { answerChallenge, INITIAL_CHALLENGE, type ChallengeState } from "@/lib/game/challenge-session";

function run(answers: boolean[], from: ChallengeState = INITIAL_CHALLENGE): ChallengeState {
  return answers.reduce((state, correct) => answerChallenge(state, correct).state, from);
}

it("段1・0問から始まる", () => {
  expect(INITIAL_CHALLENGE).toEqual({ level: 1, streak: 0, topLevel: 1, correctCount: 0 });
});

it("2問続けて正解すると1段上がり、続けた数は0から数え直す", () => {
  const first = answerChallenge(INITIAL_CHALLENGE, true);
  expect(first).toEqual({ state: { level: 1, streak: 1, topLevel: 1, correctCount: 1 }, leveledUp: false, leveledDown: false });
  const second = answerChallenge(first.state, true);
  expect(second).toEqual({ state: { level: 2, streak: 0, topLevel: 2, correctCount: 2 }, leveledUp: true, leveledDown: false });
});

it("間違えると1段下がり、続けた数も0に戻る（いちばん高かった段と正解の数はそのまま）", () => {
  const from: ChallengeState = { level: 3, streak: 1, topLevel: 3, correctCount: 5 };
  expect(answerChallenge(from, false)).toEqual({
    state: { level: 2, streak: 0, topLevel: 3, correctCount: 5 },
    leveledUp: false,
    leveledDown: true,
  });
});

it("段1より下・段12より上にならない", () => {
  expect(answerChallenge(INITIAL_CHALLENGE, false)).toEqual({
    state: INITIAL_CHALLENGE,
    leveledUp: false,
    leveledDown: false,
  });
  const top: ChallengeState = { level: 12, streak: 1, topLevel: 12, correctCount: 30 };
  const step = answerChallenge(top, true);
  expect(step.state.level).toBe(12);
  expect(step.leveledUp).toBe(false);
});

it("いちばん高かった段を覚える", () => {
  const state = run([true, true, true, true, false, false]);
  expect(state.level).toBe(1);
  expect(state.topLevel).toBe(3);
  expect(state.correctCount).toBe(4);
});
```

`src/lib/game/play-session.test.ts` の import に `FEVER_PROBLEMS` を足す（`import { FEVER_PROBLEMS } from "@/lib/game/play-rules";` がまだ無ければ追加）。末尾に追加:

```ts
describe("足す点（チャレンジの段の点）", () => {
  it("正解の点に足し、フィーバー中は一緒に2倍。不正解は0", () => {
    expect(answer(INITIAL_SESSION, { ...input(true, SLOW), bonusPoints: 40 }).gained).toBe(140);
    const fever: PlaySession = { ...INITIAL_SESSION, gauge: 100, feverLeft: 3 };
    expect(answer(fever, { ...input(true, SLOW), bonusPoints: 40 }).gained).toBe(280);
    expect(answer(INITIAL_SESSION, { ...input(false, SLOW), bonusPoints: 40 }).gained).toBe(0);
  });

  it("足す点を渡さなければ今までと同じ", () => {
    expect(answer(INITIAL_SESSION, input(true, SLOW)).gained).toBe(100);
  });

  it("終わりの決まっていないプレイ（残りが無限）でも、フィーバーは5問", () => {
    const outcome = answer({ ...INITIAL_SESSION, gauge: 90 }, input(true, SLOW, Number.POSITIVE_INFINITY));
    expect(outcome.feverStarted).toBe(true);
    expect(outcome.session.feverLeft).toBe(FEVER_PROBLEMS);
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/game/challenge-session.test.ts src/lib/game/play-session.test.ts`
Expected: FAIL（`challenge-session` が見つからない。`bonusPoints` の2つが 100・200 で落ちる。型チェックは vitest では走らないので、型の誤りでは落ちない）

- [ ] **Step 3: 実装する**

`src/lib/game/challenge-session.ts`:

```ts
import { MAX_LEVEL, STREAK_TO_LEVEL_UP } from "@/lib/game/challenge-rules";

export interface ChallengeState {
  level: number;
  streak: number;
  topLevel: number;
  correctCount: number;
}

export const INITIAL_CHALLENGE: ChallengeState = { level: 1, streak: 0, topLevel: 1, correctCount: 0 };

export interface ChallengeStep {
  state: ChallengeState;
  leveledUp: boolean;
  leveledDown: boolean;
}

export function answerChallenge(state: ChallengeState, correct: boolean): ChallengeStep {
  if (!correct) {
    const level = Math.max(1, state.level - 1);
    return { state: { ...state, level, streak: 0 }, leveledUp: false, leveledDown: level < state.level };
  }
  const streak = state.streak + 1;
  const leveledUp = streak >= STREAK_TO_LEVEL_UP && state.level < MAX_LEVEL;
  const level = leveledUp ? state.level + 1 : state.level;
  return {
    state: {
      level,
      streak: leveledUp ? 0 : streak,
      topLevel: Math.max(state.topLevel, level),
      correctCount: state.correctCount + 1,
    },
    leveledUp,
    leveledDown: false,
  };
}
```

`src/lib/game/play-session.ts` を変える。`AnswerInput` に1行足す:

```ts
export interface AnswerInput {
  correct: boolean;
  elapsedMs: number;
  secondsPerProblem: number;
  remainingAfter: number;
  /** 正解のときだけ足す点（チャレンジの段の点）。フィーバー中は一緒に2倍 */
  bonusPoints?: number;
}
```

`answer()` の `base` の行を置き換える:

```ts
  const base = input.correct
    ? BASE_POINTS + speedPoints(input.elapsedMs, input.secondsPerProblem) + (input.bonusPoints ?? 0)
    : 0;
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/lib/game/challenge-session.test.ts src/lib/game/play-session.test.ts && npm run typecheck`
Expected: PASS、型エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/challenge-session.ts src/lib/game/challenge-session.test.ts src/lib/game/play-session.ts src/lib/game/play-session.test.ts
git commit -m "feat: チャレンジの段の上がり下がりと、正解に足す段の点を追加"
```

---

### Task 3: チャレンジの最高点の保存

**Files:**
- Modify: `src/lib/progress-store.ts`
- Test: `src/lib/progress-store.test.ts`

**Interfaces:**
- Consumes: `ChallengeModeId`・`isChallengeModeId`（Task 1）
- Produces:
  - `Progress` に `readonly challengeBest: Readonly<Partial<Record<ChallengeModeId, number>>>`（`EMPTY_PROGRESS` は `{}`）
  - `withChallengeScore(progress, mode, score): { progress: Progress; newBest: boolean }`
  - `recordChallengeResult(mode, score): { newBest: boolean; bestBefore: number | null }`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/progress-store.test.ts` を変える。

import に `recordChallengeResult` と `withChallengeScore` を足す。

`parseProgress` の既存の3つの期待値に `challengeBest: {}` を足す:

```ts
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 3, "flash-6": 2 }, best: {}, challengeBest: {}, titleSeen: true });
```

```ts
    expect(parseProgress(JSON.stringify({ stars: {}, lastModeId: "mul", titleSeen: "yes" }))).toEqual({
      stars: {},
      best: {},
      challengeBest: {},
      lastModeId: "mul",
      titleSeen: false,
    });
```

```ts
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 2 }, best: {}, challengeBest: {}, lastModeId: "add", titleSeen: true });
```

`describe("parseProgress", …)` の中に追加:

```ts
  it("challengeBest は知っているチャレンジのあそびの、0以上の整数だけ", () => {
    const raw = JSON.stringify({
      stars: {},
      challengeBest: { add: 3200, mix: 0, flash: 100, div: -1, mul: 1.5, sub: "9" },
    });
    expect(parseProgress(raw).challengeBest).toEqual({ add: 3200, mix: 0 });
  });

  it("challengeBest が無い・形が違う記録は空で、★は残る", () => {
    expect(parseProgress(JSON.stringify({ stars: { "add-1": 1 }, challengeBest: [1, 2] }))).toMatchObject({
      stars: { "add-1": 1 },
      challengeBest: {},
    });
  });
```

`describe("withResult", …)` のあとに追加:

```ts
describe("withChallengeScore", () => {
  it("前の最高点を上回ったときだけ保存する（初めては0点でも最高記録）", () => {
    const first = withChallengeScore(EMPTY_PROGRESS, "add", 0);
    expect(first.newBest).toBe(true);
    expect(first.progress.challengeBest).toEqual({ add: 0 });

    const higher = withChallengeScore(first.progress, "add", 2400);
    expect(higher.newBest).toBe(true);
    expect(higher.progress.challengeBest).toEqual({ add: 2400 });

    const lower = withChallengeScore(higher.progress, "add", 1800);
    expect(lower).toEqual({ progress: higher.progress, newBest: false });
    expect(withChallengeScore(higher.progress, "add", 2400).newBest).toBe(false);
  });

  it("ほかのあそびの最高点と★には触らない", () => {
    const base = { ...EMPTY_PROGRESS, stars: { "add-1": 3 as const }, challengeBest: { mix: 500 } };
    expect(withChallengeScore(base, "div", 900).progress).toEqual({ ...base, challengeBest: { mix: 500, div: 900 } });
  });
});
```

`describe("localStorage への読み書き", …)` の中に追加:

```ts
  it("recordChallengeResult は上回ったときだけ保存し、前の最高点を返す", () => {
    expect(recordChallengeResult("add", 1500)).toEqual({ newBest: true, bestBefore: null });
    expect(recordChallengeResult("add", 900)).toEqual({ newBest: false, bestBefore: 1500 });
    expect(readProgress().challengeBest).toEqual({ add: 1500 });
  });

  it("resetProgress でチャレンジの最高点も消える", () => {
    recordChallengeResult("mix", 2000);
    resetProgress();
    expect(readProgress().challengeBest).toEqual({});
  });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/progress-store.test.ts`
Expected: FAIL（`withChallengeScore`・`recordChallengeResult` が無い。既存の3つは `challengeBest` が無くて落ちる）

- [ ] **Step 3: 実装する**

`src/lib/progress-store.ts` を変える。

import に足す:

```ts
import { isChallengeModeId, type ChallengeModeId } from "@/lib/game/challenge-rules";
```

`Progress` と `EMPTY_PROGRESS`:

```ts
export interface Progress {
  readonly stars: StarMap;
  readonly best: Readonly<Record<string, number>>;
  readonly challengeBest: Readonly<Partial<Record<ChallengeModeId, number>>>;
  readonly lastModeId?: ModeId;
  readonly titleSeen: boolean;
}

export const EMPTY_PROGRESS: Progress = { stars: {}, best: {}, challengeBest: {}, titleSeen: false };
```

`isEarnedStars` の下に足す:

```ts
function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
```

`parseProgress` の `best` の読み取りを `isScore` に置き換え、`challengeBest` を足す（`best` の for から `return` まで）:

```ts
  const best: Record<string, number> = {};
  if (isRecord(data.best)) {
    for (const [id, value] of Object.entries(data.best)) {
      if (getStage(id) && isScore(value)) best[id] = value;
    }
  }
  const challengeBest: Partial<Record<ChallengeModeId, number>> = {};
  if (isRecord(data.challengeBest)) {
    for (const [id, value] of Object.entries(data.challengeBest)) {
      if (isChallengeModeId(id) && isScore(value)) challengeBest[id] = value;
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  return { stars, best, challengeBest, titleSeen: data.titleSeen === true, ...(lastModeId ? { lastModeId } : {}) };
```

`withResult` の下に足す:

```ts
export function withChallengeScore(
  progress: Progress,
  mode: ChallengeModeId,
  score: number
): { progress: Progress; newBest: boolean } {
  const before = progress.challengeBest[mode];
  if (before !== undefined && score <= before) return { progress, newBest: false };
  return { progress: { ...progress, challengeBest: { ...progress.challengeBest, [mode]: score } }, newBest: true };
}
```

`recordStageResult` の下に足す:

```ts
export function recordChallengeResult(
  mode: ChallengeModeId,
  score: number
): { newBest: boolean; bestBefore: number | null } {
  const current = store.read();
  const bestBefore = current.challengeBest[mode] ?? null;
  const { progress, newBest } = withChallengeScore(current, mode, score);
  if (newBest) save(progress);
  return { newBest, bestBefore };
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: すべて PASS、型エラーなし（`Progress` を直接組み立てている場所がほかにあれば、型チェックで分かる。あれば `challengeBest: {}` を足す）

- [ ] **Step 5: コミット**

```bash
git add src/lib/progress-store.ts src/lib/progress-store.test.ts
git commit -m "feat: チャレンジの最高点（あそびごと）を記録に足す"
```

---

### Task 4: 共通の部品の手直しと、クリア後の「もういちど」

**Files:**
- Modify: `src/lib/bgm-route.ts`、Test: `src/lib/bgm-route.test.ts`
- Modify: `src/components/play/use-speed-play.ts`
- Create: `src/components/play/problem-text.tsx`
- Modify: `src/components/stage-player.tsx`（問題の表示を `ProblemText` に）
- Modify: `src/components/play/stage-result.tsx`

**Interfaces:**
- Consumes: `AnswerInput.bonusPoints`（Task 2）
- Produces:
  - `bgmTrackFor("/challenge/add") === "quiz"`、`bgmTrackFor("/challenge") === "home"`
  - `useSpeedPlay` の戻り値に `submit(correct, remainingAfter, bonusPoints = 0): AnswerOutcome` と `finish(): PlaySession`
  - `ProblemText({ problem }: { problem: Problem })`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/bgm-route.test.ts` の1つ目のテストに足す:

```ts
it("チャレンジのプレイ画面はクイズ用、入口はホーム用", () => {
  expect(bgmTrackFor("/challenge/add")).toBe("quiz");
  expect(bgmTrackFor("/challenge/mix")).toBe("quiz");
  expect(bgmTrackFor("/challenge")).toBe("home");
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/bgm-route.test.ts`
Expected: FAIL（`/challenge/add` が `home`）

- [ ] **Step 3: 実装する**

`src/lib/bgm-route.ts`:

```ts
export type BgmTrack = "home" | "quiz" | "fever";

const PLAY_PREFIXES = ["/stage/", "/flash/", "/challenge/"];

export function bgmTrackFor(pathname: string): BgmTrack {
  return PLAY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ? "quiz" : "home";
}
```

`src/components/play/use-speed-play.ts` の `submit` を置き換え、`finish` を足し、戻り値に入れる:

```ts
  function submit(correct: boolean, remainingAfter: number, bonusPoints = 0): AnswerOutcome {
    const outcome = answer(session, { correct, elapsedMs: clock.stop(), secondsPerProblem, remainingAfter, bonusPoints });
```

（`submit` の残りはそのまま）

```ts
  /** 時間切れで終わるとき。時計を止め、フィーバー中なら終えて曲を戻し、最後の状態を返す */
  function finish(): PlaySession {
    clock.stop();
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner(false);
    if (session.feverLeft === 0) return session;
    playBgm("quiz");
    const ended = { ...session, gauge: 0, feverLeft: 0 };
    setSession(ended);
    return ended;
  }
```

```ts
  return { session, banner, lastGain, submit, finish, reset, getElapsedMs };
```

`src/components/play/problem-text.tsx`:

```tsx
import type { Operator, Problem } from "@/lib/game/problem-rules";

const OPERATOR_SYMBOL: Record<Operator, string> = { add: "＋", sub: "−", mul: "×", div: "÷" };

export function ProblemText({ problem }: { problem: Problem }) {
  return (
    <p className="font-display text-4xl font-black tracking-wide">
      {problem.operandA} {OPERATOR_SYMBOL[problem.operator]} {problem.operandB} ＝
    </p>
  );
}
```

`src/components/stage-player.tsx`:
- `const OPERATOR_SYMBOL …` の行を消す
- `import { generateProblems, type Operator, type Problem }` を `import { generateProblems, type Problem }` にする
- `import { ProblemText } from "@/components/play/problem-text";` を足す（`PointsPopup` の import の下）
- 問題の `<p>` を置き換える:

```tsx
        {problem && <ProblemText problem={problem} />}
```

`src/components/play/stage-result.tsx` のボタンの `<div className="flex flex-col gap-3">` の中身を置き換える:

```tsx
      <div className="flex flex-col gap-3">
        {cleared && links.nextHref && (
          <Link href={links.nextHref} className={appButtonVariants({ variant: "cta", size: "xl" })}>
            つぎのステージへ
          </Link>
        )}
        {/* つぎのステージがあるときは、そちらを目立たせる */}
        <AppButton
          variant={cleared && links.nextHref ? "primary" : "cta"}
          size={cleared && links.nextHref ? "lg" : "xl"}
          onClick={onRetry}
        >
          もういちど
        </AppButton>
        <Link href={links.backHref} className={appButtonVariants({ variant: "cream", size: "lg" })}>
          もどる
        </Link>
      </div>
```

（クリアして★が増えた回に「もういちど」を押すと、ステージ選択でタネが育つ演出は出ない。★はもう保存されているので、演出だけを見送る。ledger に Ruling として残す）

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 5: 画面で確かめる（Playwright）**

`npm run dev` を背景で起動し（PIDを控え、終わったらそのPIDだけを止める）、scratchpad に `check-retry.mjs` を作る:

```js
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

async function solveArithmetic() {
  const text = await page.locator("main p").filter({ hasText: "＝" }).first().textContent();
  const nums = text.match(/\d+/g).map(Number);
  const op = text.match(/[＋−×÷]/)[0];
  return { "＋": nums[0] + nums[1], "−": nums[0] - nums[1], "×": nums[0] * nums[1], "÷": nums[0] / nums[1] }[op];
}

async function type(n) {
  for (const d of String(n)) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
}

await page.goto(base);
await page.evaluate(() => localStorage.setItem("tane:progress:v1", JSON.stringify({ stars: {}, titleSeen: true })));

// ふつうのステージ: クリア → 「もういちど」で同じステージが最初から
await page.goto(`${base}/stage/add-1`);
for (let i = 0; i < 20; i++) {
  await type(await solveArithmetic());
  await page.waitForTimeout(700);
}
await page.getByText("ステージクリア！").waitFor();
await page.getByRole("link", { name: "つぎのステージへ" }).waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: "retry-cleared.png" });
await page.getByRole("button", { name: "もういちど" }).click();
await page.getByText("1 / 20").waitFor();
if (!(await page.getByText("PT 0").isVisible())) throw new Error("点数が0に戻っていない");
if (!page.url().endsWith("/stage/add-1")) throw new Error(`URL: ${page.url()}`);

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-retry.mjs http://localhost:3000`（scratchpad で）
Expected: `OK`。`retry-cleared.png` で「つぎのステージへ」「もういちど」「もどる」の3つが並び、重なりがないことを目で確かめる

続けて分割2aの `check-speed.mjs` も流し、`OK` を確かめる（問題の表示を `ProblemText` に変えても、答えの読み取りが同じに動くこと）。

- [ ] **Step 6: コミット**

```bash
git add src/lib/bgm-route.ts src/lib/bgm-route.test.ts src/components/play/use-speed-play.ts src/components/play/problem-text.tsx src/components/stage-player.tsx src/components/play/stage-result.tsx
git commit -m "feat: クリアした結果画面に「もういちど」を足し、チャレンジ用に曲・点数・問題の表示を手直し"
```

---

### Task 5: チャレンジの見た目の部品

**Files:**
- Create: `src/components/challenge/medal-badge.tsx`
- Create: `src/components/challenge/challenge-banners.tsx`
- Create: `src/components/challenge/challenge-timer.tsx`
- Create: `src/components/challenge/challenge-mode-card.tsx`
- Create: `src/components/challenge/challenge-result.tsx`

**Interfaces:**
- Consumes: Task 1 の `CHALLENGE_LABELS`・`CHALLENGE_MS`・`WARNING_MS`・`remainingMs`・`medalFor`・`medalRank`・`nextMedalGoal`・`Medal`・`ChallengeModeId`、2aの `useCountUp`・`Panel`・`AppButton`・`appButtonVariants`・`SPRU_POSES`
- Produces:
  - `MedalBadge({ medal, size?: "sm" | "md" | "lg" })`、`MEDAL_LABELS: Record<Medal, string>`（どう・ぎん・きん）
  - `LevelBadge({ level })`、`LevelUpText({ at: number | null })`、`CountdownBanner({ count })`（0で「スタート！」）、`TimeUpBanner()`
  - `ChallengeTimer({ getElapsedMs, running, onTimeUp })`（`role="timer"`、`data-warning`）
  - `ChallengeModeCard({ modeId, best: number | null })`
  - `interface ChallengeOutcome { score; correctCount; topLevel; newBest; bestBefore: number | null }`、`ChallengeResult({ modeId, outcome, onRetry })`

この Task は画面にまだつながらないので、確かめるのは型チェックと lint まで。見た目は Task 6 で確かめる。

- [ ] **Step 1: メダル**

`src/components/challenge/medal-badge.tsx`:

```tsx
import { Medal as MedalIcon } from "lucide-react";

import type { Medal } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

export const MEDAL_LABELS: Record<Medal, string> = { bronze: "どう", silver: "ぎん", gold: "きん" };

const MEDAL_STYLES: Record<Medal, string> = {
  bronze: "border-[#a8683a] bg-[#e8ad7a]",
  silver: "border-[#8f9ba5] bg-[#dfe5ea]",
  gold: "border-[#c98f12] bg-[#ffd84d]",
};

export function MedalBadge({ medal, size = "md" }: { medal: Medal; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      role="img"
      aria-label={`${MEDAL_LABELS[medal]}メダル`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-b-[3px] font-display font-black text-[#5a3b12]",
        MEDAL_STYLES[medal],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-0.5 text-sm",
        size === "lg" && "animate-pop-in px-5 py-1.5 text-2xl"
      )}
    >
      <MedalIcon className={size === "lg" ? "h-7 w-7" : "h-4 w-4"} strokeWidth={2.5} />
      {MEDAL_LABELS[medal]}
    </span>
  );
}
```

- [ ] **Step 2: 段・カウントダウン・タイムアップの表示**

`src/components/challenge/challenge-banners.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black whitespace-nowrap">
      だん {level}
    </span>
  );
}

/** 段が上がったときに出す。at（上がったときの正解の数）が変わるたびに動きが最初から始まる */
export function LevelUpText({ at }: { at: number | null }) {
  if (at === null) return null;
  return (
    <p
      key={at}
      role="status"
      className="absolute top-3 left-3 animate-pop-in rounded-full bg-primary px-3 py-0.5 font-display text-sm font-black text-primary-foreground"
    >
      レベルアップ！
    </p>
  );
}

/** 3・2・1 と「スタート！」（count が 0 のとき） */
export function CountdownBanner({ count }: { count: number }) {
  return (
    <p
      key={count}
      role="status"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-pop-in text-center font-display font-black text-cta-to [text-shadow:0_4px_0_#fff]",
        count > 0 ? "text-8xl" : "text-5xl"
      )}
    >
      {count > 0 ? count : "スタート！"}
    </p>
  );
}

export function TimeUpBanner() {
  return (
    <p
      role="status"
      className="pointer-events-none absolute inset-x-0 top-1/3 z-30 animate-fever-banner text-center font-display text-5xl font-black text-[#ffe14d] [text-shadow:0_4px_0_#b81e5d,0_0_18px_#ff3d8b]"
    >
      タイムアップ！
    </p>
  );
}
```

- [ ] **Step 3: 残り時間**

`src/components/challenge/challenge-timer.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { CHALLENGE_MS, remainingMs, WARNING_MS } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

const TICK_MS = 100;

/** 残り時間を出し、0になったら onTimeUp を呼ぶ（呼ぶ側で1回だけにする）。running の間だけ見張る */
export function ChallengeTimer({
  getElapsedMs,
  running,
  onTimeUp,
}: {
  getElapsedMs: () => number;
  running: boolean;
  onTimeUp: () => void;
}) {
  const [left, setLeft] = useState(CHALLENGE_MS);
  const getRef = useRef(getElapsedMs);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    getRef.current = getElapsedMs;
    onTimeUpRef.current = onTimeUp;
  });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const next = remainingMs(getRef.current());
      setLeft(next);
      if (next === 0) onTimeUpRef.current();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const warning = left <= WARNING_MS;
  const seconds = Math.ceil(left / 1000);

  return (
    <div
      role="timer"
      aria-label={`のこり ${seconds}びょう`}
      data-warning={warning ? "true" : "false"}
      className="flex flex-1 items-center gap-2"
    >
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn("h-full rounded-full transition-[width] duration-100", warning ? "bg-destructive" : "bg-[#2b6fa3]")}
          style={{ width: `${(left / CHALLENGE_MS) * 100}%` }}
        />
      </div>
      {/* 紫のフィーバー画面の上でも読めるよう、白い札に載せる */}
      <span
        className={cn(
          "min-w-14 rounded-full bg-white/85 px-2 text-center font-display text-2xl font-black tabular-nums",
          warning ? "animate-pulse-soft text-destructive" : "text-[#2b6fa3]"
        )}
      >
        {seconds}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: 入口のカード**

`src/components/challenge/challenge-mode-card.tsx`:

```tsx
import Link from "next/link";
import { Shuffle } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { MedalBadge } from "@/components/challenge/medal-badge";
import { MODES } from "@/data/stages/catalog";
import { CHALLENGE_LABELS, medalFor, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

export function ChallengeModeCard({ modeId, best }: { modeId: ChallengeModeId; best: number | null }) {
  const medal = medalFor(modeId, best);
  return (
    <Link
      href={`/challenge/${modeId}`}
      className={cn(appButtonVariants({ variant: "cream", size: "lg" }), "h-20 w-full justify-start gap-3 px-4")}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl text-primary-foreground">
        {modeId === "mix" ? <Shuffle className="h-6 w-6" strokeWidth={3} /> : MODES[modeId].symbol}
      </span>
      <span className="flex flex-1 flex-col items-start gap-0.5">
        <span className="text-xl">{CHALLENGE_LABELS[modeId]}</span>
        <span className="text-xs text-muted-foreground">
          {best === null ? "まだ きろくなし" : `さいこう ${best.toLocaleString("ja-JP")} PT`}
        </span>
      </span>
      {medal && <MedalBadge medal={medal} size="sm" />}
    </Link>
  );
}
```

- [ ] **Step 5: 結果**

`src/components/challenge/challenge-result.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { MEDAL_LABELS, MedalBadge } from "@/components/challenge/medal-badge";
import { useCountUp } from "@/components/play/use-count-up";
import { CHALLENGE_LABELS, medalFor, medalRank, nextMedalGoal, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { SPRU_POSES } from "@/lib/spru-images";

export interface ChallengeOutcome {
  score: number;
  correctCount: number;
  topLevel: number;
  newBest: boolean;
  bestBefore: number | null;
}

const SCORE_COUNT_MS = 1200;

export function ChallengeResult({
  modeId,
  outcome,
  onRetry,
}: {
  modeId: ChallengeModeId;
  outcome: ChallengeOutcome;
  onRetry: () => void;
}) {
  const score = useCountUp(outcome.score, SCORE_COUNT_MS, 0);
  const best = Math.max(outcome.score, outcome.bestBefore ?? 0);
  const medal = medalFor(modeId, outcome.score);
  const medalUp = medalRank(medalFor(modeId, best)) > medalRank(medalFor(modeId, outcome.bestBefore));
  const goal = nextMedalGoal(modeId, best);

  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image src={SPRU_POSES.cheer} alt="" width={120} height={160} priority className="h-28 w-auto animate-pop-in" />
        <p className="font-display text-sm font-black text-muted-foreground">{CHALLENGE_LABELS[modeId]} チャレンジ</p>
        <h1 className="font-display text-3xl font-black">タイムアップ！</h1>
        <p className="font-display text-4xl font-black text-cta-to" aria-label={`${outcome.score}てん`}>
          {score.toLocaleString("ja-JP")}
          <span className="ml-1 text-lg">PT</span>
        </p>
        {medal && <MedalBadge medal={medal} size={medalUp ? "lg" : "md"} />}
        {medalUp && <p className="animate-pop-in font-display text-sm font-black text-primary">あたらしい メダル！</p>}
        {outcome.newBest ? (
          <p className="animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white">
            さいこうきろく！
          </p>
        ) : (
          outcome.bestBefore !== null && (
            <p className="text-sm font-bold text-muted-foreground">
              さいこう {outcome.bestBefore.toLocaleString("ja-JP")} PT
            </p>
          )
        )}
        <p className="font-bold">
          せいかい {outcome.correctCount}もん ・ とどいた だん {outcome.topLevel}
        </p>
        {goal && (
          <p className="font-display text-sm font-black text-[#2b6fa3]">
            あと {goal.pointsLeft.toLocaleString("ja-JP")}てんで {MEDAL_LABELS[goal.medal]}メダル！
          </p>
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        <AppButton variant="cta" size="xl" onClick={onRetry}>
          もういちど
        </AppButton>
        <Link href="/challenge" className={appButtonVariants({ variant: "cream", size: "lg" })}>
          あそびを えらぶ
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: 型チェックと lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS（`SPRU_POSES.cheer` は分割1からある。無ければ `src/lib/spru-images.ts` で名前を確かめて合わせ、Ruling を残す）

- [ ] **Step 7: コミット**

```bash
git add src/components/challenge
git commit -m "feat: チャレンジの見た目の部品（メダル・段・カウントダウン・残り時間・入口のカード・結果）を追加"
```

---

### Task 6: 入口とプレイ画面をつなぐ

**Files:**
- Create: `src/components/challenge/challenge-entrance.tsx`・`challenge-entrance-loader.tsx`
- Create: `src/components/challenge/challenge-player.tsx`・`challenge-player-loader.tsx`
- Create: `src/app/challenge/page.tsx`・`src/app/challenge/[modeId]/page.tsx`
- Modify: `src/components/home/mode-buttons.tsx`

**Interfaces:**
- Consumes: Task 1〜5 のすべて、2aの `useSpeedPlay`（`submit`・`finish`・`reset`・`getElapsedMs`・`session`・`banner`・`lastGain`）、`GaugeBar`・`ScoreCounter`・`FeverStage`・`FeverBanner`・`FeverFriends`・`ComboText`・`PointsPopup`・`FeedbackText`・`poseFor`・`NumericKeypad`・`Panel`・`TopBar`、`isChallengeUnlocked`・`CHALLENGE_UNLOCK_STARS`、`useProgress`
- Produces: ページ `/challenge` と `/challenge/[modeId]`。プレイ画面の `<main>` に `data-phase`（`countdown`・`playing`・`timeup`）と `data-fever`

- [ ] **Step 1: 入口**

`src/components/challenge/challenge-entrance.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TopBar } from "@/components/app/top-bar";
import { ChallengeModeCard } from "@/components/challenge/challenge-mode-card";
import { CHALLENGE_MODE_IDS } from "@/lib/game/challenge-rules";
import { isChallengeUnlocked } from "@/lib/game/progression";
import { useProgress } from "@/lib/progress-store";

export function ChallengeEntrance() {
  const router = useRouter();
  const { stars, challengeBest } = useProgress();
  const unlocked = isChallengeUnlocked(stars);

  // ★30に届く前に URL を直接開いたら、ホームへ戻す
  useEffect(() => {
    if (!unlocked) router.replace("/");
  }, [unlocked, router]);

  if (!unlocked) return null;
  return (
    <main className="flex flex-1 flex-col gap-3 pb-6">
      <TopBar title="チャレンジ" backHref="/" />
      <div className="px-4 text-center">
        <p className="font-display text-lg font-black text-[#2b6fa3]">60びょうで どこまで いける？</p>
        <p className="text-xs font-bold text-muted-foreground">つづけて せいかいすると むずかしく なるよ</p>
      </div>
      <ul className="flex flex-col gap-2 px-4">
        {CHALLENGE_MODE_IDS.map((id) => (
          <li key={id}>
            <ChallengeModeCard modeId={id} best={challengeBest[id] ?? null} />
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/components/challenge/challenge-entrance-loader.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

// 開いているかどうかと最高点が localStorage で決まるため、サーバーでは描かない
const ChallengeEntrance = dynamic(
  () => import("@/components/challenge/challenge-entrance").then((mod) => mod.ChallengeEntrance),
  { ssr: false, loading: () => <div className="flex-1" /> }
);

export function ChallengeEntranceLoader() {
  return <ChallengeEntrance />;
}
```

`src/app/challenge/page.tsx`:

```tsx
import { ChallengeEntranceLoader } from "@/components/challenge/challenge-entrance-loader";

export default function ChallengePage() {
  return <ChallengeEntranceLoader />;
}
```

- [ ] **Step 2: プレイ画面**

`src/components/challenge/challenge-player.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { CountdownBanner, LevelBadge, LevelUpText, TimeUpBanner } from "@/components/challenge/challenge-banners";
import { ChallengeResult, type ChallengeOutcome } from "@/components/challenge/challenge-result";
import { ChallengeTimer } from "@/components/challenge/challenge-timer";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { GaugeBar } from "@/components/play/gauge-bar";
import { PointsPopup } from "@/components/play/points-popup";
import { ProblemText } from "@/components/play/problem-text";
import { ScoreCounter } from "@/components/play/score-counter";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { isTimeUp, levelPoints, nextProblem, secondsFor, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { answerChallenge, INITIAL_CHALLENGE, type ChallengeState } from "@/lib/game/challenge-session";
import { isChallengeUnlocked } from "@/lib/game/progression";
import type { Problem } from "@/lib/game/problem-rules";
import { recordChallengeResult, useProgress } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 600;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
const TIME_UP_MS = 1500;

type Phase = "countdown" | "playing" | "timeup" | "result";

export function ChallengePlayer({ modeId }: { modeId: ChallengeModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const unlocked = isChallengeUnlocked(stars);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeState>(INITIAL_CHALLENGE);
  // 問題は Math.random で作るため、ChallengePlayerLoader が ssr: false で読み込む
  const [problem, setProblem] = useState<Problem>(() => nextProblem(modeId, 1, null));
  const [asked, setAsked] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [levelUpAt, setLevelUpAt] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<ChallengeOutcome | null>(null);
  // 残り時間の見張りと答えの両方から時間切れが来ても、記録は1回だけにする
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speed = useSpeedPlay({
    secondsPerProblem: secondsFor(modeId, challenge.level, problem),
    answerable: phase === "playing" && feedback === null,
    questionKey: asked,
  });

  useEffect(() => {
    if (!unlocked) router.replace("/");
  }, [unlocked, router]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setTimeout(() => (count > 0 ? setCount(count - 1) : setPhase("playing")), COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  function schedule(fn: () => void, ms: number) {
    timeoutsRef.current.push(setTimeout(fn, ms));
  }

  function clearScheduled() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.length = 0;
  }

  // 記録はこの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
  function timeUp() {
    if (endedRef.current) return;
    endedRef.current = true;
    const session = speed.finish();
    const record = recordChallengeResult(modeId, session.score);
    setOutcome({
      score: session.score,
      correctCount: challenge.correctCount,
      topLevel: challenge.topLevel,
      ...record,
    });
    setFeedback(null);
    setInputValue("");
    setPhase("timeup");
    play("allCorrect");
    schedule(() => setPhase("result"), TIME_UP_MS);
  }

  function handleSubmit() {
    if (phase !== "playing" || inputValue === "" || feedback !== null) return;
    // 0びょうを過ぎてから押した答えは数えない（設計書2.2）
    if (isTimeUp(speed.getElapsedMs())) return timeUp();
    const correct = Number(inputValue) === problem.answer;
    const step = answerChallenge(challenge, correct);
    speed.submit(correct, Number.POSITIVE_INFINITY, levelPoints(challenge.level));
    setFeedback(correct ? "correct" : "incorrect");
    play(correct ? "correct" : "incorrect");
    setInputValue("");
    schedule(() => {
      setChallenge(step.state);
      setProblem(nextProblem(modeId, step.state.level, problem));
      setAsked((n) => n + 1);
      setLevelUpAt(step.leveledUp ? step.state.correctCount : null);
      setFeedback(null);
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    clearScheduled();
    speed.reset();
    endedRef.current = false;
    setChallenge(INITIAL_CHALLENGE);
    setProblem(nextProblem(modeId, 1, null));
    setAsked(0);
    setLevelUpAt(null);
    setOutcome(null);
    setFeedback(null);
    setInputValue("");
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
    setRound((n) => n + 1);
  }

  if (!unlocked) return null;
  if (phase === "result" && outcome) return <ChallengeResult modeId={modeId} outcome={outcome} onRetry={retry} />;

  const inFever = speed.session.feverLeft > 0;

  return (
    <main
      data-phase={phase}
      data-fever={inFever ? "true" : "false"}
      className="relative isolate flex flex-1 flex-col gap-2 pb-4"
    >
      <FeverStage active={inFever} />
      <header className="flex items-center gap-2 px-3 pt-3">
        <Link href="/challenge" aria-label="やめる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
          <X className="h-6 w-6" strokeWidth={3} />
        </Link>
        <LevelBadge level={challenge.level} />
        {/* もういちどのたびに作り直し、前の回の残り時間を引き継がない */}
        <ChallengeTimer key={round} getElapsedMs={speed.getElapsedMs} running={phase === "playing"} onTimeUp={timeUp} />
      </header>
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={speed.session.gauge} feverLeft={speed.session.feverLeft} />
        <ScoreCounter score={speed.session.score} />
      </div>
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-2",
          feedback === "incorrect" && "animate-shake"
        )}
      >
        <ComboText combo={speed.session.combo} />
        <LevelUpText at={levelUpAt} />
        <span key={speed.session.answered} className={feedback === "correct" ? "block animate-spru-hop" : "block"}>
          <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        </span>
        {/* カウントダウン中は問題を見せない（先に考えられないように） */}
        {phase === "countdown" ? <p className="h-10" /> : <ProblemText problem={problem} />}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
        <PointsPopup gain={feedback === "correct" ? speed.lastGain : null} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={phase !== "playing" || feedback !== null}
        />
      </div>
      <FeverBanner show={speed.banner} />
      {phase === "countdown" && <CountdownBanner count={count} />}
      {phase === "timeup" && <TimeUpBanner />}
    </main>
  );
}
```

`src/components/challenge/challenge-player-loader.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

import type { ChallengeModeId } from "@/lib/game/challenge-rules";

const ChallengePlayer = dynamic(
  () => import("@/components/challenge/challenge-player").then((mod) => mod.ChallengePlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function ChallengePlayerLoader({ modeId }: { modeId: ChallengeModeId }) {
  // あそびを変えたら作り直す（前のあそびの段や点数を引き継がない）
  return <ChallengePlayer key={modeId} modeId={modeId} />;
}
```

`src/app/challenge/[modeId]/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { ChallengePlayerLoader } from "@/components/challenge/challenge-player-loader";
import { isChallengeModeId } from "@/lib/game/challenge-rules";

export default async function ChallengePlayPage({ params }: { params: Promise<{ modeId: string }> }) {
  const { modeId } = await params;
  // フラッシュなど、チャレンジに無いあそびは入口へ
  if (!isChallengeModeId(modeId)) redirect("/challenge");
  return <ChallengePlayerLoader modeId={modeId} />;
}
```

- [ ] **Step 3: ホームのチャレンジボタン**

`src/components/home/mode-buttons.tsx`:
- `showChallengeNotice` を `showLockedNotice` にして、中身を鍵のお知らせだけにする:

```tsx
  function showLockedNotice() {
    setNotice(`★を ${CHALLENGE_UNLOCK_STARS}こ あつめると ひらくよ`);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }
```

- チャレンジの `<button>…</button>` を置き換える:

```tsx
      {challengeOpen ? (
        <Link href="/challenge" className={cn(appButtonVariants({ variant: "warning" }), TILE)}>
          <Timer className="h-6 w-6" />
          チャレンジ
          <span className="text-[10px]">60びょう</span>
        </Link>
      ) : (
        <button type="button" onClick={showLockedNotice} className={cn(appButtonVariants({ variant: "locked" }), TILE)}>
          <Timer className="h-6 w-6" />
          チャレンジ
          <span className="text-[10px]">★{CHALLENGE_UNLOCK_STARS}で ひらくよ</span>
        </button>
      )}
```

- [ ] **Step 4: テスト・型チェック・lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS。lint が `react-hooks/refs`・`react-hooks/set-state-in-effect` などで落ちたら、指摘の場所だけを直し、Ruling を残す

- [ ] **Step 5: 画面で確かめる（Playwright）**

`npm run dev` を背景で起動し、scratchpad に `check-challenge.mjs` を作る:

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

// たしざん1〜10を★3で、ちょうど★30
const UNLOCKED = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`add-${i + 1}`, 3]));

async function seed(page, progress = { stars: UNLOCKED, titleSeen: true }) {
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

const phase = (page) => page.locator("main").getAttribute("data-phase");
const isFever = (page) => page.locator("main").getAttribute("data-fever");
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("tane:progress:v1")));

// 時計を止めて入れた page で、カウントダウン（3・2・1・スタート！）を進める
async function startChallenge(page, modeId) {
  await page.goto(`${base}/challenge/${modeId}`);
  await page.getByRole("status").filter({ hasText: /^3$/ }).waitFor();
  await page.clock.runFor(4 * 700 + 100);
  if ((await phase(page)) !== "playing") throw new Error("カウントダウンのあと始まらない");
}

async function answerRight(page) {
  await type(page, await solveArithmetic(page));
  await page.clock.runFor(700);
}

async function answerWrong(page) {
  await type(page, (await solveArithmetic(page)) + 1);
  await page.clock.runFor(700);
}

async function setHidden(page, hidden) {
  await page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (h ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

// 1. ★30未満: ボタンは鍵、URL を直接開いてもホームへ
{
  const page = await newPage();
  await seed(page, { stars: { "add-1": 3 }, titleSeen: true });
  await page.goto(base);
  await page.getByRole("button", { name: /チャレンジ/ }).click();
  await page.getByText("★を 30こ あつめると ひらくよ").waitFor();
  await page.goto(`${base}/challenge`);
  await page.waitForURL(`${base}/`);
  await page.goto(`${base}/challenge/add`);
  await page.waitForURL(`${base}/`);
  await page.close();
}

// 2. ★30: 入口に5つのカード。チャレンジに無いあそびは入口へ
{
  const page = await newPage();
  await seed(page);
  await page.goto(base);
  await page.getByRole("link", { name: /チャレンジ/ }).click();
  await page.waitForURL(/\/challenge$/);
  for (const label of ["たしざん", "ひきざん", "かけざん", "わりざん", "まぜまぜ"]) {
    await page.getByRole("link", { name: new RegExp(label) }).waitFor();
  }
  if ((await page.getByText("まだ きろくなし").count()) !== 5) throw new Error("記録なしが5つでない");
  await page.screenshot({ path: "challenge-entrance.png" });
  await page.goto(`${base}/challenge/flash`);
  await page.waitForURL(/\/challenge$/);
  await page.goto(`${base}/challenge/foo`);
  await page.waitForURL(/\/challenge$/);
  await page.close();
}

// 3. 段が上がる・下がる → フィーバー → 残り10秒で赤 → フィーバー中にタイムアップ → 結果 → もういちど
{
  const page = await newPage();
  await page.clock.install();
  await seed(page);
  await startChallenge(page, "add");
  await page.getByText("だん 1").waitFor();
  if ((await page.getByRole("timer").textContent()).trim() !== "60") throw new Error("60びょうから始まらない");

  await answerRight(page);
  await answerRight(page);
  await page.getByText("だん 2").waitFor();
  await page.getByText("レベルアップ！").waitFor();
  await page.screenshot({ path: "challenge-levelup.png" });
  await answerWrong(page);
  await page.getByText("だん 1").waitFor();

  // ゲージ: 30 → 10 → 速い正解 +15 を6回で満タン → 7回目はフィーバー中
  for (let i = 0; i < 7; i++) await answerRight(page);
  if ((await isFever(page)) !== "true") throw new Error("フィーバーに入っていない");
  await page.getByText("だん 4").waitFor();
  await page.screenshot({ path: "challenge-fever.png" });

  await page.clock.fastForward(51_000);
  await page.clock.runFor(200);
  if ((await page.getByRole("timer").getAttribute("data-warning")) !== "true") throw new Error("残り10秒で赤にならない");
  await page.screenshot({ path: "challenge-warning.png" });

  await page.clock.fastForward(10_000);
  await page.clock.runFor(200);
  await page.getByText("タイムアップ！").waitFor();
  if ((await phase(page)) !== "timeup") throw new Error("タイムアップにならない");
  if ((await isFever(page)) !== "false") throw new Error("タイムアップでフィーバーが残っている");

  await page.clock.runFor(1600);
  await page.getByRole("heading", { name: "タイムアップ！" }).waitFor();
  await page.getByText("さいこうきろく！").waitFor();
  // 正解は 2＋7＝9回、段は 1→2→1→2→3→4
  await page.getByText("せいかい 9もん ・ とどいた だん 4").waitFor();
  await page.getByText(/あと [\d,]+てんで (どう|ぎん|きん)メダル！/).waitFor();
  await page.clock.runFor(1500);
  await page.screenshot({ path: "challenge-result.png" });
  const best = (await stored(page)).challengeBest?.add;
  if (!(best > 0)) throw new Error(`最高点が ${best}`);

  await page.getByRole("button", { name: "もういちど" }).click();
  if ((await phase(page)) !== "countdown") throw new Error("もういちどでカウントダウンにならない");
  await page.clock.runFor(4 * 700 + 100);
  await page.getByText("だん 1").waitFor();
  await page.getByText("PT 0").waitFor();
  if ((await page.getByRole("timer").textContent()).trim() !== "60") throw new Error("もういちどで60びょうに戻らない");
  if ((await isFever(page)) !== "false") throw new Error("もういちどでフィーバーが残っている");
  await page.close();
}

// 4. ページが隠れている間は、残り時間が減らない
{
  const page = await newPage();
  await page.clock.install();
  await seed(page);
  await startChallenge(page, "sub");
  await setHidden(page, true);
  await page.clock.fastForward(120_000);
  await setHidden(page, false);
  await page.clock.runFor(400);
  const left = Number((await page.getByRole("timer").textContent()).trim());
  if (!(left >= 59)) throw new Error(`隠れている間に減った: のこり ${left}`);
  if ((await phase(page)) !== "playing") throw new Error("隠れている間に終わった");
  await page.close();
}

// 5. 途中で「やめる」と、最高点は保存しない
{
  const page = await newPage();
  await page.clock.install();
  await seed(page);
  await startChallenge(page, "mix");
  await answerRight(page);
  await answerRight(page);
  await page.getByRole("link", { name: "やめる" }).click();
  await page.waitForURL(/\/challenge$/);
  if ((await stored(page)).challengeBest?.mix !== undefined) throw new Error("やめた回が保存された");
  const card = await page.getByRole("link", { name: /まぜまぜ/ }).textContent();
  if (!card.includes("まだ きろくなし")) throw new Error("まぜまぜに記録が出ている");
  await page.close();
}

// 6. 動きを減らす設定でも、段と点数は正しく出る
{
  const page = await newPage({ reducedMotion: "reduce" });
  await page.clock.install();
  await seed(page);
  await startChallenge(page, "div");
  await answerRight(page);
  await answerRight(page);
  await page.getByText("レベルアップ！").waitFor();
  await page.getByText("だん 2").waitFor();
  if (await page.getByText("PT 0").isVisible()) throw new Error("点数が入っていない");
  await page.close();
}

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-challenge.mjs http://localhost:3000`（scratchpad で）
Expected: `OK`。`challenge-entrance.png`（5つのカード）・`challenge-levelup.png`（だん 2・レベルアップ！）・`challenge-fever.png`（紫の背景・仲間・だん 4）・`challenge-warning.png`（赤い残り時間）・`challenge-result.png`（点数・メダル・さいこうきろく！・あと○てん・ボタン2つ）を開き、文字の重なりや切れがないかを目で確かめる

続けて分割1・2aの確認スクリプト（`check-home.mjs`・`check-mode.mjs`・`check-play.mjs`・`check-friends-settings.mjs`・`check-back.mjs`・`check-speed.mjs`）も流し、`OK` を確かめる。`check-home.mjs` の6番（チャレンジは鍵のお知らせ）は、入れている★が30未満なのでそのまま通るはず。30以上を入れていて落ちる場合は、★を減らして通し、Ruling を残す。

- [ ] **Step 6: コミット**

```bash
git add src/components/challenge src/app/challenge src/components/home/mode-buttons.tsx
git status --short
git commit -m "feat: チャレンジの入口とプレイ画面をつなぎ、ホームのチャレンジボタンから遊べるようにする"
```

---

### Task 7: 通しの確認・記録・プッシュ

**Files:**
- Modify: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（末尾に追記。gitの管理外）

- [ ] **Step 1: すべてのチェック**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS。ビルドの一覧に `/challenge` と `/challenge/[modeId]` が出る

- [ ] **Step 2: 本番と同じ形で、古い記録から起動する（Playwright）**

`npx next start -p 3002` で起動し（PIDを控える）、scratchpad の `check-old-record.mjs` の記録を入れる部分のあとに、次を足す（分割2aのものは残す）:

```js
// チャレンジの最高点が無い記録・壊れた値・知らないあそび
await page.evaluate(() =>
  localStorage.setItem(
    "tane:progress:v1",
    JSON.stringify({
      stars: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`add-${i + 1}`, 3])),
      best: { "add-1": 1200 },
      challengeBest: { add: "x", flash: 900, mix: 2400 },
      titleSeen: true,
    })
  )
);
await page.goto(`${base}/challenge`);
await page.getByText("さいこう 2,400 PT").waitFor();
if ((await page.getByText("まだ きろくなし").count()) !== 4) throw new Error("壊れた値が記録として出ている");
```

Run: `node check-old-record.mjs http://localhost:3002` と `node check-challenge.mjs http://localhost:3002`（scratchpad で）
Expected: どちらも `OK`。終わったら控えたPIDだけを止める

BGM（チャレンジ中のクイズの曲・フィーバーの曲・タイムアップで曲が戻ること）は、Owner が実機で確かめる。

- [ ] **Step 3: 開発の記録に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` の末尾に、実際に起きたことに合わせて追記する:

```markdown

## 2026-10-14 チャレンジ（分割2b）

- 設計書: `2026-10-14-challenge-design.md`、実装計画: `docs/superpowers/plans/2026-10-14-tane-challenge.md`
- できたこと: ★30で開くチャレンジの入口（5つのあそび・最高点・メダル）、60秒のタイムアタック（3・2・1・スタート、2問続けて正解で段が上がる・間違えると下がる、段の点、残り10秒で赤、タイムアップ）、結果画面（点数・メダル・さいこうきろく・あと○てん・もういちど）、ふつうのステージのクリア後の「もういちど」
- 決めたこと・つまずいたこと: （実装中の判断と、その理由）
- 次: 分割3（なかま図鑑）。数値は遊んでみて調整する（`src/lib/game/challenge-rules.ts`）
```

- [ ] **Step 4: プッシュ**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git push -u origin feature/challenge
```

（`master` へのマージは、最後のレビューのあと Owner に確認してから行う）
