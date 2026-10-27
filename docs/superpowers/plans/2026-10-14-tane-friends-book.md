# Tane なかま図鑑（分割3） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「なかま」画面を図鑑にする。54体に名前とひとことを付け、さわるとカードが開き、初めてクリアしたときに「なかまに なった！」を出す。あそびごとのコンプリート、チャレンジのメダル、にわに出す子の選択を加える。

**Architecture:** 名前とひとことはデータ（`src/data/friends.ts`）、会えたか・次の段階・コンプリートなどのルールは画面を含まない関数（`src/lib/game/friends.ts`、`progression.ts` の `gardenFriends`）、にわに出す子は記録（`progress-store.ts` の `garden`）に置く。画面は `components/friends/` に図鑑の部品とカード、`components/play/new-friend.tsx` に演出を置き、結果画面（ステージとフラッシュで共通の `StageResult`）から出す。

**Tech Stack:** Next.js 16.2.10（App Router）、React 19.2.4、TypeScript、Tailwind CSS v4、Vitest 3、lucide-react。画面の確認は Playwright（scratchpad に入れてあるもの）。

**Spec:** `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-10-14-friends-book-design.md`（前提: 分割1・2a・2b の設計書）

**作業場所:** リポジトリは `projects/tane`（gitのルート）。コマンドはすべて `projects/tane/frontend` で実行する。作業ブランチ `feature/friends-book` を `master` から切る。画面の確認スクリプトは scratchpad（`/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/d770f439-71d9-4189-a7a7-4f836ce49f0c/scratchpad`）に置いて、そこで実行する。開発サーバーは、すでに動いている `next dev`（ポート3000、同じ frontend フォルダ）を使い、止めない。

## Global Constraints

- ドキュメント・UIの文言・コメントは日本語。子ども向けの文言はひらがな中心（例: 「なかまに なった！」「まだ あって いないよ」「にわに だす」「にわが いっぱい！ だれかを もどしてね」「あと 4たいで コンプリート」）
- 名前とひとことは設計書の付録A、色の呼び名は付録Bのとおり。変えるときは `src/data/friends.ts` だけを直せばよい作りにする
- 新しい npm パッケージは追加しない。アイコンは lucide-react（`Crown`・`Leaf`・`Shuffle`）
- アニメーションは globals.css にある keyframes（`animate-pop-in`・`animate-grow-in`・`animate-beams`・`animate-bubble-in`）だけを使う。新しい keyframes は足さない
- にわに出せるのは8体（`GARDEN_LIMIT`）。記録のキーは `tane:progress:v1` のまま。`garden` が無い古い記録・壊れた値でも起動する
- 会えたか・育ち方・コンプリート・メダルは、★とチャレンジの最高点から決める（新しく保存しない）
- `react-hooks/set-state-in-effect` などの lint に違反しない（effect の中で同期的に setState しない。ref を描画中に読まない）
- 絵文字を UI に使わない。コメントは理由が分かりにくいところだけに1行
- コミットはタスクの最後に1回。メッセージは既存の形（`feat: …` の日本語）で、最後に `Co-Authored-By: <実行するモデル名> <noreply@anthropic.com>`

## Review Focus

1. **「なかまに なった！」が出る・出ないの境目**: 初めてのクリアでだけ出て、2回目のクリア・「もういちど」でのクリア・失敗では出ないこと。フラッシュでも出ること。閉じたあとの結果画面で★と点数の動きが見えること（Task 5 の画面確認）
2. **にわに出す子**: 選んだ子が先に並び、会えていない子は出ず、8体のあとは「いっぱい」で何も変えないこと。ホームのにわとフィーバーの応援の両方に効くこと（Task 2・3 のテスト、Task 4 の画面確認）
3. **会えていない子のカード**: 開いていないステージにはあそぶボタンを出さず、「まえの ステージを クリアしよう」を出すこと（Task 4 の画面確認）
4. **古い記録**: `garden` が無い・壊れた記録でも起動し、★・最高点・チャレンジの最高点が残ること（Task 3 のテスト、Task 6 で古い形の記録を入れて起動）
5. **カードの開け閉め**: 外側・「とじる」・Escape で閉じ、閉じたあとも図鑑の位置が変わらないこと。カードから「この ステージで あそぶ」でプレイ画面に進めること（Task 4 の画面確認）

---

## ファイル構成

| ファイル | 役割 | タスク |
|---|---|---|
| `src/data/friends.ts` | 54体の名前とひとこと、色の呼び名 | 1 |
| `src/lib/game/friends.ts` | 次の段階の言葉、はなの数とコンプリート、すきな けいさん、会うためのヒント | 2 |
| `src/lib/game/progression.ts` | `gardenFriends(stars, chosen)`（選んだ子を先に） | 2 |
| `src/lib/progress-store.ts` | `garden` と `toggleGarden` | 3 |
| `src/components/friends/{friends-screen,medal-shelf,mode-friends,friend-cell,friend-sheet}.tsx` | 図鑑の画面とカード | 4 |
| `src/components/home/{home-screen,garden}.tsx`・`src/components/play/fever-friends.tsx` | にわに出す子を使う | 4 |
| `src/components/play/new-friend.tsx`・`stage-result.tsx` | 「なかまに なった！」 | 5 |

---

### Task 0: 作業ブランチ

- [ ] **Step 1: ブランチを切る**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git status --short
git switch master
git switch -c feature/friends-book
```

Expected: `git status --short` が空。`Switched to a new branch 'feature/friends-book'`

---

### Task 1: なかまの名前とひとこと

**Files:**
- Create: `src/data/friends.ts`
- Test: `src/data/friends.test.ts`

**Interfaces:**
- Consumes: `STAGES`（catalog）、`SPRU_COLORS`・`SpruColor`（colors）
- Produces: `interface FriendProfile { name: string; line: string }`、`FRIENDS: Readonly<Record<string, FriendProfile>>`（キーはステージid）、`COLOR_LABELS: Record<SpruColor, string>`

- [ ] **Step 1: 失敗するテストを書く**

`src/data/friends.test.ts`:

```ts
import { expect, it } from "vitest";

import { COLOR_LABELS, FRIENDS } from "@/data/friends";
import { STAGES } from "@/data/stages/catalog";
import { SPRU_COLORS } from "@/data/stages/colors";

it("54ステージすべてに名前とひとことがあり、余分なidは無い", () => {
  expect(Object.keys(FRIENDS).sort()).toEqual(STAGES.map((stage) => stage.id).sort());
  for (const stage of STAGES) {
    expect(FRIENDS[stage.id].name.length).toBeGreaterThan(0);
    expect(FRIENDS[stage.id].line.length).toBeGreaterThan(0);
  }
});

it("名前が重ならない", () => {
  const names = Object.values(FRIENDS).map((friend) => friend.name);
  expect(new Set(names).size).toBe(names.length);
});

it("11色すべてに呼び名がある", () => {
  for (const color of SPRU_COLORS) expect(COLOR_LABELS[color].length).toBeGreaterThan(0);
});

it("設計書の付録どおり", () => {
  expect(FRIENDS["add-1"]).toEqual({ name: "ピッコ", line: "いっしょに かぞえよ！" });
  expect(FRIENDS["flash-6"]).toEqual({ name: "ライカ", line: "2けたの フラッシュ、いくぞ！" });
  expect(COLOR_LABELS.spru).toBe("わかば");
  expect(COLOR_LABELS.obsidian).toBe("オブシディアン");
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/data/friends.test.ts`
Expected: FAIL（`@/data/friends` が見つからない）

- [ ] **Step 3: 実装する**

`src/data/friends.ts`:

```ts
import type { SpruColor } from "@/data/stages/colors";

export interface FriendProfile {
  readonly name: string;
  readonly line: string;
}

// 名前とひとことは設計書の付録A（Owner が直したら、ここを差し替える）
export const FRIENDS: Readonly<Record<string, FriendProfile>> = {
  "add-1": { name: "ピッコ", line: "いっしょに かぞえよ！" },
  "add-2": { name: "トット", line: "10まで よゆうだね！" },
  "add-3": { name: "クルン", line: "くりあがり、もう こわくないよ" },
  "add-4": { name: "マゼコ", line: "どっちが でても へっちゃら！" },
  "add-5": { name: "ポン", line: "おおきい かずも いけるよ" },
  "add-6": { name: "ハネル", line: "くりあがりで ぴょーん！" },
  "add-7": { name: "トンジュ", line: "10の まとまり、べんりだよ" },
  "add-8": { name: "ナラビ", line: "くらいを そろえて たそう" },
  "add-9": { name: "アゲハ", line: "くりあがりは ちいさく メモ！" },
  "add-10": { name: "モリモ", line: "100を こえたら すごいよ！" },
  "add-11": { name: "デッカ", line: "おおきな たしざん、だいすき！" },
  "add-12": { name: "ガオル", line: "ぜんぶ まざっても まけないぞ！" },
  "sub-1": { name: "チョコ", line: "5から ひいて みよう" },
  "sub-2": { name: "ヒクリ", line: "10まで なら まかせて！" },
  "sub-3": { name: "クリサ", line: "となりから かりて くるんだよ" },
  "sub-4": { name: "ミチル", line: "20まで、どんどん いこう" },
  "sub-5": { name: "スルリ", line: "くりさがり なし、すいすい！" },
  "sub-6": { name: "カリン", line: "10を かりて ひくのが コツ" },
  "sub-7": { name: "ジュッコ", line: "10ずつ へらすと かんたん" },
  "sub-8": { name: "ソロリ", line: "くらいごとに ひいてね" },
  "sub-9": { name: "モグ", line: "くりさがり ふたつでも だいじょうぶ" },
  "sub-10": { name: "ヒャック", line: "100から ひくの、とくい！" },
  "sub-11": { name: "ズシン", line: "おおきい かずも ひけるよ" },
  "sub-12": { name: "ギンガ", line: "ひきざんの ボスだぞ！" },
  "mul-1": { name: "ニコ", line: "2の だん、うたって おぼえよ" },
  "mul-2": { name: "サンシ", line: "3と 4の だん、リズムだよ" },
  "mul-3": { name: "ロクナ", line: "6と 7は ちょっと むずかしい？" },
  "mul-4": { name: "ハック", line: "8と 9も こわくないよ" },
  "mul-5": { name: "ゴロ", line: "1から 5の だん、まとめて いこう" },
  "mul-6": { name: "クック", line: "くく ぜんぶ、いえるかな？" },
  "mul-7": { name: "トバイ", line: "0を つけると はやいよ" },
  "mul-8": { name: "フエル", line: "かけざんで いっきに ふえる！" },
  "mul-9": { name: "ガッツ", line: "くりあがりも がんばろ！" },
  "mul-10": { name: "ミケタ", line: "3けたも かけられるよ" },
  "mul-11": { name: "ダブ", line: "2けた どうし、すごいね！" },
  "mul-12": { name: "クロガネ", line: "かけざんの ボス、あらわる！" },
  "div-1": { name: "ワッケ", line: "おなじ かずずつ わけよう" },
  "div-2": { name: "ブンブ", line: "くくを ぎゃくに つかうんだ" },
  "div-3": { name: "ムツミ", line: "6と 7で、わけられるかな？" },
  "div-4": { name: "ハッキュ", line: "8と 9で わるよ" },
  "div-5": { name: "ワリン", line: "くくの わりざん、ぜんぶ！" },
  "div-6": { name: "トワリ", line: "10の まとまりで わると らく" },
  "div-7": { name: "ハンブン", line: "こたえが 2けたに なるよ" },
  "div-8": { name: "ミツワ", line: "3けたも わけちゃおう" },
  "div-9": { name: "ドッサ", line: "こたえ 3けた、たくさん！" },
  "div-10": { name: "ワルツ", line: "2けたで わる、ちょうせん！" },
  "div-11": { name: "ズンダ", line: "おおきな わりざん、まかせて" },
  "div-12": { name: "クリス", line: "わりざんの ボスだよ！" },
  "flash-1": { name: "パッチ", line: "ゆっくり みて たそうね" },
  "flash-2": { name: "ピカ", line: "よっつ、あたまで たして！" },
  "flash-3": { name: "チラリ", line: "いつつ、おぼえられる？" },
  "flash-4": { name: "ナナホシ", line: "ななつも ならぶよ！" },
  "flash-5": { name: "ビュン", line: "はやいけど、ついて こられる？" },
  "flash-6": { name: "ライカ", line: "2けたの フラッシュ、いくぞ！" },
};

// 色の呼び名は設計書の付録B
export const COLOR_LABELS: Record<SpruColor, string> = {
  spru: "わかば",
  emerald: "エメラルド",
  gold: "ゴールド",
  amber: "アンバー",
  ruby: "ルビー",
  sapphire: "サファイア",
  pearl: "パール",
  silver: "シルバー",
  crystal: "クリスタル",
  platinum: "プラチナ",
  obsidian: "オブシディアン",
};
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run src/data/friends.test.ts && npm run typecheck`
Expected: PASS（4件）、型エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/data/friends.ts src/data/friends.test.ts
git commit -m "feat: なかま54体の名前とひとこと、色の呼び名を追加"
```

---

### Task 2: 図鑑のルールと、にわに出す子の決め方

**Files:**
- Create: `src/lib/game/friends.ts`
- Test: `src/lib/game/friends.test.ts`
- Modify: `src/lib/game/progression.ts`（`gardenFriends`）
- Test: `src/lib/game/progression.test.ts`（`describe("gardenFriends")` に追加）

**Interfaces:**
- Consumes: `MODES`・`stagesOfMode`・`getStage`・`Stage`・`ModeId`（catalog）、`starsOf`・`StarMap`（progression）、`Stars`（stars）
- Produces:
  - `nextGrowthText(stars: Stars): string | null`（★1・★2・★3の言葉、★0は null）
  - `interface ModeBloom { bloomed: number; total: number; complete: boolean; left: number }`、`modeBloom(mode, stars): ModeBloom`
  - `favoriteText(stage): string`（例「くりあがり（たしざん 3）」）、`unlockHint(stage): string`（例「たしざん 3を クリアすると なかまに なるよ」）
  - `gardenFriends(stars: StarMap, chosen: readonly string[] = [], limit = GARDEN_LIMIT): Stage[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/game/friends.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getStage, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { favoriteText, modeBloom, nextGrowthText, unlockHint } from "@/lib/game/friends";
import type { StarMap } from "@/lib/game/progression";

function cleared(mode: ModeId, n: number, value: 1 | 2 | 3 = 3): StarMap {
  return Object.fromEntries(stagesOfMode(mode).slice(0, n).map((s) => [s.id, value]));
}

it("nextGrowthText は次の段階を出し、花なら まんかい", () => {
  expect(nextGrowthText(0)).toBeNull();
  expect(nextGrowthText(1)).toBe("★2で つぼみに なるよ");
  expect(nextGrowthText(2)).toBe("★3で はなが さくよ");
  expect(nextGrowthText(3)).toBe("まんかい！");
});

describe("modeBloom", () => {
  it("★3の子の数と、コンプリートまでの残り", () => {
    expect(modeBloom("add", {})).toEqual({ bloomed: 0, total: 12, complete: false, left: 12 });
    expect(modeBloom("add", { ...cleared("add", 8), "add-9": 2 })).toEqual({ bloomed: 8, total: 12, complete: false, left: 4 });
  });

  it("全員★3でコンプリート。フラッシュは6体", () => {
    expect(modeBloom("add", cleared("add", 12))).toEqual({ bloomed: 12, total: 12, complete: true, left: 0 });
    expect(modeBloom("flash", cleared("flash", 6))).toEqual({ bloomed: 6, total: 6, complete: true, left: 0 });
  });

  it("ほかのあそびの★は数えない", () => {
    expect(modeBloom("sub", cleared("add", 12)).bloomed).toBe(0);
  });
});

it("favoriteText と unlockHint はステージの名前・あそび・番号から作る", () => {
  expect(favoriteText(getStage("add-3")!)).toBe("くりあがり（たしざん 3）");
  expect(favoriteText(getStage("flash-6")!)).toBe("ボス 2けた（フラッシュ 6）");
  expect(unlockHint(getStage("mul-4")!)).toBe("かけざん 4を クリアすると なかまに なるよ");
});
```

`src/lib/game/progression.test.ts` の `describe("gardenFriends", …)` の中に追加:

```ts
  it("選んだ子を選んだ順に先に並べ、足りない分を自動で埋める（重ならない）", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3, "add-3": 3, "sub-1": 2 };
    expect(gardenFriends(stars, ["add-1"]).map((s) => s.id)).toEqual(["add-1", "add-3", "add-2", "sub-1"]);
    expect(gardenFriends(stars, ["sub-1", "add-1"]).map((s) => s.id)).toEqual(["sub-1", "add-1", "add-3", "add-2"]);
  });

  it("会えていない子・知らないidは選んでいても出さない", () => {
    const stars: StarMap = { "add-1": 1, "add-2": 3 };
    expect(gardenFriends(stars, ["mul-1", "zzz-1", "add-1"]).map((s) => s.id)).toEqual(["add-1", "add-2"]);
  });

  it("8体選んでいれば、その8体だけ", () => {
    const chosen = stagesOfMode("add").slice(0, 8).map((s) => s.id);
    expect(gardenFriends(cleared("add", 12), chosen).map((s) => s.id)).toEqual(chosen);
  });
```

（`progression.test.ts` の import に `stagesOfMode` が無ければ、`@/data/stages/catalog` からの import に足す）

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/game/friends.test.ts src/lib/game/progression.test.ts`
Expected: FAIL（`@/lib/game/friends` が見つからない。`gardenFriends` の新しい3件は、選んだ子が先に来ないので落ちる）

- [ ] **Step 3: 実装する**

`src/lib/game/friends.ts`:

```ts
import { MODES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";
import { starsOf, type StarMap } from "@/lib/game/progression";
import type { Stars } from "@/lib/game/stars";

const NEXT_GROWTH: Record<Stars, string | null> = {
  0: null,
  1: "★2で つぼみに なるよ",
  2: "★3で はなが さくよ",
  3: "まんかい！",
};

export function nextGrowthText(stars: Stars): string | null {
  return NEXT_GROWTH[stars];
}

export interface ModeBloom {
  bloomed: number;
  total: number;
  complete: boolean;
  left: number;
}

/** あそびごとの「はな」（★3）の数。全員がはなになったらコンプリート */
export function modeBloom(mode: ModeId, stars: StarMap): ModeBloom {
  const list = stagesOfMode(mode);
  const bloomed = list.filter((stage) => starsOf(stars, stage.id) === 3).length;
  return { bloomed, total: list.length, complete: bloomed === list.length, left: list.length - bloomed };
}

function stageLabel(stage: Stage): string {
  return `${MODES[stage.mode].label} ${stage.number}`;
}

export function favoriteText(stage: Stage): string {
  return `${stage.name}（${stageLabel(stage)}）`;
}

export function unlockHint(stage: Stage): string {
  return `${stageLabel(stage)}を クリアすると なかまに なるよ`;
}
```

`src/lib/game/progression.ts` の import に `getStage` を足し（`import { getStage, MODE_IDS, STAGES, stagesOfMode, type ModeId, type Stage } from "@/data/stages/catalog";`）、`gardenFriends` を置き換える:

```ts
/** にわに出す子。選んだ子（会えた子だけ）を選んだ順に先に並べ、足りない分を★の多い順・後ろのステージ順で埋める */
export function gardenFriends(stars: StarMap, chosen: readonly string[] = [], limit: number = GARDEN_LIMIT): Stage[] {
  const picked = chosen
    .map((id) => getStage(id))
    .filter((stage): stage is Stage => stage !== undefined && starsOf(stars, stage.id) >= 1);
  const pickedIds = new Set(picked.map((stage) => stage.id));
  const auto = STAGES.map((stage, order) => ({ stage, order, stars: starsOf(stars, stage.id) }))
    .filter((entry) => entry.stars >= 1 && !pickedIds.has(entry.stage.id))
    .sort((x, y) => y.stars - x.stars || y.order - x.order)
    .map((entry) => entry.stage);
  return [...picked, ...auto].slice(0, limit);
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/lib/game/friends.ts src/lib/game/friends.test.ts src/lib/game/progression.ts src/lib/game/progression.test.ts
git commit -m "feat: 図鑑のルール（次の段階・はなの数とコンプリート・ヒント）と、選んだ子を先に並べるにわを追加"
```

---

### Task 3: にわに出す子の記録

**Files:**
- Modify: `src/lib/progress-store.ts`
- Test: `src/lib/progress-store.test.ts`

**Interfaces:**
- Consumes: `GARDEN_LIMIT`（progression）
- Produces:
  - `Progress` に `readonly garden: readonly string[]`（`EMPTY_PROGRESS` は `[]`）
  - `type GardenToggle = "added" | "removed" | "full"`
  - `withGardenToggle(progress, stageId): { progress: Progress; result: GardenToggle }`
  - `toggleGarden(stageId): GardenToggle`

- [ ] **Step 1: 失敗するテストを書く**

`src/lib/progress-store.test.ts` を変える。

import に `toggleGarden` と `withGardenToggle` を足す。

`parseProgress` の既存の3つの期待値（`challengeBest: {}` を含むもの）に `garden: []` を足す:

```ts
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 3, "flash-6": 2 }, best: {}, challengeBest: {}, garden: [], titleSeen: true });
```

```ts
      challengeBest: {},
      garden: [],
      lastModeId: "mul",
```

```ts
    expect(parseProgress(raw)).toEqual({ stars: { "add-1": 2 }, best: {}, challengeBest: {}, garden: [], lastModeId: "add", titleSeen: true });
```

`describe("parseProgress", …)` の中に追加:

```ts
  it("garden は知っているステージidの文字列だけ、重なりを除いて8こまで", () => {
    const ids = ["add-1", "add-1", "zzz-1", 3, "sub-2", "add-2", "add-3", "add-4", "add-5", "add-6", "add-7", "add-8"];
    expect(parseProgress(JSON.stringify({ stars: {}, garden: ids })).garden).toEqual([
      "add-1",
      "sub-2",
      "add-2",
      "add-3",
      "add-4",
      "add-5",
      "add-6",
      "add-7",
    ]);
    expect(parseProgress(JSON.stringify({ stars: { "add-1": 1 }, garden: "add-1" }))).toMatchObject({
      stars: { "add-1": 1 },
      garden: [],
    });
  });
```

`describe("withChallengeScore", …)` のあとに追加:

```ts
describe("withGardenToggle", () => {
  it("入っていなければ足し、入っていれば外す", () => {
    const added = withGardenToggle(EMPTY_PROGRESS, "add-1");
    expect(added.result).toBe("added");
    expect(added.progress.garden).toEqual(["add-1"]);
    const removed = withGardenToggle(added.progress, "add-1");
    expect(removed.result).toBe("removed");
    expect(removed.progress.garden).toEqual([]);
  });

  it("8体のときに足そうとすると full で、何も変えない（外すことはできる）", () => {
    const full = { ...EMPTY_PROGRESS, garden: ["add-1", "add-2", "add-3", "add-4", "add-5", "add-6", "add-7", "add-8"] };
    expect(withGardenToggle(full, "add-9")).toEqual({ progress: full, result: "full" });
    expect(withGardenToggle(full, "add-3").result).toBe("removed");
  });
});
```

`describe("localStorage への読み書き", …)` の中に追加:

```ts
  it("toggleGarden は保存し、resetProgress で消える", () => {
    expect(toggleGarden("add-2")).toBe("added");
    expect(toggleGarden("add-1")).toBe("added");
    expect(readProgress().garden).toEqual(["add-2", "add-1"]);
    expect(toggleGarden("add-2")).toBe("removed");
    expect(readProgress().garden).toEqual(["add-1"]);
    resetProgress();
    expect(readProgress().garden).toEqual([]);
  });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run src/lib/progress-store.test.ts`
Expected: FAIL（`withGardenToggle`・`toggleGarden` が無い。既存の3つは `garden` が無くて落ちる）

- [ ] **Step 3: 実装する**

`src/lib/progress-store.ts` を変える。

import を変える:

```ts
import { GARDEN_LIMIT, type StarMap } from "@/lib/game/progression";
```

`Progress` と `EMPTY_PROGRESS`:

```ts
export interface Progress {
  readonly stars: StarMap;
  readonly best: Readonly<Record<string, number>>;
  readonly challengeBest: Readonly<Partial<Record<ChallengeModeId, number>>>;
  readonly garden: readonly string[];
  readonly lastModeId?: ModeId;
  readonly titleSeen: boolean;
}

export const EMPTY_PROGRESS: Progress = { stars: {}, best: {}, challengeBest: {}, garden: [], titleSeen: false };
```

`parseProgress` の `challengeBest` の読み取りのあとに足し、`return` に `garden` を入れる:

```ts
  const garden: string[] = [];
  if (Array.isArray(data.garden)) {
    for (const id of data.garden) {
      if (typeof id === "string" && getStage(id) && !garden.includes(id) && garden.length < GARDEN_LIMIT) garden.push(id);
    }
  }
  const lastModeId = typeof data.lastModeId === "string" && isModeId(data.lastModeId) ? data.lastModeId : undefined;
  return {
    stars,
    best,
    challengeBest,
    garden,
    titleSeen: data.titleSeen === true,
    ...(lastModeId ? { lastModeId } : {}),
  };
```

`withChallengeScore` の下に足す:

```ts
export type GardenToggle = "added" | "removed" | "full";

export function withGardenToggle(progress: Progress, stageId: string): { progress: Progress; result: GardenToggle } {
  if (progress.garden.includes(stageId)) {
    return { progress: { ...progress, garden: progress.garden.filter((id) => id !== stageId) }, result: "removed" };
  }
  if (progress.garden.length >= GARDEN_LIMIT) return { progress, result: "full" };
  return { progress: { ...progress, garden: [...progress.garden, stageId] }, result: "added" };
}
```

`recordChallengeResult` の下に足す:

```ts
export function toggleGarden(stageId: string): GardenToggle {
  const { progress, result } = withGardenToggle(store.read(), stageId);
  if (result !== "full") save(progress);
  return result;
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/lib/progress-store.ts src/lib/progress-store.test.ts
git commit -m "feat: にわに出す子（最大8体）を記録に足す"
```

---

### Task 4: 図鑑の画面とカード、にわへの反映

**Files:**
- Modify (全体を置き換え): `src/components/friends/friends-screen.tsx`
- Create: `src/components/friends/medal-shelf.tsx`・`mode-friends.tsx`・`friend-cell.tsx`・`friend-sheet.tsx`
- Modify: `src/components/home/garden.tsx`・`src/components/home/home-screen.tsx`・`src/components/play/fever-friends.tsx`

**Interfaces:**
- Consumes: Task 1〜3 のすべて、`MedalBadge`（2b）、`medalFor`・`CHALLENGE_MODE_IDS`・`CHALLENGE_LABELS`（2b）、`isChallengeUnlocked`・`CHALLENGE_UNLOCK_STARS`・`isUnlocked`・`friendsCount`、`StarsRow`・`AppButton`・`appButtonVariants`・`BottomNav`、`useSound`、`GROWTHS`・`growthImage`
- Produces: `/friends` の図鑑。`Garden({ stars, chosen })`

- [ ] **Step 1: メダルの段**

`src/components/friends/medal-shelf.tsx`:

```tsx
import Link from "next/link";
import { Shuffle } from "lucide-react";

import { MedalBadge } from "@/components/challenge/medal-badge";
import { MODES } from "@/data/stages/catalog";
import { CHALLENGE_LABELS, CHALLENGE_MODE_IDS, medalFor } from "@/lib/game/challenge-rules";
import { CHALLENGE_UNLOCK_STARS, isChallengeUnlocked, type StarMap } from "@/lib/game/progression";
import type { Progress } from "@/lib/progress-store";

const BOX = "mx-4 mt-3 block rounded-2xl border-b-[3px] border-cream-edge bg-card px-3 py-2";

export function MedalShelf({ stars, challengeBest }: { stars: StarMap; challengeBest: Progress["challengeBest"] }) {
  const unlocked = isChallengeUnlocked(stars);
  const title = <h2 className="font-display text-sm font-black text-[#2b6fa3]">チャレンジの メダル</h2>;

  if (!unlocked) {
    return (
      <section aria-label="チャレンジの メダル" className={BOX}>
        {title}
        <p className="mt-1 text-xs font-bold text-muted-foreground">★{CHALLENGE_UNLOCK_STARS}で ひらくよ</p>
      </section>
    );
  }

  return (
    <Link href="/challenge" aria-label="チャレンジの メダル" className={BOX}>
      {title}
      <ul className="mt-1.5 grid grid-cols-5 gap-1">
        {CHALLENGE_MODE_IDS.map((id) => {
          const medal = medalFor(id, challengeBest[id] ?? null);
          return (
            <li key={id} className="flex flex-col items-center gap-0.5">
              {medal ? (
                <MedalBadge medal={medal} size="sm" />
              ) : (
                <span
                  role="img"
                  aria-label={`${CHALLENGE_LABELS[id]} まだ`}
                  className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-black text-muted-foreground"
                >
                  {id === "mix" ? <Shuffle className="h-3.5 w-3.5" strokeWidth={3} /> : MODES[id].symbol}
                </span>
              )}
              <span className="text-[10px] font-bold text-muted-foreground">{CHALLENGE_LABELS[id]}</span>
            </li>
          );
        })}
      </ul>
    </Link>
  );
}
```

- [ ] **Step 2: マスとあそびの段**

`src/components/friends/friend-cell.tsx`:

```tsx
import Image from "next/image";
import { Leaf } from "lucide-react";

import { StarsRow } from "@/components/app/stars-row";
import { FRIENDS } from "@/data/friends";
import { MODES, type Stage } from "@/data/stages/catalog";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";

export function FriendCell({
  stage,
  stars,
  inGarden,
  onOpen,
}: {
  stage: Stage;
  stars: Stars;
  inGarden: boolean;
  onOpen: () => void;
}) {
  const met = stars > 0;
  const name = FRIENDS[stage.id].name;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={met ? name : `まだ あって いない なかま（${MODES[stage.mode].label} ${stage.number}）`}
      data-in-garden={met && inGarden ? "true" : "false"}
      className="relative flex h-28 w-full flex-col items-center justify-end gap-0.5 rounded-2xl bg-card/80 p-1 active:translate-y-px"
    >
      {met ? (
        <>
          <Image
            src={growthImage(stage.color, growthForStars(stars))}
            alt=""
            width={56}
            height={70}
            className="h-14 w-auto object-contain"
          />
          <span className="line-clamp-1 font-display text-[11px] font-black">{name}</span>
          <StarsRow stars={stars} size="sm" />
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
          <span className="absolute inset-0 grid place-items-center font-display text-2xl font-black text-[#c9bfa8]">?</span>
        </>
      )}
      {met && inGarden && <Leaf aria-hidden className="absolute top-1 right-1 h-4 w-4 text-primary" fill="currentColor" />}
    </button>
  );
}
```

`src/components/friends/mode-friends.tsx`:

```tsx
import { Crown } from "lucide-react";

import { FriendCell } from "@/components/friends/friend-cell";
import { MODES, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { modeBloom } from "@/lib/game/friends";
import { starsOf, type StarMap } from "@/lib/game/progression";

export function ModeFriends({
  mode,
  stars,
  garden,
  onOpen,
}: {
  mode: ModeId;
  stars: StarMap;
  garden: readonly string[];
  onOpen: (stageId: string) => void;
}) {
  const bloom = modeBloom(mode, stars);
  return (
    <section aria-labelledby={`friends-${mode}`} className="px-4 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 id={`friends-${mode}`} className="font-display text-lg font-black">
          {MODES[mode].label}
        </h2>
        {bloom.complete && (
          <span className="inline-flex animate-pop-in items-center gap-1 rounded-full border-b-[3px] border-[#c98f12] bg-accent px-2 py-0.5 font-display text-xs font-black text-accent-foreground">
            <Crown className="h-4 w-4" strokeWidth={2.5} />
            コンプリート！
          </span>
        )}
        <span className="ml-auto text-xs font-bold text-muted-foreground">
          はな {bloom.bloomed} / {bloom.total}
        </span>
      </div>
      {!bloom.complete && (
        <p className="-mt-1 mb-2 text-[11px] font-bold text-muted-foreground">あと {bloom.left}たいで コンプリート</p>
      )}
      <ul className="grid grid-cols-4 gap-2">
        {stagesOfMode(mode).map((stage) => (
          <li key={stage.id}>
            <FriendCell
              stage={stage}
              stars={starsOf(stars, stage.id)}
              inGarden={garden.includes(stage.id)}
              onOpen={() => onOpen(stage.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: カード**

`src/components/friends/friend-sheet.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { COLOR_LABELS, FRIENDS } from "@/data/friends";
import { playPath, type Stage } from "@/data/stages/catalog";
import { favoriteText, nextGrowthText, unlockHint } from "@/lib/game/friends";
import { isUnlocked, starsOf } from "@/lib/game/progression";
import { growthForStars, type Growth } from "@/lib/game/stars";
import { toggleGarden, type Progress } from "@/lib/progress-store";
import { GROWTHS, growthImage } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const GROWTH_LABELS: Record<Growth, string> = { seed: "タネ", sprout: "め", bud: "つぼみ", flower: "はな" };
const NOTICE_MS = 2000;

/** さわったなかまのカード。画面の下から出る */
export function FriendSheet({ stage, progress, onClose }: { stage: Stage; progress: Progress; onClose: () => void }) {
  const { play } = useSound();
  const [notice, setNotice] = useState<string | null>(null);
  const stars = starsOf(progress.stars, stage.id);
  const met = stars > 0;
  const friend = FRIENDS[stage.id];
  const inGarden = progress.garden.includes(stage.id);
  const unlocked = isUnlocked(stage, progress.stars);
  const best = progress.best[stage.id];
  const current = growthForStars(stars);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function onGarden() {
    play("select");
    if (toggleGarden(stage.id) === "full") setNotice("にわが いっぱい！ だれかを もどしてね");
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-sheet-title"
        className="relative mx-auto flex w-full max-w-md animate-bubble-in flex-col items-center gap-2 rounded-t-3xl bg-card px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        {met ? (
          <>
            <Image
              key={stage.id}
              src={growthImage(stage.color, current)}
              alt=""
              width={120}
              height={150}
              className="h-32 w-auto animate-pop-in object-contain"
            />
            <h2 id="friend-sheet-title" className="font-display text-2xl font-black">
              {friend.name}
            </h2>
            <p className="text-xs font-bold text-muted-foreground">{COLOR_LABELS[stage.color]}の なかま</p>
            <ol aria-label="そだちかた" className="flex items-end gap-2">
              {GROWTHS.map((growth) => (
                <li
                  key={growth}
                  aria-current={growth === current ? "step" : undefined}
                  className={cn(
                    "flex flex-col items-center rounded-xl px-1.5 py-1",
                    growth === current ? "bg-accent/30 ring-2 ring-accent" : "opacity-40"
                  )}
                >
                  <Image src={growthImage(stage.color, growth)} alt="" width={32} height={40} className="h-8 w-auto" />
                  <span className="text-[10px] font-bold">{GROWTH_LABELS[growth]}</span>
                </li>
              ))}
            </ol>
            <p className="font-display text-sm font-black text-[#2b6fa3]">{nextGrowthText(stars)}</p>
            <p className="rounded-2xl bg-muted/60 px-4 py-2 text-center font-display font-black">「{friend.line}」</p>
            <p className="text-xs font-bold">すきな けいさん: {favoriteText(stage)}</p>
            {best !== undefined && (
              <p className="text-xs font-bold text-muted-foreground">さいこう {best.toLocaleString("ja-JP")} PT</p>
            )}
          </>
        ) : (
          <>
            <span className="relative">
              <Image
                src={growthImage(stage.color, "flower")}
                alt=""
                width={120}
                height={150}
                className="h-32 w-auto object-contain opacity-15 brightness-0"
              />
              <span className="absolute inset-0 grid place-items-center font-display text-5xl font-black text-[#c9bfa8]">
                ?
              </span>
            </span>
            <h2 id="friend-sheet-title" className="font-display text-xl font-black">
              まだ あって いないよ
            </h2>
            <p className="text-center text-sm font-bold">{unlockHint(stage)}</p>
            {!unlocked && <p className="text-xs font-bold text-muted-foreground">まえの ステージを クリアしよう</p>}
          </>
        )}
        <div className="mt-2 flex w-full flex-col gap-2">
          {unlocked && (
            <Link href={playPath(stage)} className={appButtonVariants({ variant: "cta", size: "lg" })}>
              この ステージで あそぶ
            </Link>
          )}
          {(met || inGarden) && (
            <AppButton variant="primary" onClick={onGarden}>
              {inGarden ? "にわから もどす" : "にわに だす"}
            </AppButton>
          )}
          <AppButton onClick={onClose}>とじる</AppButton>
        </div>
        {notice && (
          <p
            role="status"
            className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bubble-in rounded-2xl bg-white px-3 py-1.5 font-display text-xs font-black whitespace-nowrap shadow"
          >
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 図鑑の画面**

`src/components/friends/friends-screen.tsx` を全体置き換え:

```tsx
"use client";

import { useState } from "react";

import { BottomNav } from "@/components/app/bottom-nav";
import { FriendSheet } from "@/components/friends/friend-sheet";
import { MedalShelf } from "@/components/friends/medal-shelf";
import { ModeFriends } from "@/components/friends/mode-friends";
import { getStage, MODE_IDS, STAGES } from "@/data/stages/catalog";
import { friendsCount } from "@/lib/game/progression";
import { useProgress } from "@/lib/progress-store";

export function FriendsScreen() {
  const progress = useProgress();
  const [openId, setOpenId] = useState<string | null>(null);
  const count = friendsCount(progress.stars);
  const opened = openId ? getStage(openId) : undefined;

  return (
    <main className="flex flex-1 flex-col pb-24">
      <header className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-black text-primary">なかま</h1>
          <span className="rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
            {count} / {STAGES.length}
          </span>
        </div>
        <div
          role="img"
          aria-label={`あつめた なかま ${count} / ${STAGES.length}`}
          className="h-2.5 overflow-hidden rounded-full bg-white/70"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-leaf to-accent"
            style={{ width: `${(count / STAGES.length) * 100}%` }}
          />
        </div>
      </header>
      <MedalShelf stars={progress.stars} challengeBest={progress.challengeBest} />
      {MODE_IDS.map((mode) => (
        <ModeFriends key={mode} mode={mode} stars={progress.stars} garden={progress.garden} onOpen={setOpenId} />
      ))}
      {opened && <FriendSheet stage={opened} progress={progress} onClose={() => setOpenId(null)} />}
      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 5: にわとフィーバーの応援に、選んだ子を渡す**

`src/components/home/garden.tsx`:
- `export function Garden({ stars }: { stars: StarMap })` を `export function Garden({ stars, chosen }: { stars: StarMap; chosen: readonly string[] })` にする
- `const friends = gardenFriends(stars);` を `const friends = gardenFriends(stars, chosen);` にする

`src/components/home/home-screen.tsx`:
- `const { stars, lastModeId, titleSeen } = useProgress();` を `const { stars, lastModeId, titleSeen, garden } = useProgress();` にする
- `<Garden stars={stars} />` を `<Garden stars={stars} chosen={garden} />` にする

`src/components/play/fever-friends.tsx`:
- `const { stars } = useProgress();` を `const { stars, garden } = useProgress();` にする
- `const friends = gardenFriends(stars);` を `const friends = gardenFriends(stars, garden);` にする

- [ ] **Step 6: テスト・型チェック・lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 7: 画面で確かめる（Playwright）**

scratchpad に `check-friends-book.mjs` を作る:

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

async function seed(page, progress) {
  await page.goto(base);
  await page.evaluate((p) => localStorage.setItem("tane:progress:v1", JSON.stringify(p)), progress);
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("tane:progress:v1")));
const sheet = (page) => page.getByRole("dialog");
const ADD = (n, value = 3) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`add-${i + 1}`, value]));

// 1. 図鑑とカード（★30未満）
{
  const page = await newPage();
  await seed(page, { stars: { "add-1": 3, "add-2": 2, "add-3": 1 }, best: { "add-1": 3200 }, titleSeen: true });
  await page.goto(`${base}/friends`);
  await page.getByText("3 / 54").waitFor();
  await page.getByText("★30で ひらくよ").waitFor();
  const add = page.locator("section", { has: page.locator("#friends-add") });
  await add.getByText("はな 1 / 12").waitFor();
  await add.getByText("あと 11たいで コンプリート").waitFor();

  await page.getByRole("button", { name: "ピッコ" }).click();
  for (const text of ["わかばの なかま", "まんかい！", "「いっしょに かぞえよ！」", "すきな けいさん: こたえが5まで（たしざん 1）", "さいこう 3,200 PT"]) {
    await sheet(page).getByText(text).waitFor();
  }
  await page.screenshot({ path: "friends-sheet.png" });
  await sheet(page).getByRole("button", { name: "とじる" }).click();
  await sheet(page).waitFor({ state: "detached" });

  await page.getByRole("button", { name: "トット" }).click();
  await sheet(page).getByText("★3で はなが さくよ").waitFor();
  await page.keyboard.press("Escape");
  await sheet(page).waitFor({ state: "detached" });

  // 会えていない子: 開いているステージ（たしざん4）と、開いていないステージ（たしざん6）
  await page.getByRole("button", { name: "まだ あって いない なかま（たしざん 4）" }).click();
  await sheet(page).getByText("たしざん 4を クリアすると なかまに なるよ").waitFor();
  await sheet(page).getByRole("link", { name: "この ステージで あそぶ" }).waitFor();
  await page.screenshot({ path: "friends-sheet-unmet.png" });
  await page.mouse.click(195, 40); // 外側を押して閉じる
  await sheet(page).waitFor({ state: "detached" });
  await page.getByRole("button", { name: "まだ あって いない なかま（たしざん 6）" }).click();
  await sheet(page).getByText("まえの ステージを クリアしよう").waitFor();
  if ((await sheet(page).getByRole("link", { name: "この ステージで あそぶ" }).count()) !== 0) throw new Error("開いていないのにあそべる");
  if ((await sheet(page).getByRole("button", { name: "にわに だす" }).count()) !== 0) throw new Error("会えていない子をにわに出せる");
  await sheet(page).getByRole("button", { name: "とじる" }).click();

  // カードからプレイ画面へ
  await page.getByRole("button", { name: "ピッコ" }).click();
  await sheet(page).getByRole("link", { name: "この ステージで あそぶ" }).click();
  await page.waitForURL(/\/stage\/add-1$/);
  await page.close();
}

// 2. メダル・にわ・コンプリート（★30以上）
{
  const page = await newPage();
  const progress = { stars: { ...ADD(10), "add-11": 1 }, challengeBest: { add: 3100, div: 1000 }, titleSeen: true };
  await seed(page, progress);

  // 選んでいなければ、にわの先頭は自動（★3の後ろのステージ = たしざん10、エメラルド）
  const firstGardenSrc = async () =>
    decodeURIComponent(await page.locator('section[aria-label="Spruの にわ"] img').first().getAttribute("src"));
  await page.goto(base);
  if (!(await firstGardenSrc()).includes("/spru/growth/emerald/")) throw new Error(`にわの先頭: ${await firstGardenSrc()}`);

  await page.goto(`${base}/friends`);
  await page.getByRole("img", { name: "ぎんメダル" }).waitFor();
  await page.getByRole("img", { name: "どうメダル" }).waitFor();
  await page.getByRole("img", { name: "まぜまぜ まだ" }).waitFor();

  await page.getByRole("button", { name: "ピッコ" }).click();
  await sheet(page).getByRole("button", { name: "にわに だす" }).click();
  await sheet(page).getByRole("button", { name: "にわから もどす" }).waitFor();
  if (JSON.stringify((await stored(page)).garden) !== JSON.stringify(["add-1"])) throw new Error("にわに入っていない");
  await sheet(page).getByRole("button", { name: "とじる" }).click();
  if ((await page.getByRole("button", { name: "ピッコ" }).getAttribute("data-in-garden")) !== "true") throw new Error("にわの印が無い");

  // ホームのにわの先頭がピッコ（わかば）になる
  await page.goto(base);
  if (!(await firstGardenSrc()).includes("/spru/growth/spru/")) throw new Error(`選んだ子が先頭でない: ${await firstGardenSrc()}`);

  // 8体のときは「いっぱい」
  await seed(page, { ...progress, garden: ["add-2", "add-3", "add-4", "add-5", "add-6", "add-7", "add-8", "add-9"] });
  await page.goto(`${base}/friends`);
  await page.getByRole("button", { name: "ピッコ" }).click();
  await sheet(page).getByRole("button", { name: "にわに だす" }).click();
  await page.getByText("にわが いっぱい！ だれかを もどしてね").waitFor();
  if ((await stored(page)).garden.length !== 8) throw new Error("いっぱいなのに足された");
  await sheet(page).getByRole("button", { name: "とじる" }).click();
  await page.getByRole("button", { name: "トット" }).click();
  await sheet(page).getByRole("button", { name: "にわから もどす" }).click();
  if ((await stored(page)).garden.includes("add-2")) throw new Error("もどせない");
  await sheet(page).getByRole("button", { name: "とじる" }).click();

  // コンプリート
  await seed(page, { stars: ADD(12), titleSeen: true });
  await page.goto(`${base}/friends`);
  const add = page.locator("section", { has: page.locator("#friends-add") });
  await add.getByText("コンプリート！").waitFor();
  await add.getByText("はな 12 / 12").waitFor();
  await page.screenshot({ path: "friends-book.png", fullPage: true });
  await page.close();
}

// 3. 古い記録（garden が無い・壊れている）でも開ける
{
  const page = await newPage();
  await seed(page, { stars: { "add-1": 2 }, garden: "oops", titleSeen: true });
  await page.goto(`${base}/friends`);
  await page.getByText("1 / 54").waitFor();
  await page.goto(base);
  await page.locator('section[aria-label="Spruの にわ"]').waitFor();
  await page.close();
}

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-friends-book.mjs http://localhost:3000`（scratchpad で）
Expected: `OK`。`friends-sheet.png`（会えた子のカード）・`friends-sheet-unmet.png`（会えていない子）・`friends-book.png`（メダルの段・コンプリートの王冠・にわの印）を開き、文字の重なりや切れがないかを目で確かめる

続けて分割1の `check-friends-settings.mjs`・`check-home.mjs` と、分割2aの `check-speed.mjs` も流して `OK` を確かめる（にわ・フィーバーの応援の並べ方を変えたため）。

- [ ] **Step 8: コミット**

```bash
git add src/components/friends src/components/home/garden.tsx src/components/home/home-screen.tsx src/components/play/fever-friends.tsx
git commit -m "feat: なかまの画面を図鑑にする（カード・メダル・コンプリート・にわに出す子）"
```

---

### Task 5: 「なかまに なった！」の演出

**Files:**
- Create: `src/components/play/new-friend.tsx`
- Modify: `src/components/play/stage-result.tsx`

**Interfaces:**
- Consumes: `FRIENDS`（Task 1）、`StageOutcome`（`before`・`stars`）、`useSound`、`growthImage`・`growthForStars`
- Produces: `NewFriend({ stage, stars, onClose })`。`StageResult` は、クリアして `outcome.before === 0` のとき最初に `NewFriend` を出し、「やったね！」で結果を出す

- [ ] **Step 1: 演出の部品**

`src/components/play/new-friend.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect } from "react";

import { AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { FRIENDS } from "@/data/friends";
import type { Stage } from "@/data/stages/catalog";
import { growthForStars, type Stars } from "@/lib/game/stars";
import { growthImage } from "@/lib/spru-images";

/** 初めてクリアしたステージの子が「なかまに なった！」と出てくる。画面いっぱいに出す */
export function NewFriend({ stage, stars, onClose }: { stage: Stage; stars: Stars; onClose: () => void }) {
  const { play } = useSound();
  const friend = FRIENDS[stage.id];

  useEffect(() => {
    play("coin");
  }, [play]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-friend-title"
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#fffbe8_0%,#bfe6ff_75%)] p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1/2 animate-beams bg-[conic-gradient(from_0deg,transparent_0deg_10deg,rgba(255,255,255,0.7)_10deg_16deg,transparent_16deg_40deg,rgba(255,255,255,0.6)_40deg_46deg,transparent_46deg_80deg,rgba(255,255,255,0.7)_80deg_86deg,transparent_86deg_120deg)]"
      />
      <Image
        src={growthImage(stage.color, growthForStars(stars))}
        alt=""
        width={180}
        height={225}
        priority
        className="relative h-48 w-auto animate-grow-in object-contain"
      />
      <h2 id="new-friend-title" className="relative text-center font-display text-3xl leading-snug font-black">
        <span className="text-cta-to">{friend.name}</span>が
        <br />
        なかまに なった！
      </h2>
      <p className="relative rounded-2xl bg-white/85 px-4 py-2 text-center font-display font-black">「{friend.line}」</p>
      <AppButton variant="cta" size="xl" className="relative mt-2" onClick={onClose} autoFocus>
        やったね！
      </AppButton>
    </div>
  );
}
```

- [ ] **Step 2: 結果画面から出す**

`src/components/play/stage-result.tsx` を変える。演出の間は結果を描かず、閉じてから結果を描き始める（★の飛び出しと点数の数え上げを、演出の裏で終わらせないため。見た目は「結果画面の上に重ねる」と同じ）。

- import に `useState`（`import { useState } from "react";`）と `import { NewFriend } from "@/components/play/new-friend";` を足す
- 今の `export function StageResult(…) { … }` の名前を `function ResultBody(…)` に変える（中身はそのまま）
- その上に、新しい `StageResult` を足す:

```tsx
export function StageResult(props: StageResultProps) {
  // 初めてクリアしたときだけ（★0から★1以上）。もういちどで作り直すと before は1以上なので出ない
  const [newFriendOpen, setNewFriendOpen] = useState(props.cleared && props.outcome.before === 0 && props.outcome.stars > 0);
  if (newFriendOpen) {
    return <NewFriend stage={props.stage} stars={props.outcome.stars} onClose={() => setNewFriendOpen(false)} />;
  }
  return <ResultBody {...props} />;
}
```

（`StageResult` は ssr: false の画面の中で、終わったときに初めて描かれるので、`useState` の初期値で決めてよい）

- [ ] **Step 3: テスト・型チェック・lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS

- [ ] **Step 4: 画面で確かめる（Playwright）**

scratchpad に `check-new-friend.mjs` を作る:

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

async function seed(page, progress = { stars: {}, titleSeen: true }) {
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

async function clearArithmetic(page) {
  for (let i = 0; i < 20; i++) {
    await type(page, await solveArithmetic(page));
    await page.waitForTimeout(700);
  }
}

const dialog = (page) => page.getByRole("dialog");

// 1. 初めてのクリアで出る → やったね！で結果 → もういちどのクリアでは出ない
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  await clearArithmetic(page);
  await dialog(page).getByText("なかまに なった！").waitFor();
  await dialog(page).getByText("ピッコ").waitFor();
  await dialog(page).getByText("「いっしょに かぞえよ！」").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "new-friend.png" });
  await page.getByRole("button", { name: "やったね！" }).click();
  await page.getByText("ステージクリア！").waitFor();
  await page.getByRole("button", { name: "もういちど" }).click();
  await page.getByText("1 / 20").waitFor();
  await clearArithmetic(page);
  await page.getByText("ステージクリア！").waitFor();
  if ((await dialog(page).count()) !== 0) throw new Error("2回目のクリアでも出た");
  await page.close();
}

// 2. 失敗では出ない
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  for (let i = 0; i < 5; i++) {
    await type(page, 99);
    await page.waitForTimeout(700);
  }
  await page.getByText("ざんねん…").waitFor();
  if ((await dialog(page).count()) !== 0) throw new Error("失敗で出た");
  await page.close();
}

// 3. フラッシュでも出る
{
  const page = await newPage();
  await seed(page);
  await page.goto(`${base}/flash/flash-1`);
  for (let i = 0; i < 20; i++) {
    const seen = [];
    while (!(await page.getByText("ぜんぶで いくつ？").isVisible())) {
      const t = (await page.locator("main p.text-6xl").textContent().catch(() => ""))?.trim();
      if (t && /^[+-]?\d+$/.test(t) && seen.at(-1) !== t) seen.push(t);
      await page.waitForTimeout(50);
    }
    await type(page, seen.reduce((s, v) => s + Number(v), 0));
    await page.waitForTimeout(700);
  }
  await dialog(page).getByText("パッチ").waitFor();
  await page.close();
}

// 4. 動きを減らす設定: 光の筋と飛び出す動きが止まる
{
  const page = await newPage({ reducedMotion: "reduce" });
  await seed(page);
  await page.goto(`${base}/stage/add-1`);
  await clearArithmetic(page);
  await dialog(page).getByText("なかまに なった！").waitFor();
  const names = await page.evaluate(() =>
    [".animate-beams", ".animate-grow-in"].map((s) => getComputedStyle(document.querySelector(s)).animationName)
  );
  if (names.some((n) => n !== "none")) throw new Error(`動きが止まっていない: ${names}`);
  await page.close();
}

console.log(errors.length ? `コンソールのエラー:\n${errors.join("\n")}` : "OK");
await browser.close();
```

Run: `node check-new-friend.mjs http://localhost:3000`（scratchpad で）
Expected: `OK`。`new-friend.png` を開き、光の筋・Spru・名前・ひとこと・ボタンの重なりや切れがないかを目で確かめる。フラッシュの1問ずつの読み取りは時間がかかる（数分）

続けて `check-retry.mjs`・`check-play.mjs`・`check-speed.mjs` も流して `OK` を確かめる（結果画面の前に演出が入るため、初めてのクリアを見ているスクリプトが「やったね！」を押さずに止まるかもしれない。止まった場合は、スクリプトのクリアのあとに「やったね！」を押す1行を足し、Ruling を残す）。

- [ ] **Step 5: コミット**

```bash
git add src/components/play/new-friend.tsx src/components/play/stage-result.tsx
git commit -m "feat: ステージを初めてクリアしたときに「なかまに なった！」を出す"
```

---

### Task 6: 通しの確認・記録・プッシュ

**Files:**
- Modify: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（末尾に追記。gitの管理外）

- [ ] **Step 1: すべてのチェック**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: すべて PASS

- [ ] **Step 2: 本番と同じ形で確かめる（Playwright）**

`npx next start -p 3002` で起動し（PIDを控える）、scratchpad で次を流す:

Run: `node check-friends-book.mjs http://localhost:3002 && node check-new-friend.mjs http://localhost:3002 && node check-old-record.mjs http://localhost:3002 && node check-challenge.mjs http://localhost:3002`
Expected: すべて `OK`。終わったら控えたPIDだけを止める

- [ ] **Step 3: 開発の記録に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` の末尾に、実際に起きたことに合わせて追記する:

```markdown

## 2026-10-14 なかま図鑑（分割3）

- 設計書: `2026-10-14-friends-book-design.md`、実装計画: `docs/superpowers/plans/2026-10-14-tane-friends-book.md`
- できたこと: 54体の名前とひとこと、図鑑（なかまの数・チャレンジのメダル・あそびごとのはなの数とコンプリート）、さわると開くカード（育ち方・ひとこと・すきな けいさん・さいこう点・あそぶ・にわに だす）、にわに出す子の選択（8体まで、空きは自動）、初めてのクリアの「なかまに なった！」
- 決めたこと・つまずいたこと: （実装中の判断と、その理由）
- 次: 名前とひとことは Owner が直したら `src/data/friends.ts` を差し替える。分割4（Spra Go のアカウント連携）と Tane 専用のBGMは、あとで決める
```

- [ ] **Step 4: プッシュ**

```bash
cd /Users/katsuhiro.k1215/SmartSprouts/projects/tane
git push -u origin feature/friends-book
```

（キーチェーンの応答待ちで止まったら、PIDを指定して止め、あとでやり直す。`master` へのマージは、最後のレビューのあと Owner に確認してから行う）
