# Tane「しそくえんざん（種が降る）」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新しいあそび「しそくえんざん」（1-1〜1-4）を作る。種が降ってきて、答えを打ち、種をタップすると花が咲いてなかまが出る。1分とエンドレスを選べる。

**Architecture:** 動きと判定は画面を持たない純粋な関数（`seed-problems`・`seed-field`・`seed-stars`）に分け、Vitest で先にテストする。ステージは `kind: "seed"` の新しい種類として `catalog.ts` に足し、★の最大（`maxStars`）とロック解除の★（`unlockStars`）をステージが持つ。ゲージ・フィーバー・点数・HP は既存の `play-session.ts`・`hp.ts`・`useSpeedPlay` を使う。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4 / Vitest（`projects/tane/frontend`）。

**Spec:** `company/spra/tane/docs/2026-10-20-seed-fall-design.md`

## Global Constraints

- ドキュメント・画面の文字は日本語（子ども向けはひらがな中心、既存の文言の調子に合わせる）。
- 1分は `SEED_ROUND_MS = 60_000`。HP は既存の `INITIAL_HP`（5）。種が地面に着く／違う種をタップ → ミス（`answer(..., correct:false)` と HP −1）。
- ★は新しいステージだけ最大5。既存ステージの最大3・ロック解除（前のステージが★1）は変えない。新しいステージは前のステージが**★3**で次が開く。
- 育ち（ステージ別）：新ステージ `0=seed, 1〜2=sprout, 3=bud, 4〜5=flower`。既存ステージは今のまま `1=sprout, 2=bud, 3=flower`。
- 同時に出る種の答えは重ならない。直前と同じ式を続けて出さない。
- 保存データ `tane:progress:v1` のキーは変えない（読み込みで、そのステージの最大を超える★は捨てる）。
- ステージID `shisoku-1`〜`shisoku-4`、表示の番号は「1-1」〜「1-4」。ModeId は `"shisoku"`、ラベル「しそくえんざん」。
- 既存の たし算・ひき算・かけ算・わり算・フラッシュ・チャレンジ・そろばんの挙動は変えない（全テストが通り続けること）。

## Review Focus

- 同じ答えの種が同時に出ない（`seed-field` のテストで、乱数を固定して多数回流す）。
- タブを離れて戻っても、種が一気に落ちない（`tick` は1回の時間を `MAX_TICK_MS` に切る）。
- HP が0になった直後に、同じコマで着地した別の種を二重に数えない・終わったあとに記録を2回書かない。
- 1分の終わりとHP0が同時でも、記録は1回だけ。1問も正解せず終わったとき★0で、「もういちど」が出る。
- 保存データに `shisoku-1: 5` があるのに最大が3のステージ（`add-1: 5`）が混ざっていても、後者は捨てる。

---

## File Structure

- Create `src/lib/game/seed-problems.ts` / `.test.ts` — 式から種の問題へ。重ならない出題。
- Create `src/lib/game/seed-field.ts` / `.test.ts` — 種の動きと判定（時間を渡して進める純粋関数）。
- Create `src/lib/game/seed-stars.ts` / `.test.ts` — 1分の★の決め方。
- Create `src/data/stages/shisoku.ts` — 4ステージのルール・降る速さ・★の目標。
- Modify `src/data/stages/catalog.ts`, `src/lib/game/stars.ts`, `src/lib/game/progression.ts`, `src/lib/progress-store.ts`, `src/lib/game/friends.ts`, `src/data/friends.ts`, `src/lib/mode-params.ts`, `src/lib/result-links.ts` と ★・育ちを使う部品。
- Create `src/components/seed/`（`seed-player.tsx`・`seed-player-loader.tsx`・`seed-field-view.tsx`・`seed-mode-select.tsx`・`seed-result.tsx`）、`src/app/seed/[stageId]/page.tsx`。
- Modify `src/components/play/use-speed-play.ts`（経過時間を外から渡せるように）。

---

### Task 1: 種の問題（seed-problems）

**Files:**
- Create: `src/lib/game/seed-problems.ts`
- Test: `src/lib/game/seed-problems.test.ts`

**Interfaces:**
- Consumes: `generateProblem(rule: ArithmeticRule, rng): Problem`（problem-rules.ts）、演算記号の表示は `src/components/play/problem-text.tsx` と同じ記号（＋ − × ÷）を使う（記号の定義を共有できる形に切り出してよい）。
- Produces:
  - `interface SeedProblem { text: string; answer: number }`（今後の「穴あき」などもこの形で返す）
  - `toSeedProblem(problem: Problem): SeedProblem`（例：add 3,4 → `{ text: "3 ＋ 4", answer: 7 }`）
  - `drawSeedProblem(rule: ArithmeticRule, avoid: { answers: readonly number[]; texts: readonly string[] }, rng?: () => number): SeedProblem`

- [ ] **Step 1: Write the failing tests** — `toSeedProblem` の4演算の表示と答え。`drawSeedProblem` は、`avoid.answers` に含まれる答え・`avoid.texts` に含まれる式を返さない（ルール `add 1〜9` を乱数固定で200回、`answers:[5,6,7]` を避ける）。避けられる問題が無いルール（`add oneOf(1)+oneOf(1)`、避ける答え`[2]`）は、10回試して諦め、**避けずに**返す（止まらない）。
- [ ] **Step 2: Run** `npx vitest run src/lib/game/seed-problems.test.ts` — Expected: FAIL（module not found）
- [ ] **Step 3: Implement** 上のシグネチャ。避けるための再抽選は最大20回。
- [ ] **Step 4: Run** 同じコマンド — Expected: PASS
- [ ] **Step 5: Commit** `git add src/lib/game/seed-problems* && git commit -m "feat: 種の問題（seed-problems）"`

---

### Task 2: 種の動きと判定（seed-field）

**Files:**
- Create: `src/lib/game/seed-field.ts`
- Test: `src/lib/game/seed-field.test.ts`

**Interfaces:**
- Consumes: `SeedProblem`, `drawSeedProblem`（Task 1）、`ArithmeticRule`。
- Produces（定数も export）：
  - `MAX_TICK_MS = 100`、`SPAWN_GAP_MS = 1200`、`SEED_LANES = 3`、`COMBO_SPEEDUP_PER = 0.015`、`COMBO_SPEEDUP_MIN = 0.7`
  - `interface SeedFieldConfig { rule: ArithmeticRule; fallMs: number; simultaneous: 2 | 3 }`
  - `interface Seed { id: number; lane: number; problem: SeedProblem; ageMs: number; progress: number }`（`progress` は 0 が上、1 が地面）
  - `interface SeedField { seeds: Seed[]; nextId: number; sinceSpawnMs: number }`
  - `createField(config: SeedFieldConfig, rng?: () => number): SeedField`（最初の1個だけ出す）
  - `fallMsFor(config: SeedFieldConfig, combo: number): number`（`fallMs × max(0.7, 1 − 0.015×combo)`）
  - `tick(field: SeedField, dtMs: number, config: SeedFieldConfig, combo: number, rng?): { field: SeedField; landed: Seed[] }`（`dtMs` は `MAX_TICK_MS` に切る。`progress += dt / fallMsFor`。1以上は `landed` に出して取り除く。足りない分は `SPAWN_GAP_MS` ごとに1個足す。空いているレーンにだけ出す）
  - `tapSeed(field: SeedField, seedId: number, input: number, config: SeedFieldConfig, rng?): { field: SeedField; result: "correct" | "wrong" | "none"; seed?: Seed }`（合えば取り除く。`none` は存在しない種。種は入力と無関係の `wrong` では残す）

- [ ] **Step 1: Write the failing tests**
  - `createField` は種1個、レーンは 0〜2。
  - `tick` で `progress` が `dt / fallMs` ずつ増える。`fallMs=10000`、`dt=100` を100回で着地（1つ `landed`）。
  - `dtMs=5000` を渡しても進みは `MAX_TICK_MS` 分だけ（タブ復帰の全滅を防ぐ）。
  - `combo=20` と `combo=100` の `fallMsFor` はどちらも `fallMs × 0.7`。`combo=0` は `fallMs`。
  - 同時数 `simultaneous` を超えて出さない。`SPAWN_GAP_MS` たつまで次を出さない。レーンが重ならない。
  - 乱数固定で300回 `tick` を回しても、画面上の種の答えが重複しない。
  - `tapSeed`：合う → `correct` で取り除かれる／違う → `wrong` で残る／無い id → `none`。
- [ ] **Step 2: Run** `npx vitest run src/lib/game/seed-field.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** 上のシグネチャ。`drawSeedProblem` に、画面上の答えと式を `avoid` として渡す。`Seed.ageMs` は `tick` で足す（点数の速さ判定に使う）。
- [ ] **Step 4: Run** 同じコマンド — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: 種の動きと判定（seed-field）"`

---

### Task 3: 1分の★（seed-stars）

**Files:**
- Create: `src/lib/game/seed-stars.ts`
- Test: `src/lib/game/seed-stars.test.ts`

**Interfaces:**
- Produces:
  - `type SeedThresholds = readonly [number, number, number, number, number]`（★1〜★5に必要な正解数）
  - `SEED_ROUND_MS = 60_000`、`SEED_PENALTY_MISTAKES = 3`
  - `starsForSeedRun(input: { correct: number; mistakes: number; defeated: boolean; thresholds: SeedThresholds }): 0 | 1 | 2 | 3 | 4 | 5`

- [ ] **Step 1: Write the failing tests** — 1-1（8,14,20,26,32）：正解 7 → 0、8 → 1、20 → 3、32 → 5、40 → 5。ミス3で ★3→★2、ミス2は変わらない。★1 でミス3以上は ★1 のまま（下がらない）。`defeated: true` は正解が多くても 0。
- [ ] **Step 2: Run** `npx vitest run src/lib/game/seed-stars.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** 基本の★ = 達した目標の数。ミス3以上で −1（最低1）。
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: 1分の★の決め方（seed-stars）"`

---

### Task 4: ステージのデータと★の最大・ロック解除

**Files:**
- Create: `src/data/stages/shisoku.ts`
- Modify: `src/data/stages/catalog.ts`、`src/lib/game/stars.ts`、`src/lib/game/progression.ts`
- Test: `src/data/stages/catalog.test.ts`、`src/lib/game/progression.test.ts`、`src/lib/game/stars.test.ts` に追記

**Interfaces:**
- Consumes: `SeedFieldConfig`（Task 2）、`SeedThresholds`（Task 3）、`ArithmeticRule`。
- Produces:
  - `SHISOKU_STAGE_SPECS: StageSpec<SeedStageRule>[]`、`interface SeedStageRule { rule: ArithmeticRule; fallMs: number; simultaneous: 2 | 3; thresholds: SeedThresholds }`
    - 1-1「たしひき 1けた」：`mix[add 1〜9＋1〜9, sub 2〜9−1〜9]`、`fallMs 9000`、2個、`[8,14,20,26,32]`
    - 1-2「たしひき 2けた」：`mix[add 10〜99＋10〜99, sub 20〜99−10〜89]`、`8500`、2個、`[7,12,17,22,27]`
    - 1-3「かけわり くく」：`mix[mul 2〜9×2〜9, div ÷2〜9 商2〜9]`、`7500`、3個、`[7,12,17,22,27]`
    - 1-4「しそく ごちゃまぜ」：1-2 と 1-3 の4つの `mix`、`6000`、3個、`[6,10,14,19,24]`
    - 説明（description）は短く（「1けた」「2けた」「九九」「ぜんぶ」）
  - `catalog.ts`：`ModeId` に `"shisoku"`（`MODE_IDS` の末尾）、`MODES.shisoku = { label: "しそくえんざん", symbol: null }`、`SeedStage { kind: "seed"; rule: SeedStageRule }`、`Stage` に追加、`STAGES` に4つ（`isBoss: false`）、`playPath → /seed/<id>`、`maxStars(stage): 3 | 5`、`unlockStars(stage): 1 | 3`、`stageLabel` 用の表示番号 `displayNumber(stage): string`（seed は `1-${number}`、他は `String(number)`）
  - `stars.ts`：`Stars = 0|1|2|3|4|5`、`EarnedStars = 1|2|3|4|5`。`growthForStars` は残し、新しく `growthForStage(stage: Stage, stars: Stars): Growth`（新ステージは 0 seed／1〜2 sprout／3 bud／4〜5 flower、既存は従来どおり）
  - `progression.ts`：`isUnlocked` は前のステージの★が `unlockStars(stage)` 以上、`MAX_STARS` の定数は `maxStars(stage)` に置き換え（`modeStarSummary`、`nextToPlayInMode`、`sorobanNextStage`）

- [ ] **Step 1: Write the failing tests**
  - catalog：`stagesOfMode("shisoku")` は4つ、IDは `shisoku-1`〜`4`、`playPath` は `/seed/shisoku-1`、`maxStars` は 5（既存は 3）、`displayNumber(shisoku-3) === "1-3"`。全ルールが `generateProblem` で50問ずつ作れて、答えが 0〜999（`MAX_ANSWER` 内）。
  - progression：`shisoku-1` が★2 → `shisoku-2` は閉じたまま、★3 で開く。既存の `add-1` ★1 → `add-2` 開く（変えない）。`modeStarSummary("shisoku", {})` は `max: 20`。`continueTarget` が shisoku を回る（`lastModeId:"soroban"` 以外で、他が全部★3以下なら shisoku が出る…ではなく、既存の順序テストが壊れないこと）。
  - stars：`growthForStage` の新旧の対応表。
- [ ] **Step 2: Run** `npx vitest run src/data/stages src/lib/game/progression.test.ts src/lib/game/stars.test.ts` — Expected: FAIL（型・関数が無い）
- [ ] **Step 3: Implement** 上のとおり。`Record<ModeId, …>`（`MODES`、`SECONDS_PER_PROBLEM`、`BOSS_COLORS` は除外）を埋める。`secondsPerProblem` は `fallMs / 1000`。色は `colorForStage`。`tsc` が通るまで、型エラーになる既存の呼び出し（`Record<ModeId>`、`switch`）を直す。
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — Expected: 全テスト PASS、型エラーなし
- [ ] **Step 5: Commit** `git commit -m "feat: しそくえんざんのステージと★の最大・ロック解除"`

---

### Task 5: 保存データ（★5・エンドレスの記録）

**Files:**
- Modify: `src/lib/progress-store.ts`、`src/lib/progress-store.test.ts`

**Interfaces:**
- Consumes: `maxStars(stage)`（Task 4）。
- Produces:
  - `Progress` に `endless: Readonly<Record<string, { correct: number; combo: number }>>`（`EMPTY_PROGRESS.endless = {}`）
  - `parseProgress`：★は 1〜`maxStars(stage)` の整数だけ残す。`endless` は正の整数だけ、存在するステージだけ。`endless` が無い古いデータは `{}` として読む
  - `recordEndlessResult(stageId: string, correct: number, combo: number): { newBestCorrect: boolean; newBestCombo: boolean }`（それぞれ大きいほうを残す）

- [ ] **Step 1: Write the failing tests** — `{"stars":{"shisoku-1":5,"add-1":5}}` を読むと `shisoku-1:5` だけ残る。`shisoku-1:6` は捨てる。`endless` の読み書きと、小さい値で上書きしないこと、古いデータで `endless` が `{}`。
- [ ] **Step 2: Run** `npx vitest run src/lib/progress-store.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** `withResult` の `stars as EarnedStars` はそのまま使える（型が広がる）。
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: 保存データを★5とエンドレスの記録に対応"`

---

### Task 6: なかま4体と表示まわり

**Files:**
- Modify: `src/data/friends.ts`、`src/data/friends.test.ts`（あれば）、`src/lib/game/friends.ts`、`src/lib/game/friends.test.ts`、`src/lib/mode-params.ts`、`src/lib/result-links.ts`、★や育ちを出す部品（`stars-row.tsx`・`grow-image.tsx`・`stage-card.tsx`・`stage-grid.tsx`・`mode-screen.tsx`・`mode-tabs.tsx`・`garden.tsx`・`home-hud.tsx`・`friend-cell.tsx`・`friend-sheet.tsx`・`fever-friends.tsx`・`new-friend.tsx`・`stage-result.tsx`）

**Interfaces:**
- Consumes: `growthForStage`、`maxStars`、`displayNumber`（Task 4）。
- Produces:
  - `FRIENDS` に4体：`shisoku-1` ポムポ「たして ひいて ぽん！」／`shisoku-2` ケタロ「2けたも へっちゃらだよ」／`shisoku-3` ククルン「くくで ぽんぽん！」／`shisoku-4` ゴチャモ「ぜんぶ まぜても だいじょうぶ！」（Claude の案。Owner が直したら差し替え）
  - `stageLabel` / `continueLabel` / `unlockHint` / `nextGrowthText` / `favoriteText`：shisoku は「1-1 たしひき 1けた」の形で呼ぶ（番号だけにしない）
  - `StarsRow` に `max?: number`（既定3）。★5のステージは5個並べる。`growthForStars(stars)` を呼んでいる所はすべて `growthForStage(stage, stars)` に変える

- [ ] **Step 1: Write the failing tests** — 友だちが 84 体（既存テストの数を更新）、shisoku の4体に名前とひとことがある、`stageLabel(shisoku-2)` が「1-2 たしひき 2けた」、`unlockHint` が★3を求める文になる（「★3で あえるよ」の調子は既存に合わせる）、`mode-params` が `shisoku` を受ける。
- [ ] **Step 2: Run** `npx vitest run` — Expected: FAIL（上のテストだけ）
- [ ] **Step 3: Implement** 上のとおり。`grep -rn "growthForStars\|StarsRow" src` で全呼び出しを直す。★のしきい値を「3」と直書きしている所は `maxStars` に。
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: しそくえんざんのなかま4体と★5の表示"`

---

### Task 7: プレイ画面

**Files:**
- Modify: `src/components/play/use-speed-play.ts`（`submit(correct, remainingAfter, bonusPoints = 0, elapsedMs?: number)`：渡されたら時計の代わりに使う）
- Create: `src/components/seed/seed-player-loader.tsx`（`ssr:false` の dynamic、soroban のものと同じ形）、`seed-player.tsx`、`seed-field-view.tsx`、`seed-mode-select.tsx`、`seed-result.tsx`、`src/app/seed/[stageId]/page.tsx`（`SorobanStage` のページと同じ作りで、`kind !== "seed"` は `StageNotFound`）

**Interfaces:**
- Consumes: Task 1〜6 すべて。`answer()`（play-session）、`applyDamage / isDefeated / INITIAL_HP`（hp.ts）、`NumericKeypad`、`GaugeBar`、`ComboText`、`FeverStage / FeverBanner`、`PointsPopup`、`ScoreCounter`、`ChallengeTimer`（残り時間の出し方を参考に、60秒用の `SeedTimer` を同じ形で作る）、`recordStageResult`、`recordEndlessResult`、`rememberLastMode`、`NewFriend`。
- Produces: `SeedPlayer({ stageId }: { stageId: string })`。流れは `select`（1分／エンドレス）→ `countdown`（3・2・1）→ `playing` → `result`。

動き（既存のプレイ画面と同じ作法で）：
- [ ] **Step 1: 画面の骨組み。** `select` で「1分」「エンドレス」を選ぶ。`playing` 中は、`requestAnimationFrame` で `dt` を求めて `tick` に渡す。`tick` は1回の時間を `MAX_TICK_MS` に切るので、タブ復帰で全滅しない。1分は、**足し合わせた dt** が `SEED_ROUND_MS` に達したら時間切れ（ウォールクロックを使わない）。
- [ ] **Step 2: 判定。** テンキーで入力（既存 `appendDigit`）。種をタップ → `tapSeed`。`correct`：`answer(session, { correct:true, elapsedMs: seed.ageMs, secondsPerProblem: fallMs/1000, remainingAfter: Infinity })`、花が咲いてなかま（そのステージのスプル）が飛び出す演出、入力を消す。`wrong`：`answer(... correct:false)`、HP −1、入力を消す。`landed` の種ごと：同じ失敗処理。HP が0になったら、そのコマの残りの `landed` は数えず、終わる。終わりの処理（記録・結果）は `endedRef` で1回だけ。
- [ ] **Step 3: 終わりと記録。** 1分：`starsForSeedRun({ correct, mistakes, defeated, thresholds })`、`recordStageResult(stageId, stars, score)`、結果に ★・正解数・点数・最高点・「もういちど」「つぎへ」（★3以上のときだけ「つぎへ」）、初めて★1以上になったら `NewFriend`。エンドレス：HP0で終わり、`recordEndlessResult`、結果に正解数・最長コンボ。★は出さない。1問も正解せず終わったら「もういちど」だけ。
- [ ] **Step 4: 見た目。** 種は丸い種のイラスト（既存の `public/spru` を使うか、CSS の丸＋式）に式を書く。レーンは `SEED_LANES` 等分。動きを減らす設定（`src/lib/motion.ts`）では揺れ・光を控える（落ちる速さは変えない）。地面に着く手前（`progress > 0.8`）で種を赤くする。
- [ ] **Step 5: Run** `npx tsc --noEmit && npm run lint && npx vitest run` — Expected: PASS。
- [ ] **Step 6: Commit** `git commit -m "feat: しそくえんざんのプレイ画面"`

---

### Task 8: ホーム・ステージ選び・ブラウザ確認・記録

**Files:**
- Modify: `src/components/home/mode-buttons.tsx`（そろばんの下に、同じ形の横長ボタン `ShisokuLink`。★/20 を出す）、`src/components/mode/mode-screen.tsx` / `mode-tabs.tsx` / `stage-grid.tsx` / `stage-card.tsx`（shisoku のタブ、番号は「1-1」、★5個）、`src/lib/bgm-route.ts`（`/seed/` はクイズの曲、既存の `/stage/` と同じ扱い。テスト追記）
- Modify: `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`、`company/spra/CLAUDE.md`（Tane の方針の欄に追記）
- 作業用フォルダ（リポジトリ外）に確認スクリプト `check-seed-play.mjs`

- [ ] **Step 1: Write the failing test** — `bgm-route.test.ts` に `/seed/shisoku-1` がクイズの曲になるテスト。
- [ ] **Step 2: Run** `npx vitest run src/lib/bgm-route.test.ts` — Expected: FAIL → 実装 → PASS
- [ ] **Step 3: ホームと一覧の組み込み。** 上のとおり。
- [ ] **Step 4: ブラウザ確認（Playwright、スマホ幅390px）。** 偽の時計で、(a) ホーム → しそくえんざん → 1-1 → 1分を選ぶ → 種が降る、(b) 答えを打って種をタップ → 花とフィーバー前のゲージ、(c) 放置すると種が着地してHPが減り、5回で終わる、(d) 60秒で結果に★、(e) エンドレスの結果、(f) 1-1 を★3にすると 1-2 が開く、(g) 既存の たし算・そろばんが変わらない。スクリーンショットで見た目を確認する。
- [ ] **Step 5: 記録。** 開発の記録と Spra のまとめに追記。
- [ ] **Step 6: Run** `npx vitest run && npx tsc --noEmit && npm run lint && npm run build` — Expected: すべて PASS
- [ ] **Step 7: Commit** `git commit -m "feat: しそくえんざんをホームとステージ選びに追加"`
