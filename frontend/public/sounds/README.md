# 音

Spra Go（`projects/Spra-go/frontend/public/sounds/`）からコピーしたもの。2026-10-14。

| ファイル | 鳴らす場面 |
|---|---|
| correct.mp3 | 正解 |
| incorrect.mp3 | 不正解 |
| allCorrect.mp3 | ステージクリア |
| coin.mp3 | タネが育った |
| decide41.mp3 | ボタン（`select`） |
| bgm-home.mp3 | ホーム・ステージ選択・なかま・せってい |
| bgm-quiz.mp3 | プレイ中 |
| bgm-minigame.mp3 | フィーバー中（プレイ画面から切り替える） |

- 効果音は「効果音ラボ」（https://soundeffect-lab.info/）の素材。商用利用可・クレジット不要。**音声ファイル単体の再配布は禁止**のため、このリポジトリを公開するときは sounds の中身を含めないこと
- BGM は Suno で制作したもの（Spra Go と同じ。制作記録: `company/spra/spra-theme/`）
- 鳴らす仕組みは `src/components/app/sound-provider.tsx`、ファイルの一覧は `src/lib/sound-files.ts`
