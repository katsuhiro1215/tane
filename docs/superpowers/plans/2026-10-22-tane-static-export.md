# Tane を静的書き出しにする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run build` が静的ファイル一式（`out/`）を出力するようにし、Caddy だけで配れる形にする（Node のコンテナを増やさない）。画面の動き・URL の形は変えない。

**Architecture:** `next.config.ts` に `output: "export"` を足し、動的ルート（`[stageId]`・`[modeId]`）に `generateStaticParams` を足して、そのあそび・ステージの一覧にある ID だけを書き出す（`dynamicParams = false` で一覧外は 404）。唯一サーバー側で `searchParams` を読んでいた `mode/[modeId]` は、すでにクライアント専用（`ssr: false`）で動いている `ModeScreen` 側で `window.location.search` から読む形に変える（新しい仕組みを増やさず、`grew`/`from` で既にやっている方法に `stage` も合わせる）。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Vitest（`projects/tane/frontend`）。

**Spec:** `projects/Spra-go/docs/design/2026-10-22-tane-static-export-request.md`（Spra Go 側からの依頼文。この文書が仕様）。

## Global Constraints

- `next.config.ts`：`output: "export"` を足す。`images: { unoptimized: true }` は今のまま。`trailingSlash: true` も足す（`/stage/add-1/` の形にして、Caddy の `file_server` で `index.html` をそのまま配れるようにする）。
- 動的ルート6つ（`stage/[stageId]`・`seed/[stageId]`・`soroban/[stageId]`・`flash/[stageId]`・`mode/[modeId]`・`challenge/[modeId]`）に `generateStaticParams` と `export const dynamicParams = false;` を足す。一覧にない ID は 404。
- サーバー側で `searchParams` を読んでいる唯一の場所（`mode/[modeId]/page.tsx`）を、クライアント側（`window.location.search`）で読む形に変える。画面の動き・URL の形（`?stage=`・`?grew=&from=`）は変えない。
- 環境変数（`NEXT_PUBLIC_SPRA_API_URL`・`NEXT_PUBLIC_TANE_LOGIN`）はビルド時に埋め込まれる前提（今の `flags.ts`・`api.ts` の `process.env.NEXT_PUBLIC_*` の使い方のままで動くはず。コードは変えない）。
- `public/sw.js` のページ遷移（`navigate`）はネットワーク優先のままなので、新しいビルドの HTML が届かなくなることはない。アセットは Next のビルドごとに違うファイル名になるので、古いキャッシュは使われなくなるだけで害は無い。今回の移行（サーバー配信 → 静的配信、URL の形が `trailingSlash` で変わる）の区切りとして `CACHE_NAME` だけ1つ上げる（`v2` → `v3`）。`sw.js` 自体を `Cache-Control: no-cache` で配るのは Spra Go 側の作業（Caddy 側）。
- 既存の vitest・tsc・eslint は、1つも壊さない。

## Review Focus

- ネストした動的 URL（例 `/stage/add-5/`）を直接開く・リロードしても 404 にならない（`trailingSlash` と `generateStaticParams` の組み合わせ違いで起きやすい）。
- 一覧に無い ID（例 `/stage/doesnotexist/`）は 404 になる（`dynamicParams = false` が効いているか）。
- `mode/[modeId]` の `?stage=`・`?grew=&from=` の両方が、クライアント側に移したあとも前と同じに動く（ステージを選んで戻る・なかまが育つ演出）。
- `/account/*`（login・register・profiles・parent）が、サーバー側データに依存せず静的に書き出せる（すでにクライアント専用の作りだが、`output: "export"` で初めて厳しく検査される）。
- サービスワーカーが、デプロイ直後に古い画面（HTML）を出し続けない（`navigate` はネットワーク優先なので、理屈の上では問題ないはずだが、実機のオフライン復帰・リロードの挙動で確かめる）。

---

### Task 1: 静的書き出しの設定・動的ルートの対応・searchParams の移行

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/stage/[stageId]/page.tsx`・`src/app/seed/[stageId]/page.tsx`・`src/app/soroban/[stageId]/page.tsx`・`src/app/flash/[stageId]/page.tsx`・`src/app/mode/[modeId]/page.tsx`・`src/app/challenge/[modeId]/page.tsx`
- Modify: `src/components/mode/mode-screen-loader.tsx`・`src/components/mode/mode-screen.tsx`

**Interfaces:**
- Consumes: `STAGES`・`MODE_IDS`・`getStage`（`@/data/stages/catalog`）、`CHALLENGE_MODE_IDS`（`@/lib/game/challenge-rules`）、`parseModeSearchParams`（`@/lib/mode-params`、変更なし）
- Produces: 各 `page.tsx` の `generateStaticParams(): { stageId: string }[]` または `{ modeId: string }[]`（他タスクから参照されない、ファイル内で完結）

- [ ] **Step 1: `next.config.ts` を変える**

```ts
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
```

- [ ] **Step 2: Run** `npm run build` — Expected: FAIL（動的ルートに `generateStaticParams` が無い・`mode/[modeId]` が `searchParams` を読んでいる、という趣旨のビルドエラー）。このエラー文を確認してから次へ進む（何が足りないかの裏取り）。

- [ ] **Step 3: 動的ルートに `generateStaticParams`・`dynamicParams = false` を足す**

  - `stage/[stageId]/page.tsx`：`STAGES.filter((s) => s.kind === "arithmetic").map((s) => ({ stageId: s.id }))`
  - `seed/[stageId]/page.tsx`：`STAGES.filter((s) => s.kind === "seed")`
  - `soroban/[stageId]/page.tsx`：`STAGES.filter((s) => s.kind === "soroban")`
  - `flash/[stageId]/page.tsx`：`STAGES.filter((s) => s.kind === "flash")`
  - `mode/[modeId]/page.tsx`：`MODE_IDS.map((modeId) => ({ modeId }))`
  - `challenge/[modeId]/page.tsx`：`CHALLENGE_MODE_IDS.map((modeId) => ({ modeId }))`

  どのファイルも `export const dynamicParams = false;` を足す。

- [ ] **Step 4: `mode/[modeId]/page.tsx` から `searchParams` を外す**

  `page.tsx` は `params` だけを受け取り、`requestedStageId` を渡さずに `<ModeScreenLoader modeId={modeId} />` を返す形にする（`parseModeSearchParams`・`searchParams` の読み込みをページから削除）。

- [ ] **Step 5: `requestedStageId` をクライアント側（`window.location.search`）から読む**

  `mode-screen.tsx` の `readGrewFromLocation` は、`parseModeSearchParams` の戻り値を1回しか使っていない（`grewStageId`/`grewFrom`）。同じ呼び出しの戻り値から `requestedStageId` も取り出す形にまとめ（関数名は `readModeSearchFromLocation` などに変えてよい）、`ModeScreen` 内の `useState(() => initialFocusStage(modeId, stars, requestedStageId).id)` がこの値を使うようにする。`ModeScreenLoader`・`ModeScreen` の props から `requestedStageId` を外す（`modeId` だけになる）。

- [ ] **Step 6: Run** `npm run build` — Expected: PASS。`out/` ディレクトリができる。

- [ ] **Step 7: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS（既存テストは1つも変えていない。`mode-params.test.ts` はピュア関数のテストなのでそのまま通る）

- [ ] **Step 8: Commit**

```bash
git add next.config.ts src/app/stage/[stageId]/page.tsx src/app/seed/[stageId]/page.tsx src/app/soroban/[stageId]/page.tsx src/app/flash/[stageId]/page.tsx src/app/mode/[modeId]/page.tsx src/app/challenge/[modeId]/page.tsx src/components/mode/mode-screen-loader.tsx src/components/mode/mode-screen.tsx
git commit -m "feat: 静的書き出し(output: export)に対応"
```

### Task 2: 書き出した静的ファイルの動作確認とサービスワーカーの版上げ

**Files:**
- Modify: `public/sw.js`（`CACHE_NAME` の版だけ）

**Interfaces:**
- Consumes: Task1 が出す `out/`
- Produces: なし（確認のみ）

- [ ] **Step 1: `public/sw.js` の `CACHE_NAME` を上げる**（`"tane-cache-v2"` → `"tane-cache-v3"`）。今回の移行（配り方が変わる）の区切りとして1回だけ。

- [ ] **Step 2: Run** `npm run build`（Task1の設定のまま）→ `out/` ができることをもう一度確認

- [ ] **Step 3: `out/` を静的サーバーで配って確かめる**

```bash
npx serve out -p 4000
```

  - ホーム（`/`）が開く
  - いずれかのあそび → ステージを選ぶ → 1ステージ遊んで結果画面まで行ける
  - `/stage/add-1/` のような、ステージの URL を直接開く・リロードしても 404 にならない
  - `/stage/doesnotexist/` のような、無い ID は 404 になる
  - `/mode/add?stage=add-3` を直接開くと、`add-3` が選ばれた状態で開く（`?grew=`・`&from=` も、育った演出が出る画面から確認）
  - `/settings`・`/friends`・`/challenge`・`/account/login`・`/account/register`・`/account/profiles`・`/account/parent` が開く
  - `NEXT_PUBLIC_TANE_LOGIN=on` で書き出したときだけ、ホームにログインのチップが出る（off でのビルドでは出ない。今回は off のままで確認でよい）

- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/sw.js
git commit -m "chore: 静的配信への切り替えにあわせてsw.jsの版を上げる"
```

### Task 3: Spra Go 側への報告・記録

**Files:**
- Modify: `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md`（Tane の開発記録。リポジトリの外なので commit 対象外）
- Create: Spra Go 側への回答文（`projects/Spra-go/docs/design/` に、依頼文と同じ場所へ）

**Interfaces:**
- Consumes: Task1・Task2 で確認した内容
- Produces: なし

- [ ] **Step 1:** Task2 の確認結果（動いた・動かなかった機能）を、Spra Go 側への回答文としてまとめる（依頼文の「確認したいこと」に答える形）。見つかった問題があれば、そのまま B 案（Node のコンテナを足す）に切り替えてよいかも書く。
- [ ] **Step 2:** `company/spra/tane/docs/2026-09-25-kaihatsu-kiroku.md` に追記
- [ ] **Step 3:** Commit は無し（どちらも Tane のリポジトリの外）

## Self-Review

- **spec網羅**: 依頼文の6項目（output:export／generateStaticParams／searchParams移行／ビルド確認／環境変数／sw.js）は Task1・Task2 でそれぞれ対応している。「確認したいこと」はTask3で回答する。
- **型の一貫性**: `requestedStageId` を渡す経路を `page.tsx → Loader → Screen` から `Screen` 内の `window.location.search` 読み取りに変えるだけで、`ModeSearch` 型・`parseModeSearchParams` のシグネチャ自体は変えない。
- **比率**: 依頼文（約40行）に対してこの計画は長めだが、6つの似た `generateStaticParams` を1つずつ明記する必要があり、コードブロックではなく一覧で済ませている。
