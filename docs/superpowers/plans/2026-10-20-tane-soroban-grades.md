# Tane そろばんの級 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** あそび「そろばん」を足し、日珠連の珠算検定の10級〜4級（26ステージ）を、検定と同じ大きさの問題で、今のコンボ・フィーバーつきで遊べるようにする。

**Architecture:** 問題づくりと級の表は画面を含まない `src/lib/game/soroban-rules.ts` にまとめる。ステージは `catalog.ts` の `Stage` に `kind: "soroban"` を足して既存の記録・図鑑・つづきからに乗せる。「番号順に開く・20問」の決め打ちを、そろばんだけ「級の最初は開いている・10問」に一般化する。プレイ画面は四則演算の画面をもとに `components/soroban/` に作り、ゲージ・フィーバーなどの部品を使い回す。

**Tech Stack:** Next.js 16.2.10（App Router）、React 19.2.4、TypeScript、Tailwind CSS v4、Vitest 3、Playwright（scratchpad）。

**Spec:** `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-10-20-soroban-grades-design.md`（調査: `2026-10-20-soroban-levels-research.md`）

**作業場所:** リポジトリ `projects/tane`、コマンドは `projects/tane/frontend` で実行。ブランチ `feature/soroban-grades` を `master` から切る。確認スクリプトは scratchpad（`/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/d770f439-71d9-4189-a7a7-4f836ce49f0c/scratchpad`、Playwright 入り）。開発サーバーはポート3000で動いているもの（この会話で起動した `next dev`）を使う。

## Global Constraints

- 級の表（設計書3.1）・目安の秒数の式（4.1）・もぎけんていの内訳（3.5）は、設計書の値をそのまま使い、`soroban-rules.ts` の定数にまとめる
- ステージid は `soroban-1`〜`soroban-26`。並びは 10級→4級、級の中は みとりざん・かけざん・（わりざん）・もぎけんてい
- ステージ名「6きゅう みとりざん」、なかまの名前とひとことは設計書の付録Aのとおり
- そろばんのステージは1ステージ10問。ほかのあそびは20問のまま
- 答えの入力は、そろばんのステージだけ7けた、ほかは4けたのまま
- 記録のキーと形は変えない（`tane:progress:v1`）
- UIの文言・コメントは日本語、子ども向けはひらがな中心。絵文字を使わない。新しい npm パッケージを足さない
- `react-hooks/*` の lint に違反しない
- コミットはタスクの最後に1回、`feat: …` の日本語、最後に `Co-Authored-By: <実行するモデル名> <noreply@anthropic.com>`

## Review Focus

1. **6級の子が初めて開いたとき**: 「6きゅう みとりざん」が開いていてすぐ遊べ、6級で遊んだあとは、ステージ選択とつづきからが6級の続きを指すこと（Task 2 のテスト）
2. **みとりざんのひき算**: どんな乱数でも途中の合計が0より小さくならず、10・9級にはひき算が出ないこと（Task 1 の、何百回も作るテスト）
3. **大きな答え**: 4級のかけざん（7けた）を打てて正解でき、ほかのあそびは4けたで止まること（Task 3 のテスト、Task 4 の画面確認）
4. **画面に収まるか**: 4級みとりざん（5けた×10口）で、数字・答えの欄・テンキーが390×844で重ならず、6つになったあそびのタブで画面が横にはみ出さないこと（Task 4・5 の画面確認）
5. **ほかのあそびへの影響**: 四則演算・フラッシュの20問・番号順の開き方・★・図鑑が今のままで、図鑑の数が「/ 80」になること（既存テストと Task 5 の画面確認）

---

## ファイル構成

| ファイル | 役割 | タスク |
|---|---|---|
| `src/lib/game/soroban-rules.ts` | 級の表、問題づくり、目安の秒数・目標タイム | 1 |
| `src/data/stages/soroban.ts`・`catalog.ts` | 26ステージ、`SorobanStage`、問題数・目標タイム・あそびの道 | 2 |
| `src/lib/game/progression.ts` | 級の最初は開く、いまの級の次のステージ | 2 |
| `src/data/friends.ts` | 26体のなかま | 2 |
| `src/lib/game/answer-input.ts`・`src/components/numeric-keypad.tsx` | 打てる桁数を変えられる | 3 |
| `src/components/soroban/*`・`src/app/soroban/[stageId]/page.tsx`・`src/lib/bgm-route.ts` | プレイ画面 | 4 |
| `src/components/home/mode-buttons.tsx`・`src/components/mode/*` | ホームの横長ボタン、タブ、カード・マスの級の表示 | 5 |

---

### Task 0: 作業ブランチ

- [ ] **Step 1:** `cd projects/tane && git status --short && git switch master && git switch -c feature/soroban-grades`
  Expected: 作業中の変更なし、`Switched to a new branch 'feature/soroban-grades'`

---

### Task 1: 級の表と問題づくり

**Files:**
- Create: `src/lib/game/soroban-rules.ts`
- Test: `src/lib/game/soroban-rules.test.ts`

**Interfaces:**
- Produces:
  - `type SorobanEvent = "mitori" | "kake" | "wari"`、`type SorobanStageEvent = SorobanEvent | "mogi"`
  - `interface GradeSpec { grade: number; mitori: { digits: number; count: number; subtract: boolean }; kakeDigits: number; wariDigits: number | null }`
  - `SOROBAN_GRADES: readonly GradeSpec[]`（10級→4級の順、設計書3.1の値）、`gradeSpec(grade: number): GradeSpec`
  - `SOROBAN_PROBLEMS = 10`、`SOROBAN_MAX_ANSWER_LENGTH = 7`
  - `type SorobanProblem = { event: "mitori"; terms: number[]; answer: number } | { event: "kake"; a: number; b: number; answer: number } | { event: "wari"; a: number; b: number; answer: number }`（`terms` はひき算の口を負の数で持つ。わりざんは a ÷ b）
  - `interface SorobanRule { grade: number; event: SorobanStageEvent }`
  - `generateSorobanProblems(rule: SorobanRule, rng?: () => number): SorobanProblem[]`（いつも10問）
  - `secondsFor(event: SorobanEvent, grade: number): number`、`sorobanTargetMs(rule: SorobanRule): number`（10問ぶんの目安の合計）
  - `mogiEvents(grade: number): SorobanEvent[]`（もぎけんていの10問の種目。わりざんがある級は みとり2・かけ4・わり4、無い級は みとり2・かけ8）

- [ ] **Step 1: 失敗するテストを書く** — `src/lib/game/soroban-rules.test.ts`。乱数は分割2bの `challenge-rules.test.ts` と同じ mulberry32 の `seeded(seed)` を使い、各級・各種目を種を変えて300回ずつ作る

```ts
it("級の表は設計書3.1のとおり", () => {
  expect(SOROBAN_GRADES.map((g) => g.grade)).toEqual([10, 9, 8, 7, 6, 5, 4]);
  expect(gradeSpec(6)).toEqual({ grade: 6, mitori: { digits: 3, count: 10, subtract: true }, kakeDigits: 5, wariDigits: 4 });
  expect(gradeSpec(10)).toEqual({ grade: 10, mitori: { digits: 2, count: 5, subtract: false }, kakeDigits: 3, wariDigits: null });
  expect(gradeSpec(8).mitori).toEqual({ digits: 2, count: 8, subtract: true });
  expect(gradeSpec(4)).toMatchObject({ mitori: { digits: 5, count: 10 }, kakeDigits: 7, wariDigits: 6 });
});
```

ほかに書くテスト（名前と確かめること）:
- 「みとりざんは口数と桁がちょうど」: 各級で `terms.length === count`、すべての `|term|` が `10^(digits-1)`〜`10^digits - 1`、`terms[0] > 0`、`answer === terms の合計`
- 「途中の合計が0より小さくならず、答えは0より大きい」: 各級300回、前から足していった値がずっと0以上、`answer > 0`
- 「10級・9級はたし算だけ、8級からはひき算も出る」: 10・9級は負の口が0、8級は300回のうちひき算の口が1つ以上
- 「かけざんは実法の桁の合計がちょうどで、実の桁 ≧ 法の桁、法が1けたなら2〜9」: `digits(a) + digits(b) === kakeDigits`、`digits(a) >= digits(b)`、`answer === a * b`
- 「6級のかけざんは 4けた×1けた と 3けた×2けた の両方が出る」
- 「わりざんは法商の桁の合計がちょうどで、必ず割り切れる」: `digits(b) + digits(answer) === wariDigits`、`a === b * answer`、1けたの法・商は2〜9
- 「答えはいつも7けた以内」: 全級・全種目で `String(answer).length <= 7`
- 「もぎけんていは10問で、種目の数が決まっている」: 6級は mitori 2・kake 4・wari 4、10級は mitori 2・kake 8（並びは問わない）
- 「目安の秒数は設計書4.1の式」: `secondsFor("mitori", 10) === 6`、`("mitori", 8) === 10`、`("mitori", 6) === 18`、`("mitori", 4) === 30`、`("kake", 6) === 10`、`("kake", 4) === 14`、`("wari", 8) === 8`、`("wari", 6) === 10`、`("wari", 5) === 13`
- 「目標タイムは10問ぶんの合計」: `sorobanTargetMs({ grade: 6, event: "mitori" }) === 180_000`、`sorobanTargetMs({ grade: 6, event: "mogi" }) === (2 * 18 + 4 * 10 + 4 * 10) * 1000`
- 「どの級・種目でも10問」

- [ ] **Step 2:** `npx vitest run src/lib/game/soroban-rules.test.ts` → FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**（`soroban-rules.ts`）。決め打ちの値と、作り方の決めごと:
  - 「その桁ちょうどの数」は `10^(d-1)`〜`10^d - 1`。かけざんの法・わりざんの法と商が1けたのときだけ 2〜9
  - みとり: 1口目はたし算。2口目からは、`subtract` の級でだけ確率1/3でひき算にする。ひくと合計が0より小さくなるときはたし算にする。答えが0になったら作り直す
  - かけ: 実法の桁の組み合わせ（実 ≧ 法 ≧ 1、合計 N）から同じ確率で選ぶ
  - わり: （法 ≧ 1、商 ≧ 1、合計 N）から同じ確率で選び、法と商を作って a = 法×商
  - もぎ: `mogiEvents(grade)` の種目で1問ずつ作り、並びを乱数で混ぜる
  - 秒数: みとり `Math.ceil(count * digits * 0.6)`、かけ `kakeDigits * 2`、わり `Math.ceil(wariDigits * 2.5)`

- [ ] **Step 4:** `npx vitest run src/lib/game/soroban-rules.test.ts && npm run typecheck` → PASS

- [ ] **Step 5:** commit `feat: そろばんの級の表と問題づくり（みとり・かけ・わり・もぎ）を追加`

---

### Task 2: そろばんのステージ・開き方・なかま

**Files:**
- Create: `src/data/stages/soroban.ts`
- Modify: `src/data/stages/catalog.ts`、`src/lib/game/progression.ts`、`src/data/friends.ts`
- Test: `src/data/stages/catalog.test.ts`、`src/lib/game/progression.test.ts`（`friends.test.ts` は今のまま全ステージを見るので、26体が足りないと落ちる）

**Interfaces:**
- Consumes: Task 1 の `SOROBAN_GRADES`・`SorobanRule`・`SorobanStageEvent`・`sorobanTargetMs`・`SOROBAN_PROBLEMS`
- Produces:
  - `ModeId` に `"soroban"`、`MODE_IDS` の最後に `"soroban"`、`MODES.soroban = { id: "soroban", label: "そろばん", symbol: null }`
  - `interface SorobanStage extends StageBase { kind: "soroban"; grade: number; event: SorobanStageEvent; rule: SorobanRule }`、`Stage` の union に足す
  - `problemCount(stage: Stage): number`（そろばん10、ほか `PROBLEMS_PER_STAGE`）
  - `targetMs(stage)` はそろばんなら `sorobanTargetMs(stage.rule)`、ほかは今のまま
  - `playPath(stage)` はそろばんなら `/soroban/${id}`
  - `progression.ts`: `isUnlocked` はそろばんの `event === "mitori"` を初めから開く。`initialFocusStage("soroban", …)` と `continueTarget` は「いまの級」の決め方（設計書2.4）を使う。`sorobanNextStage(stars: StarMap): Stage` を export する

- [ ] **Step 1: 失敗するテストを書く**

`catalog.test.ts`:
- 既存の「全部で54…」を「全部で80、あそびごとに12・12・12・12・6・26」に変える
- 「そろばんは10級→4級、級の中は みとり・かけ・（わり）・もぎ」: `stagesOfMode("soroban").map((s) => \`${s.grade}${s.event}\`)` が `["10mitori","10kake","10mogi","9mitori","9kake","9mogi","8mitori","8kake","8wari","8mogi", …, "4mogi"]`（26個）
- 「id・名前・説明」: `getStage("soroban-15")` が `{ grade: 6, event: "mitori", name: "6きゅう みとりざん", description: "3けた・10口" }` を含む。かけざんの説明は「あわせて 5けた」、もぎけんていは `isBoss === true`
- 「問題数と目標タイム」: `problemCount(getStage("soroban-15")!) === 10`、`problemCount(getStage("add-1")!) === 20`、`targetMs(getStage("soroban-15")!) === 180_000`、`targetMs(getStage("add-1")!) === 80_000`
- 「プレイのURL」: `playPath(getStage("soroban-1")!) === "/soroban/soroban-1"`

`progression.test.ts`:
- 「そろばんは、どの級もみとりざんが初めから開き、級の中は順番」: `soroban-15`（6級みとり）は `{}` で開く、`soroban-16`（6級かけ）は `{}` で閉じ、`{ "soroban-15": 1 }` で開く
- 「そろばんで初めて開くと10級のみとりざん」: `initialFocusStage("soroban", {}).id === "soroban-1"`
- 「いちばん上の級の続きを選ぶ」: `{ "soroban-1": 3, "soroban-15": 2 }` → `"soroban-16"`。`{ "soroban-15": 3, "soroban-16": 3, "soroban-17": 3, "soroban-18": 3 }`（6級を全部★3）→ `"soroban-19"`（5級みとり）
- 「級を全部★1以上にしたら、★3でない最初のステージ」: 6級を ★1・★3・★3・★3 → `"soroban-15"`
- 「つづきからも同じ」: `continueTarget({ "soroban-15": 2 }, "soroban").id === "soroban-16"`
- 「ほかのあそびは今のまま」: 既存のテストがそのまま通る

- [ ] **Step 2:** `npx vitest run src/data src/lib/game/progression.test.ts` → FAIL（数・そろばんのステージが無い。`friends.test.ts` も26体が無くて落ちる）

- [ ] **Step 3: 実装する**
  - `soroban.ts`: `SOROBAN_GRADES` から26ステージ分の `{ grade, event, name, description }` を作る。説明は みとり「{digits}けた・{count}口」、かけ・わり「あわせて {N}けた」、もぎ「みとり・かけ・わり」（10・9級は「みとり・かけ」）
  - `catalog.ts`: 上の Interfaces どおり。色は今の `colorFor` の決め方（ふつうの8色を順に、もぎけんていはボスの色を `["crystal", "platinum", "obsidian"]` から級ごとに順に）。`SECONDS_PER_PROBLEM` は使わず、`secondsPerProblem` には `sorobanTargetMs(rule) / 1000 / SOROBAN_PROBLEMS` を入れる（カードなどの表示用。速さの点は Task 4 で問題ごとの値を使う）。`isBoss` は `event === "mogi"`
  - `progression.ts`: `isUnlocked` に上の条件。`sorobanNextStage` は設計書2.4の決め方（★1以上のステージのうち、`grade` がいちばん小さい級。その級の中で ★0で開いているもの → ★3でないもの → 1つ上の級（grade − 1）のみとりざん → 最後のステージ。そろばんに★が1つも無ければ `soroban-1`）。`initialFocusStage` は、そろばんで `requestedStageId` が無いときにこれを使う。`continueTarget` の `nextToPlayInMode` は、そろばんのときこれを使う
  - `friends.ts`: 付録Aの26体を `soroban-1`〜`soroban-26` の順で足す（10級みとり＝コロン … 4級もぎ＝ヨツバ）

- [ ] **Step 4:** `npm test && npm run typecheck` → すべて PASS。型エラーで `Stage` の union を `kind` で分けている場所（`stage-player`・`flash-stage-player`・`mode-buttons` など）が見つかったら、そろばんを外す・足す最小の直しをする

- [ ] **Step 5:** commit `feat: そろばんの26ステージ（10級〜4級）と、級の最初が開く開き方・なかまを追加`

---

### Task 3: 打てる桁数

**Files:**
- Modify: `src/lib/game/answer-input.ts`、`src/components/numeric-keypad.tsx`
- Test: `src/lib/game/answer-input.test.ts`

**Interfaces:**
- Produces: `appendDigit(current: string, digit: string, maxLength: number = MAX_ANSWER_LENGTH): string`、`NumericKeypad` に `maxLength?: number`（省略は4）

- [ ] **Step 1: 失敗するテスト**: 「桁数の上限を渡せる」: `appendDigit("123456", "7", 7) === "1234567"`、`appendDigit("1234567", "8", 7) === "1234567"`、`appendDigit("1234", "5") === "1234"`（省略は4けた）
- [ ] **Step 2:** `npx vitest run src/lib/game/answer-input.test.ts` → FAIL（7けた目が入らない）
- [ ] **Step 3:** 実装。テンキーは `maxLength` を `appendDigit` に渡すだけ
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint` → PASS
- [ ] **Step 5:** commit `feat: テンキーで打てる桁数をステージごとに変えられるようにする`

---

### Task 4: そろばんのプレイ画面

**Files:**
- Create: `src/components/soroban/soroban-player.tsx`・`soroban-player-loader.tsx`・`mitori-sheet.tsx`・`soroban-problem-text.tsx`、`src/app/soroban/[stageId]/page.tsx`
- Modify: `src/lib/bgm-route.ts`（`/soroban/` もクイズの曲）、`src/lib/bgm-route.test.ts`

**Interfaces:**
- Consumes: Task 1 の `generateSorobanProblems`・`secondsFor`・`SOROBAN_MAX_ANSWER_LENGTH`、Task 2 の `SorobanStage`・`problemCount`・`targetMs`、Task 3 の `maxLength`、2aの `useSpeedPlay`・`SpeedHud`・`PlayHeader`・`FeverStage`・`FeverBanner`・`FeverFriends`・`ComboText`・`PointsPopup`・`FeedbackText`・`finishStage`・`StageResult`、`createStage`・`submitAnswer`（`stage.ts`。`StageState<SorobanProblem>` で使える）
- Produces: `/soroban/[stageId]`。`SorobanPlayer({ stageId })`、`MitoriSheet({ terms }: { terms: number[] })`、`SorobanProblemText({ problem })`（かけ「345 × 67 ＝」・わり「1428 ÷ 34 ＝」）

- [ ] **Step 1: 失敗するテスト**（`bgm-route.test.ts`）: `bgmTrackFor("/soroban/soroban-1") === "quiz"` → `npx vitest run src/lib/bgm-route.test.ts` で FAIL を確かめ、`bgm-route.ts` の `PLAY_PREFIXES` に `/soroban/` を足して PASS
- [ ] **Step 2: 画面を作る**
  - `soroban-player.tsx` は `stage-player.tsx` と同じ流れ（問題を作る → 答える → 600msの演出 → 終わったら `finishStage` と `StageResult`）。ちがうところ:
    - 問題は `generateSorobanProblems(stage.rule)`（10問）
    - `useSpeedPlay` の `secondsPerProblem` は、いまの問題の `secondsFor(problem.event, stage.grade)`
    - テンキーに `maxLength={SOROBAN_MAX_ANSWER_LENGTH}`
    - 問題の表示は、みとりなら `MitoriSheet`、かけ・わりなら `SorobanProblemText`
    - `PlayHeader` の戻り先は `modeHref("soroban", { stageId })`
  - `mitori-sheet.tsx`: 数を縦に並べ、右そろえ・等幅の数字（`tabular-nums`）。ひき算の口は「−」を付けて色を変える。10口でもテンキーと重ならないよう、行の高さを詰める（文字は口数と桁で小さくしてよい）。読み上げ用に、全体に `aria-label`（例「みとりざん 123 たす 45 ひく 67 …」）
  - `soroban-player-loader.tsx`・`page.tsx`: `stage-player-loader.tsx` と同じく `ssr: false`、`key={stageId}`。そろばんでないステージidなら `StageNotFound`
- [ ] **Step 3:** `npm test && npm run typecheck && npm run lint` → PASS
- [ ] **Step 4: 画面で確かめる（Playwright）** — scratchpad に `check-soroban-play.mjs` を作る。確かめること:
  - `/soroban/soroban-15`（6級みとり）: 10個の数が縦に出る。シートの下の端がテンキーの上の端より上（`boundingBox` でくらべる）。足して答えると「せいかい！」
  - `/soroban/soroban-23`（4級みとり、5けた×10口）: 同じく重ならない。スクリーンショット `soroban-mitori-4.png`
  - `/soroban/soroban-24`（4級かけ）: 答えを最後まで打てる（7けたになる問題が出るまで、答えて進む）。スクリーンショット `soroban-kake-4.png`
  - `/soroban/soroban-17`（6級わり）: 「÷」の問題を解ける
  - 6級みとりを10問クリア → 「なかまに なった！」（ミトリ）→「やったね！」→「ステージクリア！」と★
  - `/soroban/add-1` → 「ステージが みつかりません」
  - コンソールにエラーが出ない
  答えの計算は、みとりはシートの数（「−」付きは引く）を足し、かけ・わりは文字から計算する
- [ ] **Step 5:** commit `feat: そろばんのプレイ画面（みとりざんの縦並び・かけざん・わりざん）を追加`

---

### Task 5: ホーム・ステージ選択・図鑑への組み込み

**Files:**
- Modify: `src/components/home/mode-buttons.tsx`、`src/components/mode/mode-tabs.tsx`、`src/components/mode/stage-card.tsx`、`src/components/mode/stage-grid.tsx`

**Interfaces:**
- Consumes: Task 2 の `SorobanStage`・`problemCount`・`modeStarSummary("soroban", …)`
- Produces: ホームの横長「そろばん」ボタン（`/mode/soroban` へ）

- [ ] **Step 1: 作る**
  - `mode-buttons.tsx`: 今の3列×2段（四則・フラッシュ・チャレンジ）は `soroban` を除いて今のまま。その下に横長のリンク「そろばん」「10きゅう〜4きゅう」「★ 獲得/78」
  - `mode-tabs.tsx`: 6つのタブが 390px で収まるか、横にスクロールできるようにする（画面全体が横にはみ出さないこと）
  - `stage-card.tsx`: 問題数は `problemCount(stage)`。そろばんでは「ステージ n / 26」の代わりに「{grade}きゅう」
  - `stage-grid.tsx`: そろばんでは級ごとに見出し（「6きゅう」）を入れて区切り、マスの左上の数字の代わりに種目（「みとり」「かけ」「わり」「もぎ」）
- [ ] **Step 2:** `npm test && npm run typecheck && npm run lint` → PASS
- [ ] **Step 3: 画面で確かめる（Playwright）** — scratchpad に `check-soroban-home.mjs`:
  - ホームに「そろばん」ボタン → `/mode/soroban`。初めては「10きゅう」が選ばれ、「6きゅう みとりざん」のマスを押すと「はじめる！」が押せる
  - `{ "soroban-15": 2 }` を入れると、最初に選ばれているのが「6きゅう かけざん」。つづきから（`lastModeId: "soroban"`）が `/soroban/soroban-16` へ
  - ステージ選択・ホームで `document.documentElement.scrollWidth <= 390`（横にはみ出さない）
  - 図鑑に「そろばん」の段と「/ 80」
  - スクリーンショット `soroban-home.png`・`soroban-mode.png`
  続けて既存の確認スクリプト（`check-home`・`check-mode`・`check-play`・`check-speed`・`check-friends-book`・`check-new-friend`・`check-friends-settings`・`check-challenge`）を流す。図鑑の数を「/ 54」で見ているところは「/ 80」に直し、Ruling を残す
- [ ] **Step 4:** commit `feat: ホーム・ステージ選択・図鑑に、そろばんを組み込む`

---

### Task 6: 通しの確認・記録・プッシュ

- [ ] **Step 1:** `npm test && npm run typecheck && npm run lint && npm run build` → すべて PASS、ビルドの一覧に `/soroban/[stageId]`
- [ ] **Step 2:** `npx next start -p 3002`（PIDを控える）で、Task 4・5 のスクリプトと `check-old-record.mjs` を流して `OK`。終わったら控えたPIDだけを止める
- [ ] **Step 3:** `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` の末尾に「## 2026-10-20 そろばんの級（10級〜4級）」として、設計書・計画のパス、できたこと、決めたこと・つまずいたこと、次（3級より上・フラッシュの段位・素因数分解）を追記する
- [ ] **Step 4:** `git push -u origin feature/soroban-grades`（キーチェーンの応答待ちで止まったら、PIDを指定して止め、あとでやり直す）。master へのマージは最後のレビューのあと Owner に確認してから
