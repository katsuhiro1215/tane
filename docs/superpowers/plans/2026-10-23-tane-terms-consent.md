# Tane の同意のしなおし対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spra Go 側が実装した「同意が古い」判定・`POST /api/terms/accept`・Tane入口での403 `code: "terms_outdated"` に対応し、Tane側で同意しなおしの画面を作る。あわせて、Tane専用の規約・プライバシーのリンクを Spra Go の共通版へ置き換える。

**Architecture:** ログイン・登録のレスポンス（`user.terms_outdated`）でまず判定し、同意が古ければ `/account/terms-consent` へ送る。ログイン済みのまま使っていて版が変わった場合は、Tane の入口（`getProgress`・`putProgress`・`parentRecords`）が返す 403 `{code: "terms_outdated"}` を `sync-engine`／`parent-screen` で検知して同じ画面へ送る（既存の「プロフィールが消えた」403とは `code` で区別し、プロフィール・未送信の記録は消さない）。同意画面は `GET /api/user` で現在の版（`terms_version_current`）を取り、`POST /api/terms/accept` で同意する。同意後は、カスタムイベントで同期エンジンに再開を知らせる。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Vitest（`projects/tane/frontend`）。

**Spec:** `projects/Spra-go/docs/design/2026-10-23-tane-terms-consent-request.md`（Spra Go 側からの依頼文）。背景: `projects/Spra-go/docs/design/2026-10-23-shared-account-legal-design.md`（5章）、`company/spra/tane/docs/2026-10-22-spra-go-side-done-handoff.md`。

## Global Constraints

- 「同意が古い」の2つの検知経路: (1) ログイン・登録のレスポンス `user.terms_outdated: bool`、(2) Tane入口（`/api/tane/profiles/*/progress`・`/api/tane/parent/records`）の403レスポンス `{ message, code: "terms_outdated" }`。`terms_outdated` が無い（古いSpra Goの返事）ときは、何も出さない（既定 false）。
- 403の `code` で、既存の「プロフィールが消えた/家族でない」(`onProfileGone`) と「同意が古い」を区別する。同意が古いときは、プロフィールを外さない・未送信の印（`tane:sync:v1`）を消さない（同意後にそのまま送り直す）。
- 同意する版の値（`version`）は `GET /api/user` の `terms_version_current` から取る（ログイン・登録のレスポンスには無い）。同意画面の表示時に `GET /api/user` を呼ぶ。
- `POST /api/terms/accept` は `{ version }` を送って204。版が一致しないと422（ページを開いている間に版が変わったとき→読み込み直す案内）。
- 同意画面の文面（要約4行・見出し・ボタン）は依頼文2章の文言をそのまま使う。全文リンクは `https://go.spra.jp/terms`・`https://go.spra.jp/privacy`（新しいタブ）。
- 「同意しない」はログアウト（既存の `logoutTane` を再利用）＋「アカウントの削除は info@spra.jp へ」の案内。アカウント削除の画面は作らない。
- 登録画面の同意チェック文は Spra Go と同じ「利用規約とプライバシーポリシーに同意します」に変える（今のひらがな文言から変更）。チェック文のリンク先も `https://go.spra.jp/terms`・`/privacy` に変える（今は `https://spra.jp/terms` を指している）。
- `company/spra/tane/docs/legal/` の下書きは、共通版へのリンクに置き換える旨を追記する（コードではないので commit 対象外）。
- 既存の vitest・tsc・eslint は、1つも壊さない。
- この変更は `NEXT_PUBLIC_TANE_LOGIN` が off の間は誰にも見えない（ログイン機能自体がoffのため）。本番で on にするのは、Spra Go 側が規約本文を確定して版を上げたあと（別タスク）。

## Review Focus

- ログイン・登録に成功したが `terms_outdated: true` のとき、プロフィール選択画面へ進ませず、必ず同意画面を経由する（素通りすると、未同意のままサーバーに記録が預けられてしまう）。
- 版が一致しない422（同意画面を開いている間に版がさらに変わった）のとき、エラーで固まらず、読み込み直す案内が出る。
- 既存の「プロフィールが消えた」403（`onProfileGone`）と「同意が古い」403（`onTermsOutdated`）が、`code` の有無で正しく分岐する（取り違えるとプロフィールが不要に外れる、または同意画面に送られない）。
- 同意する前に溜まっていた未送信の記録（`tane:sync:v1`）が、同意のやりとりの間に消えず、同意後に送り直される。
- 古い Spra Go（`terms_outdated` を返さない）と通信したとき、同意画面が出ない（未定義を true と誤判定しない）。

---

### Task 1: 型とAPIクライアント（`terms_outdated`・`GET /api/user`・`POST /api/terms/accept`）

**Files:**
- Modify: `src/lib/account/api.ts`
- Modify: `src/lib/account/auth-store.ts`
- Test: `src/lib/account/api.test.ts`・`src/lib/account/auth-store.test.ts`

**Interfaces:**
- Produces: `ApiError.code?: string`、`AuthUserPayload.termsOutdated: boolean`、`Api.getUser(): Promise<CurrentUser>`（`CurrentUser = AuthUserPayload & { termsVersionCurrent: string }`）、`Api.acceptTerms(version: string): Promise<null>`、`AuthUser.termsOutdated: boolean`

- [ ] **Step 1: 失敗するテストを書く（`ApiError.code`）**

```ts
it("403 で code があれば ApiError.code に入る", async () => {
  const fetchMock = fakeFetch(403, { message: "だめだよ", code: "terms_outdated" });
  const api = makeApi(fetchMock);
  await expect(api.registration()).rejects.toMatchObject({ status: 403, code: "terms_outdated" });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/account/api.test.ts` — Expected: FAIL（`code` が undefined）

- [ ] **Step 3: `ApiError` に `code?: string` を足し、`request()` が `data.code`（文字列のときだけ）を渡す**

- [ ] **Step 4: Run** 同コマンド — Expected: PASS

- [ ] **Step 5: 失敗するテストを書く（`login`/`register` が `terms_outdated` を変換する）**

```ts
it("login は terms_outdated を termsOutdated に変換する（既定 false）", async () => {
  const withFlag = fakeFetch(201, { token: "a", user: { id: 1, name: "a", email: "a@b.c", email_verified: true, terms_outdated: true } });
  const api1 = makeApi(withFlag);
  expect((await api1.login("a@b.c", "pw", "d")).user.termsOutdated).toBe(true);

  const without = fakeFetch(201, { token: "a", user: { id: 1, name: "a", email: "a@b.c", email_verified: true } });
  const api2 = makeApi(without);
  expect((await api2.login("a@b.c", "pw", "d")).user.termsOutdated).toBe(false);
});
```

- [ ] **Step 6: Run** — Expected: FAIL（`termsOutdated` が無い）

- [ ] **Step 7: `AuthUserPayload` に `termsOutdated: boolean` を足し、`mapUser()` で `data.terms_outdated === true` を入れる**

- [ ] **Step 8: Run** — Expected: PASS

- [ ] **Step 9: 失敗するテストを書く（`getUser`）**

```ts
it("getUser は /api/user を GET し、termsVersionCurrent を含む", async () => {
  const fetchMock = fakeFetch(200, { id: 1, name: "a", email: "a@b.c", email_verified: true, terms_outdated: true, terms_version_current: "2026-11-01" });
  const api = makeApi(fetchMock, "tok");
  const user = await api.getUser();
  const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(url).toBe("http://localhost/api/user");
  expect(init.method ?? "GET").toBe("GET");
  expect(user).toMatchObject({ id: 1, termsOutdated: true, termsVersionCurrent: "2026-11-01" });
});
```

- [ ] **Step 10: Run** — Expected: FAIL（`getUser` が存在しない）

- [ ] **Step 11: `CurrentUser` 型と `getUser()` を実装する**（`mapUser(data)` を流用し、`terms_version_current` を文字列のときだけ足す。無ければ空文字）

- [ ] **Step 12: Run** — Expected: PASS

- [ ] **Step 13: 失敗するテストを書く（`acceptTerms`）**

```ts
it("acceptTerms は version を送り、204 で null を返す", async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 204, json: async () => { throw new Error("no body"); }, headers: new Headers() })) as unknown as typeof fetch;
  const api = makeApi(fetchMock, "tok");
  await expect(api.acceptTerms("2026-11-01")).resolves.toBeNull();
  const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(url).toBe("http://localhost/api/terms/accept");
  expect(JSON.parse(init.body as string)).toEqual({ version: "2026-11-01" });
});
```

- [ ] **Step 14: Run** — Expected: FAIL

- [ ] **Step 15: `acceptTerms(version)` を実装する**（`POST /api/terms/accept`、body `{ version }`）

- [ ] **Step 16: Run** — Expected: PASS

- [ ] **Step 17: 失敗するテストを書く（`auth-store` の `termsOutdated` 往復）**

```ts
it("termsOutdated を保存・復元できる（無ければ既定 false）", () => {
  const user = { id: 1, name: "a", email: "a@b.c", emailVerified: true, termsOutdated: true };
  saveAuth({ token: "t", user, profileId: null, profileName: null });
  expect(readAuth()?.user.termsOutdated).toBe(true);

  localStorage.setItem(AUTH_KEY, JSON.stringify({ token: "t", user: { id: 1, name: "a", email: "a@b.c", emailVerified: true }, profileId: null, profileName: null }));
  expect(readAuth()?.user.termsOutdated).toBe(false);
});
```

- [ ] **Step 18: Run** `npx vitest run src/lib/account/auth-store.test.ts` — Expected: FAIL

- [ ] **Step 19: `AuthUser` に `termsOutdated: boolean` を足し、`parseUser()` で `value.termsOutdated === true` として読む（型がstringでも落とさず false にする）**

- [ ] **Step 20: Run** — Expected: PASS

- [ ] **Step 21: Run** `npx vitest run src/lib/account && npx tsc --noEmit` — Expected: PASS（既存テストも壊れていない）

- [ ] **Step 22: Commit**

```bash
git add src/lib/account/api.ts src/lib/account/auth-store.ts src/lib/account/api.test.ts src/lib/account/auth-store.test.ts
git commit -m "feat: 同意が古い判定とterms/accept・GET /api/userに対応"
```

### Task 2: sync-engine・parent-screen の `terms_outdated`（403）対応

**Files:**
- Modify: `src/lib/sync/sync-engine.ts`
- Modify: `src/components/account/parent-screen.tsx`
- Test: `src/lib/sync/sync-engine.test.ts`

**Interfaces:**
- Consumes: `ApiError.code`（Task 1）
- Produces: `SyncEngineDeps.onTermsOutdated?: () => void`（他タスクが `sync-provider.tsx` で使う）

- [ ] **Step 1: 失敗するテストを書く（`sync-engine`）**

```ts
it("403 + code=terms_outdated では onTermsOutdated が呼ばれ、保留の印は残る（onProfileGoneは呼ばれない）", async () => {
  setProgressOwner(5);
  writeProgress({ ...EMPTY_PROGRESS, stars: { "add-1": 1 } });
  const onProfileGone = vi.fn();
  const onTermsOutdated = vi.fn();
  const putProgress = vi.fn(async () => {
    throw new ApiError(403, "だめだよ", undefined, "terms_outdated");
  });
  const api = { putProgress, getProgress: vi.fn(async () => ({ progress: fromProgress(EMPTY_PROGRESS), playDays: [] })) } as never;
  const engine = createSyncEngine({ api, now: () => new Date(), setTimeout, clearTimeout, onProfileGone, onTermsOutdated });

  await engine.start(5);
  await engine.flush();

  expect(onTermsOutdated).toHaveBeenCalledTimes(1);
  expect(onProfileGone).not.toHaveBeenCalled();
  expect(readPendingForTest()).toContain(5); // 未送信のまま残る
});
```

  （`readPendingForTest` は `PENDING_KEY` を直接 `window.localStorage` から読むテスト内のローカル関数でよい。既存テストの `fakeTimers`／`vi.stubGlobal("window", …)` のパターンに合わせる）

- [ ] **Step 2: Run** `npx vitest run src/lib/sync/sync-engine.test.ts` — Expected: FAIL（`onTermsOutdated` が未定義で、403は`onProfileGone`に流れる）

- [ ] **Step 3: `SyncEngineDeps` に `onTermsOutdated?: () => void` を足し、`flush()`・`start()` の403分岐で `e.code === "terms_outdated"` のときだけ `onTermsOutdated?.()` を呼んで `return`（`markPending`は呼ぶ。`e.code` 以外の403/404は今まで通り `onProfileGone`）**

- [ ] **Step 4: Run** — Expected: PASS。既存の401/403/404のテストも通ることを確認

- [ ] **Step 5: `parent-screen.tsx` の `loadRecords()` を直す。** `e instanceof ApiError && e.code === "terms_outdated"` のときは `router.push("/account/terms-consent")`（`useRouter` を import して使う）。それ以外の403は今まで通り何も表示しない（パスワード再入力に戻る）

- [ ] **Step 6: Run** `npx vitest run src/lib/sync && npx tsc --noEmit && npm run lint` — Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/sync/sync-engine.ts src/lib/sync/sync-engine.test.ts src/components/account/parent-screen.tsx
git commit -m "feat: 403 terms_outdatedをonProfileGoneと区別して検知する"
```

### Task 3: 同意画面と、同意後の同期の再開

**Files:**
- Create: `src/components/account/terms-consent-screen.tsx`
- Create: `src/app/account/terms-consent/page.tsx`
- Modify: `src/components/app/sync-provider.tsx`

**Interfaces:**
- Consumes: `Api.getUser`・`Api.acceptTerms`（Task 1）、`SyncEngineDeps.onTermsOutdated`（Task 2）、`logoutTane`（既存 `src/lib/account/logout.ts`）
- Produces: `window` のカスタムイベント `"tane:terms-accepted"`（`sync-provider.tsx` がリッスンし、他タスクからは参照されない）

- [ ] **Step 1: `sync-provider.tsx` の `onTermsOutdated` を実装する。** `engineRef.current?.stop()` のあと（`dropProfile()` は呼ばない＝プロフィールは外さない）、`router.push("/account/terms-consent")`。同じファイルのトップレベルの `useEffect`（マウント時にリスナー登録）で `window.addEventListener("tane:terms-accepted", …)` を足し、受け取ったら `auth?.profileId` が非null なら `engineRef.current?.start(auth.profileId)` を呼ぶ（既存の `auth` state をクロージャで参照）

- [ ] **Step 2: `terms-consent-screen.tsx` を作る。** `"use client"`。マウント時に `api().getUser()` を呼び、`termsVersionCurrent` を保持（401なら `router.push("/account/login")`）。文面は依頼文2章のとおり:
  - 見出し「きまりが かわります」
  - 要約4行（そのまま）: 「Spra Go と Tane（べつのアプリ）で、おなじアカウントを つかえるようになります」／「どのアプリを つかっているか、いつ つかいはじめたかを きろくします」／「あそんだ きろくは、アプリごとに べつべつに ほぞんします」／「アカウントを けすと、すべてのアプリの きろくが きえます」
  - 全文へのリンク2つ（`https://go.spra.jp/terms`・`https://go.spra.jp/privacy`、`target="_blank" rel="noreferrer"`）
  - 「同意する」ボタン → `api().acceptTerms(version)`。成功したら `window.dispatchEvent(new Event("tane:terms-accepted"))` → `router.push("/account/profiles")`。422（版がずれた）は「もう一度、画面を開き直してください」のメッセージを出す
  - 「同意しない」ボタン → 確認後、`logoutTane(api())` → ログアウト完了のメッセージ＋「アカウントの削除は info@spra.jp へ」を表示（遷移しない。読んでから自分で `/account/login` などへ戻れる）

- [ ] **Step 3: `src/app/account/terms-consent/page.tsx` を作る。** `TermsConsentScreen` を返すだけ（既存の `src/app/account/login/page.tsx` などのパターンに合わせる）

- [ ] **Step 4: Run** `npx tsc --noEmit && npm run lint` — Expected: PASS（この画面はDOM・ルーターに依存するため、ユニットテストは持たない。既存の `sync-provider.tsx` も同じ理由でテストが無い）

- [ ] **Step 5: Commit**

```bash
git add src/components/account/terms-consent-screen.tsx src/app/account/terms-consent/page.tsx src/components/app/sync-provider.tsx
git commit -m "feat: 同意しなおし画面と、同意後の同期再開を追加"
```

### Task 4: ログイン・登録フォームからの分岐、規約リンクの統一

**Files:**
- Modify: `src/components/account/login-form.tsx`
- Modify: `src/components/account/register-form.tsx`

**Interfaces:**
- Consumes: `LoginResult.user.termsOutdated`（Task 1）

- [ ] **Step 1: `login-form.tsx` の `onSubmit` で、`saveAuth()` のあと `result.user.termsOutdated` を見て、true なら `router.push("/account/terms-consent")`、false なら今まで通り `/account/profiles`**

- [ ] **Step 2: `register-form.tsx` の `onSubmit` も同様に分岐する**

- [ ] **Step 3: `register-form.tsx` の同意チェックのラベル文言を Spra Go と同じ「利用規約とプライバシーポリシーに同意します」に変え、リンク先を `https://go.spra.jp/terms`・`https://go.spra.jp/privacy` に変える**

- [ ] **Step 4: Run** `npx tsc --noEmit && npm run lint` — Expected: PASS（このフォームもDOM操作のみでユニットテストが元から無い。Task 5のPlaywright確認でカバーする）

- [ ] **Step 5: Commit**

```bash
git add src/components/account/login-form.tsx src/components/account/register-form.tsx
git commit -m "feat: ログイン・登録を同意しなおし画面に分岐させ、規約リンクをgo.spra.jpに統一"
```

### Task 5: 動作確認、規約下書きの注記、Spra Go への回答

**Files:**
- Modify: `company/spra/tane/docs/legal/terms.md`・`privacy.md`（リポジトリ外。commit対象外）
- Modify: `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（同上）
- Create: `projects/Spra-go/docs/design/2026-10-23-tane-terms-consent-reply.md`

**Interfaces:**
- Consumes: Task1〜4の実装結果
- Produces: なし

- [ ] **Step 1: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS（全体）

- [ ] **Step 2: `npm run build` → `out/` ができることを確認。** `NEXT_PUBLIC_TANE_LOGIN=on` でビルドし、`npx serve out -p 4000` で配る（`NEXT_PUBLIC_SPRA_API_URL` は開発中のSpra Go。Spra Go側で `TANE_LOGIN_ENABLED=true`・`legal.version`相当の動作確認用の設定が必要なら、スタブで代用してよい）

- [ ] **Step 3: Playwright で、次を確認する:**
  - ログイン（`terms_outdated: true` を返すスタブ応答）→ `/account/terms-consent` に送られる。「同意する」→ `/account/profiles` に進む
  - `terms_outdated: false`（または欠落）のログインは、そのまま `/account/profiles` に進む（同意画面が出ない）
  - 登録画面のチェック文言が「利用規約とプライバシーポリシーに同意します」になっている。リンク先が `go.spra.jp` になっている
  - （スタブで403 `code: terms_outdated` を返す）プロフィール選択後の同期中に、同意画面へ送られる。「同意する」後、記録が送り直される

- [ ] **Step 4: `company/spra/tane/docs/legal/terms.md`・`privacy.md` の冒頭に、「ログインを有効にするときは、本文を持たず Spra Go の共通規約・プライバシー（`go.spra.jp/terms`・`/privacy`）へのリンクに置き換える。ログインが無い間の説明として、この下書きを残す」旨を追記する**

- [ ] **Step 5: `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` に、今回の対応内容を追記する**

- [ ] **Step 6: Spra Go への回答文 `projects/Spra-go/docs/design/2026-10-23-tane-terms-consent-reply.md` を作成する。** 対応した内容（Task1〜4）、確認した内容（Step3）、見つかった問題（あれば）、本番有効化までの残り（Spra Go側の本文確定・版上げが先）を書く

- [ ] **Step 7: Commit は無し（Spra Goの回答文・Tane開発記録はTaneのリポジトリの外）**

## Self-Review

- **spec網羅**: 依頼文の4項目（同意の画面／403対応／規約リンクの統一／登録チェック文）は Task3・Task2・Task4・Task4 でそれぞれ対応。「確認したいこと」はTask5で確認・報告する。
- **型の一貫性**: `termsOutdated` の名前・型（boolean）は `AuthUserPayload`・`AuthUser`・`CurrentUser` で揺れなく統一。`code` は `ApiError` のみが持ち、`sync-engine`・`parent-screen` はそれを読むだけ（新しい型は増やさない）。
- **比率**: 依頼文（約35行）に対し、このコードベースで型・分岐・新しい画面を一つずつ指定する必要があり、依頼文より長い。手順の列が中心で、コードブロックは実装者が決められない固定値（文面・URL・フィールド名）に限っている。
