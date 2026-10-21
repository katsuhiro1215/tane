# 音

Spra Go（`projects/Spra-go/frontend/public/sounds/`）からコピーしたもの。2026-10-14。

| ファイル | 鳴らす場面 |
|---|---|
| correct.mp3 | 正解 |
| incorrect.mp3 | 不正解 |
| allCorrect.mp3 | ステージクリア |
| coin.mp3 | タネが育った |
| decide41.mp3 | ボタン（`select`） |
| bgm-tane-home.mp3 | ホーム・ステージ選択・なかま・せってい |
| bgm-tane-play.mp3 | プレイ中 |
| bgm-tane-fever.mp3 | フィーバー中（プレイ画面から切り替える） |

- 効果音は「効果音ラボ」（https://soundeffect-lab.info/）の素材。商用利用可・クレジット不要。**音声ファイル単体の再配布は禁止**のため、このリポジトリを公開するときは sounds の中身を含めないこと
- BGM は Suno で制作した **Tane 専用の曲**（2026-10-21 に Spra Go の曲から入れ替え）。制作記録: `company/spra/spra-theme/docs/2026-10-21-tane-bgm-record.md`
- 鳴らす仕組みは `src/components/app/sound-provider.tsx`、ファイルの一覧は `src/lib/sound-files.ts`
