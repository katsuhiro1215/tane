# Tane 分割4 計画B：Tane 側（ログイン・プロフィール・同期・保護者の画面） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tane から Spra Go のアカウントでログイン・登録し、プロフィールを選んで遊ぶと記録がサーバーと合わさり、保護者が家族の記録を見られるようにする。ログインなしの遊びは今のまま。

**Architecture:** 端末が先・サーバーはあとから合わせる。合わせ方 `mergeProgress` は計画Aの `ProgressMerge` と同じ固定の例（`tane-merge-cases.json`）でテストする。進み具合の保存先は「ゲスト」か「プロフィールごと」の localStorage のキーで切り替える。同期は、記録が変わったら2秒待ってまるごと `PUT`、失敗したら印を残して送り直す。画面は `NEXT_PUBLIC_TANE_LOGIN=on` のときだけ出す。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Vitest（`projects/tane/frontend`）。

**Spec:** `company/spra/tane/docs/2026-10-21-account-sync-design.md`。**計画A（`2026-10-21-tane-account-sync-a-spra-go.md`）は実装済み**（Spra Go 側のチャットが `projects/Spra-go` の `main` に取り込み済み、1250件のテスト通過。引き継ぎ文書: `company/spra/tane/docs/2026-10-22-spra-go-side-done-handoff.md`。入口・エラーの形・合わせ方の固定例は、この文書が最終）。

## Global Constraints

- 環境変数：`NEXT_PUBLIC_SPRA_API_URL`（開発 `http://localhost`、本番 `https://api.go.spra.jp`）、`NEXT_PUBLIC_TANE_LOGIN`（`on` のときだけログインの入口を出す。既定は出さない）。開発は `next dev -p 3001`（Spra Go の画面が3000を使うため。Spra Go 側の `.env` に `TANE_LOGIN_ENABLED=true`・`TANE_URL=http://localhost:3001` が必要）。
- すべての API 呼び出しに `X-Spra-App: tane`、`Accept: application/json`。ログイン後は `Authorization: Bearer <token>`。クッキーは使わない（`credentials: "omit"`）。
- エラーの形は Laravel 標準：422 は `{ message, errors: { <field>: string[] } }`。429 はしばらく待つ合図（ログイン5回/分、保護者の確認6回/分、記録の書き込み60回/分）。`POST /api/auth/token`・`POST /api/auth/register-token` は、`TANE_LOGIN_ENABLED` が off の間ずっと 403（本番は規約の更新が済むまで off）。この 403 は、プロフィールが消えたときの 403（6-5章）とは別物として扱う。
- 保存のキー：トークン等 `tane:auth:v1`、ゲストの記録 `tane:progress:v1`（今のまま）、プロフィールごとの記録 `tane:progress:v1:p<profileId>`、送っていない印 `tane:sync:v1`。
- 外の台本（スクリプト）を新しく足さない（トークンを localStorage に置くため）。
- ★の最大を超える記録は、読むときに**最大まで下げる**（今は捨てている。設計書5-1）。
- 子ども向けの文はひらがな中心。保護者の画面は漢字まじりでよい。
- ログインしていないとき・`NEXT_PUBLIC_TANE_LOGIN` が無いとき、今の遊び・画面・テストは何も変わらない。

## Review Focus

- ゲストの記録が、選んだ1人にだけ入り、そのあと空になる（2人目のログインで、もう一度入らない）。
- 送っている途中で画面を閉じる・電波が切れても、記録が消えない・二重にならない（送り直しで同じ結果）。
- 401（トークン切れ）・403/404（プロフィールが消えた）のとき、ログイン／「だれがあそぶ？」に戻り、端末の記録は消さない（送っていない分は、次にログインしたとき合わせる）。
- プロフィールを切り替えた直後に、前の子の記録が一瞬でも混ざらない。
- 保護者の画面は、確認から15分を過ぎたら、もう一度パスワードを聞く。

---

### Task 1: 合わせ方・遊んだ日・★を最大まで下げる

**Files:**
- Create: `src/lib/sync/progress-merge.ts`、`src/lib/sync/progress-merge.test.ts`、`src/lib/sync/tane-merge-cases.json`（`projects/Spra-go/tests/Fixtures/tane-merge-cases.json` をそのままコピー。11例、`order_sensitive: true` の例が1つ）
- Modify: `src/lib/progress-store.ts`（`Progress` に `gardenChangedAt: string | null`・`lastModeAt: string | null`・`playDays: string[]` を足す。`parseProgress` は★を最大まで下げる。`withGardenToggle`・`rememberLastMode` が日時を入れる。ステージ・チャレンジ・エンドレスを終えたとき、日本時間の今日を `playDays` に足す（14日分まで））、`src/lib/progress-store.test.ts`

**Interfaces:**
- Produces:
  - `type SyncedProgress`（計画Aの約束の JSON と同じ形）
  - `toSynced(p: Progress): SyncedProgress`、`fromSynced(s: SyncedProgress, local: Progress): Progress`（`titleSeen` など同期しないものは `local` のまま。知らないステージは捨て、★は最大まで下げる。**`best` は、対応する `stars` が無いステージは除く**（サーバーが黙って捨てる規則に合わせる。Spra Go 引き継ぎ文書）
  - `mergeProgress(a: SyncedProgress, b: SyncedProgress): SyncedProgress`（計画Aの `ProgressMerge::merge` と同じ決まり。日時は `Date` として比べる（表記ちがいを吸収）、同じ日時なら `a` を残す）
  - `todayJst(now?: Date): string`（`YYYY-MM-DD`）

- [ ] **Step 1: 失敗するテスト**：`tane-merge-cases.json` の全件で `mergeProgress(a,b)` が `expected`。`order_sensitive` が無い例は `mergeProgress(b,a)` も `expected`、ある例は `mergeProgress(a,b)` だけ確かめる。どの例も `mergeProgress(expected,expected)` が `expected`／`parseProgress` が `{"stars":{"add-1":5}}` を `add-1: 3` にする（捨てない）／`toSynced` は、`stars` が無い `best` を含めない／`rememberLastMode`・にわの切り替えで日時が入る／`recordStageResult`・`recordChallengeResult`・`recordEndlessResult` のあと `playDays` に今日がある（同じ日は1つ、直近14日より前は落ちる）／古い保存データ（新しい欄が無い）も読める
- [ ] **Step 2: Run** `npx vitest run src/lib/sync src/lib/progress-store.test.ts` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** 同じ＋全体 `npx vitest run` — Expected: PASS
- [ ] **Step 5: Commit** `feat: 記録の合わせ方と遊んだ日（同期の土台）`

### Task 2: API の呼び出しとログインの状態

**Files:**
- Create: `src/lib/account/api.ts`、`src/lib/account/api.test.ts`、`src/lib/account/auth-store.ts`、`src/lib/account/auth-store.test.ts`、`src/lib/account/flags.ts`

**Interfaces:**
- Consumes: 計画Aの入口（`POST/DELETE /api/auth/token`、`POST /api/auth/register-token`、`GET /api/registration`、`GET/POST /api/profiles`、`GET/PUT /api/tane/profiles/{id}/progress`、`POST /api/auth/confirm-password`、`GET /api/tane/parent/records`）
- Produces:
  - `loginEnabled(): boolean`（`NEXT_PUBLIC_TANE_LOGIN === "on"`）
  - `class ApiError { status: number; message: string; errors?: Record<string, string[]> }`（422 の `errors` をそのまま持つ。`message` は 422 なら最初のフィールドの最初のメッセージ、それ以外はサーバーの `message`）
  - `api.login(email, password, deviceName)`・`api.register(form & { deviceName })`・`api.logout()`・`api.registration()`・`api.profiles()`・`api.createProfile(name)`・`api.getProgress(profileId): { progress, playDays }`・`api.putProgress(profileId, { progress, playDays })`・`api.confirmPassword(password)`・`api.parentRecords()`（`fetch` を差し替えられる作り。`device_name` は `navigator.userAgent` から短く作る。`register-token`・`token` の 403 は、ログインの入口がまだ使えない合図として `ApiError` をそのまま返す（Task4 で文言に変換）
  - `AuthState = { token: string; user: { id; name; email; emailVerified }; profileId: number | null } | null`、`readAuth()`・`useAuth()`・`saveAuth(state)`・`clearAuth()`（`tane:auth:v1`）

- [ ] **Step 1: 失敗するテスト**（偽の `fetch`）：ヘッダー（`X-Spra-App: tane`・Bearer・`credentials: "omit"`）／401・403・429 が `ApiError` になる／422（`{message:"招待コードが違います", errors:{invite_code:["招待コードが違います"]}}`）が `ApiError` の `message`・`errors` にそのまま入る／`auth-store` の保存と消去、壊れた保存データは null
- [ ] **Step 2: Run** `npx vitest run src/lib/account` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat: Spra Go のアカウントの API とログインの状態`

### Task 3: 記録の持ち主の切り替えと同期

**Files:**
- Create: `src/lib/sync/sync-engine.ts`、`src/lib/sync/sync-engine.test.ts`、`src/components/app/sync-provider.tsx`（`layout` で包む）
- Modify: `src/lib/progress-store.ts`（保存先のキーを `progressKeyFor(profileId)` で切り替えられるようにする。`useProgress` は切り替えに追従する）

**Interfaces:**
- Produces:
  - `progressKeyFor(profileId: number | null): string`、`setProgressOwner(profileId: number | null): void`、`readGuestProgress(): Progress`、`clearGuestProgress(): void`
  - `createSyncEngine(deps: { api; now; setTimeout; clearTimeout }): { start(profileId): Promise<void>; notifyChanged(): void; flush(): Promise<void>; stop(): void }`
    - `start`：サーバーの記録を読み、端末と `mergeProgress` して保存し、送っていない印があれば送る
    - `notifyChanged`：2000ms 待って `flush`（続けて呼ばれたら待ち直す）
    - `flush`：まるごと `PUT`。成功したら返ってきた記録で置き換え、印と送った `playDays` を消す。失敗したら印を残す（`tane:sync:v1` に profileId）
    - 401 → `clearAuth()` しない。状態を `"signed-out"` にしてログインへ案内（端末の記録は残す）。403/404 → `profileId` を外して「だれがあそぶ？」へ（この 403 は「そのプロフィールが自分の家族でない／消えた」の意味で、ログインの入口の 403 とは別）
    - 429 → 印は残したまま、印を消さずに `flush` を終える（次の `notifyChanged`／`visibilitychange`／`online` を待ってから送り直す。すぐに自分で再送しない）
  - `SyncProvider`：ログイン中なら `start`、`visibilitychange`（見えたとき）・`online` で `flush`、進み具合が変わったら `notifyChanged`

- [ ] **Step 1: 失敗するテスト**（偽の API・偽のタイマー）：記録が変わって2秒後に1回だけ送る／続けて3回変わっても1回／送るのに失敗すると印が残り、次の `flush` で同じ中身を送る／成功で印が消える／`start` でサーバーの★が多い記録が端末に入る／401 で端末の記録が残る／403 で profileId が外れる／429 では印が残り、`flush` をもう一度呼ぶまで自動では送り直さない／`setProgressOwner` を切り替えると、読む記録が切り替わり、前の子の記録が残らない
- [ ] **Step 2: Run** `npx vitest run src/lib/sync` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** 同じ＋全体 — Expected: PASS
- [ ] **Step 5: Commit** `feat: 記録の同期（端末が先・あとから合わせる）`

### Task 4: ログイン・登録・「だれがあそぶ？」・ゲストの記録の引き継ぎ

**Files:**
- Create: `src/app/account/login/page.tsx`、`src/app/account/register/page.tsx`、`src/app/account/profiles/page.tsx`、`src/components/account/*`（フォーム・プロフィールの一覧・引き継ぎ）、`src/lib/account/claim.ts`・`claim.test.ts`
- Modify: ホームの上（ログイン／プロフィール名のチップ）、`settings-screen.tsx`（ログイン・ログアウト・保護者のかたへ）。どちらも `loginEnabled()` のときだけ出す

**Interfaces:**
- Produces:
  - `needsClaim(guest: Progress): boolean`（★・最高点・チャレンジ・エンドレス・遊んだ日のどれかがあれば true）
  - `claimGuestProgress(profileId, deps): Promise<void>`（ゲストの記録を、その子の記録と `mergeProgress` → `PUT` → 成功したら `clearGuestProgress()`）
  - 流れ：ログイン／登録 → 「だれがあそぶ？」（家族の一覧・新しく作る）→ 子を選ぶ → `needsClaim` なら「この たんまつの きろくを だれの ものに する？」（子の一覧＋「つかわない」）→ ホーム
  - 登録画面：`api.registration()` で、おやすみ中ならお知らせだけ、招待コードが要るなら欄を出す。同意のチェックと、Spra Go の規約・プライバシーへのリンク
  - Google だけの人（ログインで「パスワードを きめてね」の 422）には、Spra Go の再設定の画面（`https://go.spra.jp/forgot-password`）への案内
  - ログイン・登録が 403 のとき（`TANE_LOGIN_ENABLED` が off）は、「ログインは まだ つかえないよ」と出し、フォームは出さない
  - ログアウト：`api.logout()`（失敗しても）→ `clearAuth()`・プロフィールごとの記録と印を消す → `setProgressOwner(null)`

- [ ] **Step 1: 失敗するテスト**（`claim.test.ts`）：ゲストが空なら聞かない／引き継ぐと、その子に合わさり、ゲストが空になる／`PUT` に失敗したらゲストを消さない／「つかわない」を選ぶとゲストはそのまま残る
- [ ] **Step 2: Run** `npx vitest run src/lib/account` — Expected: FAIL
- [ ] **Step 3: 実装**（画面）
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS
- [ ] **Step 5: Commit** `feat: ログイン・登録・だれがあそぶ？・端末の記録の引き継ぎ`

### Task 5: 保護者のかたへ

**Files:**
- Create: `src/lib/account/parent-summary.ts`・`parent-summary.test.ts`、`src/app/account/parent/page.tsx`、`src/components/account/parent-*.tsx`

**Interfaces:**
- Produces:
  - `parentSummary(progress: Progress, playDays: string[], today: string): { modes: { modeId; label; earned; max; reached: string | null }[]; lastPlayed: string | null; daysThisWeek: number; stuck: string[] }`
    - `reached`：そのあそびで開いている一番後ろのステージの呼び方（たねまきは「3-2」、そろばんは「6きゅう」、ほかは「ステージ 5」）。1つも遊んでいなければ null
    - `daysThisWeek`：`today` を含む直近7日の遊んだ日の数
    - `stuck`：★1以上で、★の最大の半分未満（3なら1、5なら1〜2）のステージを、新しい順に3つまで `stageLabel` と名前で（例「たしざん 3 くりあがり」）
  - 画面：パスワードの入力 → `api.confirmPassword` → `api.parentRecords` → 子どもごとのカード。15分を過ぎて 403 が返ったら、パスワードの入力に戻る

- [ ] **Step 1: 失敗するテスト**：例の記録で `modes` の★の合計と最大、`reached` の3つの形、`daysThisWeek`（8日前は数えない）、`stuck` の選び方と3つまで
- [ ] **Step 2: Run** `npx vitest run src/lib/account/parent-summary.test.ts` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS
- [ ] **Step 5: Commit** `feat: 保護者のかたへ（子どもごとの進み具合）`

### Task 6: つないで確かめる・記録

- [ ] **Step 1:** 手元で Spra Go（Sail、`TANE_LOGIN_ENABLED=true`、`TANE_URL=http://localhost:3001`）と Tane（`NEXT_PUBLIC_TANE_LOGIN=on`、`-p 3001`）を起動し、Playwright（作業用フォルダ、スマホ幅）で：(a) ゲストで遊ぶ → 登録（招待コード）→ 最初の子を作る → 引き継ぐ → ★がサーバーに入る（`GET` で確認）、(b) 別のブラウザの文脈でログイン → 同じ子を選ぶ → ★が出る、(c) Spra Go を止めて遊ぶ → 起動し直して画面に戻る → 送られる、(d) 保護者のかたへ（まちがったパスワード→正しい→カード）、(e) `NEXT_PUBLIC_TANE_LOGIN` なしで、ログインの入口が無く、今までの確認スクリプトが通る
- [ ] **Step 2:** `npx vitest run && npx tsc --noEmit && npm run lint && npm run build` — Expected: PASS
- [ ] **Step 3:** `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` と `company/spra/CLAUDE.md` に追記
- [ ] **Step 4: Commit** `feat: Spra Go のアカウント連携をつなぐ`
