# client/CLAUDE.md

Word Wrangler クライアント（Next.js 15 / React 19）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

## コマンド

`client/` ディレクトリで実行：

```bash
npm install          # 依存関係をインストール
npm run dev          # 開発サーバ (http://localhost:3000)
npm run build        # 本番ビルド
npm run lint         # ESLint (next lint)
```

テストフレームワークは未設定。

## コードフォーマット

Prettier（`.prettierrc`: 2 スペース、セミコロンあり、ダブルクォート）。

## 環境変数（`.env.local`）

- `BOT_START_URL` — ボット起動エンドポイント（未設定時は `http://localhost:7860/start`）
- `BOT_START_PUBLIC_API_KEY` — Pipecat Cloud デプロイ時の認証キー（オプション）

## アーキテクチャ

### ボット起動フロー

`src/app/api/start/route.ts` が `BOT_START_URL` をプロキシして Daily ルームを作成・ボットを起動する。`personality` を含むリクエストボディを `runner_args.body` としてサーバに渡す（サーバ側との整合性についてはルート `CLAUDE.md` 参照）。

### ゲーム状態遷移（`useGameState` + `WordWrangler.tsx`）

```
IDLE → CONNECTING → WAITING_FOR_INTRO → ACTIVE → FINISHED
```

- `WAITING_FOR_INTRO → ACTIVE` の遷移は **`RTVIEvent.BotStoppedSpeaking` の初回発火** で起こる（`src/components/Game/WordWrangler.tsx`）。これはサーバ側の `STTMuteFilter` と対になっており、ボットの挨拶が終わったタイミングでゲームタイマーを開始する
- ゲーム時間は 60 秒、最大スキップ回数は 3、単語プールは 30 語ずつ補充（`src/constants/gameConstants.ts` の `GAME_CONFIG`）
- ベストスコアは `localStorage.bestScore` に永続化

### 単語推測の検出（`src/utils/wordDetection.ts`）

`useWordDetection` が `RTVIEvent.BotTranscript` を購読し、ボットの発話を以下の優先度で判定：

1. **明示的な推測**：正規表現 `TRANSCRIPT_PATTERNS.GUESS_PATTERN`（`Is it "X"?` や `Is it a/an X?` のパターン）にマッチした場合、抽出語と現在のターゲット語を比較
2. **暗黙的な含有**：上記にマッチしない場合、トランスクリプト全体にターゲット語が含まれているかをチェック

「Mark Correct」ボタンで手動正解判定もできる。サーバ側のシステムプロンプトで Gemini が `Is it [guess]?` 形式で答えるよう明示されているため、正規表現のパターンと相互依存している。

### 状態管理

- React Context: `ConfigurationProvider`（パーソナリティ選択）、`PipecatProvider`（PipecatClient シングルトン）
- Jotai が依存関係に含まれているが、現状の主なゲーム状態は `useGameState` 内部の `useState` で管理されている
- `PipecatClient` は `clientCreated` ref で StrictMode 二重マウント時の重複生成を防いでいる

## デプロイ

Vercel 推奨（Next.js）。`client/` ディレクトリから `vercel` CLI を実行。
