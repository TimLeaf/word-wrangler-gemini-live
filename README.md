# Word Wrangler

「Word Wrangler」は、PipecatとGemini Live APIを活用した音声ベースの単語当てゲーム(Web-Base application)

## Web-Based Game Modes

あなたが単語を提示し、AIプレイヤーがその説明をもとにその単語を当てるというゲーム

## Game Rules

1. このWeb Applicationでは、説明する単語が表示される
2. その単語のどの部分も口に出さずに、その単語を説明してください
3. AIプレイヤーが、あなたの説明をもとにその単語を当てようとする
4. アプリが自動的に正解を確認し、スコアを記録する
5. 「スキップ」をクリックすると、次の単語に進む
6. 60秒間でできるだけ多くのポイントを獲得する

## Architecture

このWebゲームは、シンプルな直線的なフローを採用している：

1. **Transport Input** - Daily WebRTCトランスポートを介して、Webブラウザから音声を受信する
2. **RTVIProcessor** - クライアントと Pipecat アプリケーション間の双方向通信を管理する。RTVI は音声 AI 分野のクライアント／サーバ間通信の標準規格で、サーバ側の情報をクライアントへ渡したり、クライアントからのイベント（接続準備完了など）をサーバ側で購読したりするのに使う。`bot.py` では `Pipeline([...])` への明示記述はなく、`PipelineWorker` がランタイムで自動追加する
3. **User Context Aggregator** - 会話のコンテキストの一部としてユーザーのメッセージを集約する。`MuteUntilFirstBotCompleteUserMuteStrategy` を内包しており、ボットが最初の挨拶を喋り終わるまでユーザー音声をミュートして、ボットが中断されることなく最初のメッセージを送信できるようにする
4. **LLM** - LLMは、AIプレイヤーの対話機能を支えている
5. **Transport Output** - Daily WebRTCトランスポートを使用して、オーディオをブラウザに送信する
6. **Assistant Context Aggregator** - アシスタントのメッセージを会話コンテキストの一部として集約する

## Run Locally

### Run the Server

```bash
uv run bot -t daily
```

### Run the Client

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## Deployment

### Deploy your Server

サーバは Pipecat Cloud に GitHub Actions で自動デプロイする構成になっている。`main` ブランチに `server/**` または `.github/workflows/deploy-server.yml` の変更がマージされると `.github/workflows/deploy-server.yml` が起動し、`uv sync --locked` → `uv run pcc deploy --yes` を実行する。

認証は PCC の Personal Access Token (`pcc_pat_...`) を GitHub Secrets `PCC_PAT` に登録し、ワークフローで `PIPECAT_TOKEN` env var として渡している。手動再 deploy は `workflow_dispatch`、または手元で `uv run pcc deploy --yes` を実行する。

リポジトリには `server/pcc-deploy.toml` を同梱しており、GHA でも手元でも同じ設定でデプロイできる：

```toml
agent_name = "word-wrangler"
secret_set = "word-wrangler-secrets"
agent_profile = "agent-1x"

[scaling]
  min_agents = 0
  max_agents = 2

[krisp_viva]
  audio_filter = "pro"
```

ポイント：

- **イメージのビルドは PCC 側のリモートビルド**を利用するため、ローカルでの `docker build-push` は不要（カスタムレジストリを使う場合のみ必要）
- **シークレットは `secret_set`** で参照する。`server/.env` に `GOOGLE_API_KEY` と `DAILY_API_KEY` を用意し、`uv run pcc secrets set word-wrangler-secrets --file .env` で登録する。`DAILY_API_KEY` も明示的に登録が必要（自動付与は `dailyMeetingTokenProperties` 経由のトークン取得で必要なため）。**secret_set の更新は GHA からは行わず、手動運用とする**（`.env` を CI から上書きするリスクを避けるため）
- **Krisp Viva は `[krisp_viva] audio_filter = "pro"` で有効化**する。旧 `enable_krisp = true` は deprecated で、Krisp バイナリが mount されないため import エラーになる
- `min_agents = 0` でコールドスタートを許容しコストを抑えている

デプロイ後、PCC ダッシュボードで agent の **public start endpoint URL** と **public API key** を取得する。`BOT_START_URL` は `.github/workflows/deploy-client.yml` で `--set-env-vars` 経由で注入する固定値、`BOT_START_PUBLIC_API_KEY` は Cloud Secret Manager の secret `bot-start-public-api-key` を `--set-secrets` で参照する（client runtime SA に `roles/secretmanager.secretAccessor` 付与が必要）。鍵をローテーションする場合は Secret Manager に新バージョンを追加すれば次回 deploy 時に反映される。

### Deploy your Client

クライアントは Google Cloud Run（`asia-northeast1`）に GitHub Actions で自動デプロイする構成になっている。`main` ブランチに `client/**` または `.github/workflows/deploy-client.yml` の変更がマージされると `.github/workflows/deploy-client.yml` が起動し、以下を実行する：

1. Workload Identity Federation で GCP に認証（JSON キー不要）
2. `client/Dockerfile`（multi-stage、Next.js standalone 出力）からイメージをビルド
3. Artifact Registry (`asia-northeast1-docker.pkg.dev/<project>/word-wrangler/word-wrangler-client:<sha>`) に push
4. Cloud Run サービス `word-wrangler-client` にデプロイ

初回セットアップに必要な GCP 側の準備（API 有効化、Artifact Registry、Service Account、Workload Identity Federation、GitHub Secrets）と運用コマンドは `.steering/2026-05-07/client-deploy-to-gcp/tasks.md` を参照。

サービスは非公開設定で、`roles/run.invoker` を付与した Google アカウントのみがアクセスできる。ブラウザ確認は次のプロキシ経由で行う：

```bash
gcloud run services proxy word-wrangler-client \
  --region=asia-northeast1 --project=<project-id>
# → http://localhost:8080
```

ローカルでイメージを確認したい場合：

```bash
cd client
docker build -t word-wrangler-client .
docker run --rm -p 3000:3000 -e BOT_START_URL=http://example.com word-wrangler-client
```

## Tech stack

- リアルタイム音声会話のための [Pipecat](https://www.pipecat.ai/) framework
- Google's Gemini Live API
- リアルタイム通信 (Web via Daily)
