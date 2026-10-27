# Tane 分割4 計画A：Spra Go 側（トークンのログイン・Tane の記録の入口） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tane が Spra Go のアカウントでログイン・登録し、プロフィールごとの Tane の記録をサーバーに読み書きでき、保護者が家族全員の Tane の記録を読めるようにする。

**Architecture:** Sanctum のパーソナルアクセストークン（Bearer）。Tane の記録は同じDBの `tane_` の3表。合わせ方は純粋な PHP クラス `App\Support\Tane\ProgressMerge` に閉じ込め、Tane（計画B）の TypeScript と同じ固定の例でテストする。入口は `routes/api.php` の既存の書き方（クロージャ）に合わせ、`/api/auth/token…` と `/api/tane/…` に置く。`TANE_LOGIN_ENABLED` が off の間は、トークンの発行と Tane からの登録が 403。

**Tech Stack:** Laravel 12 / PHP 8.4 / Sanctum / Pest / MySQL（テストは Sail の `testing` DB）。

**Spec:** `company/spra/tane/docs/2026-10-21-account-sync-design.md`（前提: `projects/Spra-go/docs/design/2026-10-14-multi-app-accounts-design.md`）

## Global Constraints

- 作業場所 `projects/Spra-go`。ブランチ `feature/tane-account-sync`。コミットは `.gitmessage` の形（`feat(tane): …`）。テスト: `./vendor/bin/sail test --filter=<名前>`、全体は `./vendor/bin/sail test`。
- Spra Go のクッキーのログイン・登録（`/login`・`/register`）の動きは変えない。既存のテストが全部通ること。
- 新しい入口は、すべて `auth:sanctum` ＋ プロフィールが**ログインした人の家族のもの**か確かめる（違えば 403）。セッションの `active_profile_id` は使わない。
- `config/tane.php`：`'login_enabled' => env('TANE_LOGIN_ENABLED', false)`、`'token_days' => 90`、`'parent_confirm_minutes' => 15`、`'max_stage_records' => 200`、`'play_days_window' => 14`。
- `.env.example` に `TANE_URL=http://localhost:3001`、`TANE_LOGIN_ENABLED=false`。CORS の `allowed_origins` に `env('TANE_URL')` を足す（空なら足さない）。
- ステージID の形 `^[a-z]+-[0-9]{1,3}$`、★1〜5、最高点 0〜10,000,000 の整数。
- エラーの文は日本語（既存と同じ調子）。
- 登録は、Spra Go と同じ招待制に従う（`AppSettings::registrationOpen()`・`inviteCode()`・`inviteCodeMatches()`）。

## Review Focus

- ほかの家族のプロフィールID を URL に入れても、読めない・書けない（403）。
- `TANE_LOGIN_ENABLED=false` のとき、トークンの発行と Tane の登録は 403。既存のトークンで呼ぶ記録の入口は動く（ログイン済みの人を締め出さない）。
- 合わせ方：同じものを2回送っても変わらない／古い記録を送っても★・最高点が下がらない／にわは `garden_changed_at` が新しいほう。
- パスワードの再設定で、その人のトークンが全部失効する。
- 保護者の確認は、パスワードが無い（Google だけ）人は 422、6回まちがえると 429、15分過ぎると保護者の入口が 403。

---

### Task 1: 設定・トークンの土台・ログインとログアウト

**Files:**
- Create: `config/tane.php`、`tests/Feature/Tane/TokenAuthTest.php`
- Modify: `app/Models/User.php`（`HasApiTokens`）、`config/cors.php`、`.env.example`、`routes/api.php`、パスワード再設定の後でトークンを消す処理（`PasswordReset` のイベントのリスナー。`AppServiceProvider` で `Event::listen`）

**Interfaces:**
- Produces:
  - `POST /api/auth/token` 入力 `{ email, password, device_name }` → 201 `{ token: string, user: { id, name, email, email_verified: bool } }`。`login_enabled` が false なら 403。まちがいは既存の `LoginRequest` と同じ制限（5回）。パスワードが無い（Google だけ）人は 422 `{ message: "Spra Go の せっていで パスワードを きめてね" }`
  - トークンの名前 `tane:{device_name}`、期限 `now()->addDays(config('tane.token_days'))`
  - `DELETE /api/auth/token`（Bearer）→ 204。今のトークンだけ消す
  - `App\Support\Tane\TaneProfiles::authorize(Request $request, UserProfile $profile): void`（家族でなければ 403）

- [ ] **Step 1: 失敗するテストを書く**（`TokenAuthTest`）
  - `login_enabled=true` で正しいメール・パスワード → 201、`token` があり、そのトークンで `GET /api/user` が 200
  - まちがったパスワード → 422、6回目は 429
  - `login_enabled=false` → 403
  - パスワードが null のユーザー → 422
  - `DELETE /api/auth/token` のあと、同じトークンで `GET /api/user` が 401
  - 91日後（`travel(91)->days()`）は 401
  - `PasswordReset` イベントのあと、その人のトークンが全部消える
  - CORS：`Origin: http://localhost:3001`（`TANE_URL`）の preflight に `Access-Control-Allow-Origin` が返る
- [ ] **Step 2: Run** `./vendor/bin/sail test --filter=TokenAuthTest` — Expected: FAIL
- [ ] **Step 3: 実装**（上の Interfaces）。`X-Spra-App: tane` は既存の `RecordAppUsage` がそのまま拾う（Tane が付けてくる）
- [ ] **Step 4: Run** 同じ — Expected: PASS。続けて `./vendor/bin/sail test --filter=Auth` — Expected: 既存の認証テストが全部 PASS
- [ ] **Step 5: Commit** `feat(tane): トークンのログイン・ログアウト`

### Task 2: Tane からの登録（招待制に従う）

**Files:**
- Create: `app/Actions/RegisterUser.php`、`tests/Feature/Tane/TaneRegisterTest.php`
- Modify: `app/Http/Controllers/Auth/RegisteredUserController.php`（中身を `RegisterUser` に移し、自分は呼ぶだけ）、`routes/api.php`

**Interfaces:**
- Produces:
  - `RegisterUser::handle(Request $request): User`（今の `store` の、おやすみの確認〜検証〜作成〜家族アカウント〜確認メールまで。`Auth::login` はしない）
  - `POST /api/auth/register-token` 入力は既存の登録と同じ（`name, email, password, password_confirmation, invite_code?, terms`）＋`device_name` → 201 `{ token, user }`（Task 1 と同じ形）。`login_enabled` が false なら 403。`throttle:10,1`

- [ ] **Step 1: 失敗するテスト**：登録できて `token` が返る／`terms_accepted_at` と `terms_version` が残る／`user_schemas` が1つできる／おやすみ中は 403／招待コードが要るときに無い・違うと 422／`login_enabled=false` は 403／確認メールが送られる（`Notification::fake`）
- [ ] **Step 2: Run** `--filter=TaneRegisterTest` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** `--filter="TaneRegisterTest|RegistrationTest"` — Expected: PASS（既存の登録テストも通る）
- [ ] **Step 5: Commit** `feat(tane): Tane からの登録（招待制に従う）`

### Task 3: Tane の表と、合わせ方（ProgressMerge）

**Files:**
- Create: マイグレーション `create_tane_tables`（`tane_stage_records`・`tane_profile_states`・`tane_play_days`。設計書5章の列。`user_profile_id` は `cascadeOnDelete`）、モデル `TaneStageRecord`・`TaneProfileState`・`TanePlayDay`、`app/Support/Tane/ProgressMerge.php`、`tests/Unit/Tane/ProgressMergeTest.php`、`tests/Fixtures/tane-merge-cases.json`

**Interfaces:**
- Produces:
  - 記録の JSON（計画Bと共通。**これが A と B の約束**）
    ```json
    {
      "stars": { "add-1": 3, "shisoku-5": 5 },
      "best": { "add-1": 2400 },
      "challengeBest": { "add": 3200 },
      "endless": { "shisoku-1": { "correct": 12, "combo": 7 } },
      "garden": ["add-1", "sub-2"],
      "gardenChangedAt": "2026-10-21T10:00:00+09:00",
      "lastModeId": "shisoku",
      "lastModeAt": "2026-10-21T10:00:00+09:00"
    }
    ```
    `gardenChangedAt`・`lastModeAt` は null 可。
  - `ProgressMerge::merge(array $a, array $b): array` — 設計書6-1の表どおり（★・最高点・チャレンジ・エンドレスは各大きいほう、にわ・最後のあそびは日時が新しいほう、同じ日時なら `$a` を残す）。結果のキーは並べ替えて返す（比較しやすく）
  - `ProgressMerge::validate(array $payload): array` — 形の確かめ（ステージIDの形・★1〜5・件数上限・にわ8つまで）。合わないものは**捨てる**（全部を断らない）
  - `tests/Fixtures/tane-merge-cases.json`：`[{ "name", "a", "b", "expected" }]` を最低8件（★の大小、最高点の片方だけ、エンドレスの片方ずつ大きい、にわの新旧、同じ日時、空と空、空と全部、同じもの同士）。計画B でも同じファイルをコピーして使う

- [ ] **Step 1: 失敗するテスト**：固定の例の全部で `merge(a,b) === expected` かつ `merge(b,a)` も `expected`（にわ・最後のあそびが同じ日時の例だけは除く）、`merge(x,x) === x`。`validate` が形の違うIDと★6を捨てる
- [ ] **Step 2: Run** `--filter=ProgressMergeTest` — Expected: FAIL
- [ ] **Step 3: 実装**（マイグレーション・モデル・クラス）
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(tane): Tane の記録の表と合わせ方`

### Task 4: 記録の入口（読む・合わせて保存）

**Files:**
- Create: `app/Support/Tane/ProgressStore.php`、`tests/Feature/Tane/TaneProgressTest.php`
- Modify: `routes/api.php`

**Interfaces:**
- Consumes: `ProgressMerge`（Task 3）、`TaneProfiles::authorize`（Task 1）
- Produces:
  - `ProgressStore::load(UserProfile $p): array`（表 → 約束の JSON）、`ProgressStore::save(UserProfile $p, array $merged): void`（JSON → 表。1つのトランザクション）
  - `GET /api/tane/profiles/{profile}/progress` → 200 `{ progress: <約束の JSON>, playDays: ["2026-10-21", …] }`（直近8日）
  - `PUT /api/tane/profiles/{profile}/progress` 入力 `{ progress: <約束の JSON>, playDays: ["YYYY-MM-DD", …] }` → `validate` → `merge(サーバーの記録, 受け取った記録)` → 保存 → 200（GET と同じ形）。`playDays` は日本時間の今日より未来・`play_days_window` 日より前を捨てて `insertOrIgnore`
  - 書き込みの制限 `throttle:60,1`

- [ ] **Step 1: 失敗するテスト**：空のプロフィールの GET は空の形／PUT のあと GET で同じ記録／古い★を送っても下がらない／同じものを2回 PUT しても同じ／ほかの家族のプロフィールは GET・PUT とも 403／トークン無しは 401／`playDays` の未来・古い日付は残らず、重ねて送っても1日1行／ステージ201件は 200 件まで（`validate` で切る）
- [ ] **Step 2: Run** `--filter=TaneProgressTest` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(tane): Tane の記録を読む・合わせて保存する入口`

### Task 5: 保護者の確認と、家族の記録の入口

**Files:**
- Create: `tests/Feature/Tane/TaneParentTest.php`
- Modify: `routes/api.php`（ランキングの `$confirm` と同じ確かめ方を、関数として共通にしてよい）

**Interfaces:**
- Produces:
  - `POST /api/auth/confirm-password` 入力 `{ password }` → 204。合えば `Cache::put("tane-parent:{tokenId}", true, minutes(15))`。パスワードが無い → 422、まちがい6回/分 → 429
  - `GET /api/tane/parent/records` → 確認済みでなければ 403。200 `{ profiles: [{ id, name, avatar, progress: <約束の JSON>, playDays: [...] }] }`（家族の全プロフィール）

- [ ] **Step 1: 失敗するテスト**：確認前は 403／確認後は家族の全員が返る（ほかの家族は含まない）／16分後は 403／別のトークン（同じ人の別の端末）では確認済みにならない／パスワード無しは 422／まちがい7回目は 429
- [ ] **Step 2: Run** `--filter=TaneParentTest` — Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `feat(tane): 保護者の確認と家族の Tane の記録`

### Task 6: 全体の確認と記録

- [ ] **Step 1:** `./vendor/bin/sail test` — Expected: 全部 PASS（既存を含む）
- [ ] **Step 2:** `SPEC.md` の 4-1 に「Tane のトークンのログイン・登録（`TANE_LOGIN_ENABLED`、既定 off）・Tane の記録の入口」を追記。共通アカウント設計の10章の段階2に「Spra Go 側は実装済み（日付）」を追記。`docs/ops/production-runbook.md` に `TANE_URL`・`TANE_LOGIN_ENABLED` を追記
- [ ] **Step 3:** アカウント削除の確認の文に「Tane の記録も消えます」を足す（共通アカウント設計12章。削除で `tane_` の表が消えることは、Task 3 の外部キーで済んでいる。消えることを確かめるテストを `TaneProgressTest` に1つ足す）
- [ ] **Step 4: Commit** `docs(tane): 仕様と運用手順に Tane の連携を追記`
