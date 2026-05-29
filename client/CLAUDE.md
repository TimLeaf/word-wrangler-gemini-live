# client/CLAUDE.md

Word Wrangler クライアント（Next.js 15 / React 19）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

## コマンド

`client/` ディレクトリで実行：

```bash
npm install          # 依存関係をインストール
npm run dev          # 開発サーバ (http://localhost:3000)
npm run build        # 本番ビルド
npm run lint         # ESLint (next lint)
npm test             # Vitest（単体テスト、1 回実行）
npm run test:watch   # Vitest watch モード
```

テストは Vitest（happy-dom 環境、`*.test.ts(x)`）。INV-3 / INV-4（`docs/invariants.md`）の client 側を保護する。

## コードフォーマット

Prettier（`.prettierrc`: 2 スペース、セミコロンあり、ダブルクォート）。

## 環境変数（`.env.local`）

- `BOT_START_URL` — ボット起動エンドポイント（未設定時は `http://localhost:7860/start`）
- `BOT_START_PUBLIC_API_KEY` — Pipecat Cloud デプロイ時の認証キー（オプション）
- `FIRESTORE_EMULATOR_HOST` — 設定時は `@google-cloud/firestore` SDK が自動で Emulator に接続（ローカル開発専用）。未設定の本番 Cloud Run では ADC で実 Firestore（database `wordbook`）に接続
- `GOOGLE_CLOUD_PROJECT` — 本番（Cloud Run）では自動付与。Emulator 接続時は未設定なら `demo-wordbook` に解決される（`src/lib/wordbook/firestore.ts`）

## アーキテクチャ

### ボット起動フロー

`src/app/api/start/route.ts` が `BOT_START_URL` をプロキシして Daily ルームを作成・ボットを起動する。`personality` と `language` を含むリクエストボディを `runner_args.body` としてサーバに渡す（サーバ側との整合性についてはルート `CLAUDE.md` / `docs/invariants.md` INV-1 参照）。

### 単語帳機能と単語供給（Phase 2b / 案 Z）

standalone `wordbook/` サービスを client に吸収した機能群（経緯は `docs/ideas/2026-05-18-wordbook-service.md`）。**Firestore SDK（`@google-cloud/firestore`）はサーバ側専用** — Route Handler / Server Actions からのみ import し、クライアントバンドルには絶対に混ぜない。

- **データ層**: `src/lib/wordbook/{firestore,wordbooks,words,validation}.ts`。Firestore（database `wordbook`、`wordbooks` コレクション + `words` サブコレクション）を直読み・直書き
- **管理 UI**: `/wordbooks`（一覧・作成・改名・削除・★デフォルト切替）と `/wordbooks/[id]`（単語の追加・編集・削除）。いずれも Server Actions（`src/app/wordbooks/actions.ts`）で更新
- **単語供給**: `GET /api/words`（`src/app/api/words/route.ts`、`force-dynamic`）がアクティブ（★ `isDefault`）単語帳の単語を `correctCount` 昇順・上限 `GAME_CONFIG.WORD_POOL_SIZE`(=30) で `{id,text}[]` 返却。`useGameState` がこれを取得し、未設定 / 空 / エラー時は組み込み単語（`getRandomCatchPhraseWords`、言語トグル）へフォールバックする
- **`correctCount`**: AI が正解した回数（旧 `usageCount` を改名）。昇順 = 正解の少ない語を優先出題。レガシー `usageCount` データも `toWord` のフォールバックで読める
- **ローカル開発（Firestore Emulator）**:
  ```bash
  # ターミナル1: Emulator（wordbook/ から起動）
  cd wordbook && npx firebase-tools emulators:start --only firestore
  # ターミナル2: client を Emulator 接続で起動
  cd client && FIRESTORE_EMULATOR_HOST=localhost:8080 npm run dev
  ```
- **権限**: 本番では client runtime SA（default Compute Engine SA）に `roles/datastore.user` 付与済み

### ゲーム状態遷移（`useGameState` + `WordWrangler.tsx`）

```
IDLE → CONNECTING → WAITING_FOR_INTRO → ACTIVE → FINISHED
```

- `WAITING_FOR_INTRO → ACTIVE` の遷移は **`RTVIEvent.BotStoppedSpeaking` の初回発火** で起こる（`src/components/Game/WordWrangler.tsx`）。これはサーバ側の `MuteUntilFirstBotCompleteUserMuteStrategy`（`server/bot.py` の `user_aggregator` 内に統合）と対になっており、ボットの挨拶が終わったタイミングでゲームタイマーを開始する
- ゲーム時間は 300 秒（5 分）、最大スキップ回数は 3、単語プールは 30 語ずつ補充（`src/constants/gameConstants.ts` の `GAME_CONFIG`）
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

Google Cloud Run（asia-northeast1）に GitHub Actions で自動デプロイ。`main` への push で `client/**` または `.github/workflows/deploy-client.yml` が変わったときに `.github/workflows/deploy-client.yml` が起動する。

- 認証は Workload Identity Federation（JSON キーは保存しない）。SA は `github-actions-deployer@gen-ai-timleaf.iam.gserviceaccount.com`
- イメージは `client/Dockerfile`（multi-stage、Next.js standalone 出力）でビルドし、Artifact Registry `asia-northeast1-docker.pkg.dev/gen-ai-timleaf/word-wrangler/word-wrangler-client:<sha>` に push
- Cloud Run サービス: `word-wrangler-client`。`BOT_START_URL` はワークフローの `--set-env-vars` で注入し、`BOT_START_PUBLIC_API_KEY` は Cloud Secret Manager の secret `bot-start-public-api-key` を `--set-secrets` で参照する（runtime SA に `roles/secretmanager.secretAccessor` 付与済み）
- アクセス制御: Cloud Run に IAP (Identity-Aware Proxy) を直接有効化（`gcloud run services update word-wrangler-client --iap`）。`roles/run.invoker` は IAP サービスエージェント (`service-${PROJECT_NUMBER}@gcp-sa-iap.iam.gserviceaccount.com`) のみに付与。許可ユーザーには `roles/iap.httpsResourceAccessor` を付与（`gcloud iap web add-iam-policy-binding --resource-type=cloud-run --service=word-wrangler-client`）。ワークフローには `--allow-unauthenticated` を付けないこと（付けると毎回 `allUsers` が再付与される）
- ブラウザ確認は `https://word-wrangler-client-<hash>.asia-northeast1.run.app` に直アクセス → Google ログイン
- IAP の OAuth client は project レベルで custom client を設定済み（`wordbook/CLAUDE.md` 参照）

GCP 側の構成・運用コマンドは `.steering/2026-05-07/client-deploy-to-gcp/tasks.md` 参照。

`output: 'standalone'` を有効にしているため、`.next/static` と `public/` は Dockerfile の runner ステージで個別にコピーする必要がある（漏らすとアセットが 404）。`NEXT_PUBLIC_*` はビルド時に bundle に焼き込まれるため、変更時は再ビルド必須。
