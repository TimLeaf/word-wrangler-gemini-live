# server/CLAUDE.md

Word Wrangler サーバ（Pipecat / Gemini Live）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

## コマンド

`server/` ディレクトリで実行（uv を使用、Python >=3.10）：

```bash
uv sync                              # 依存関係をインストール
uv run bot -t daily                  # ローカル起動（Daily トランスポート）
uv run pytest                        # ユニットテスト実行
uv run pcc secrets set word-wrangler-secrets --file .env  # secret_set を登録 / 更新（.env から）
uv run pcc deploy                    # Pipecat Cloud にデプロイ（PCC 側でリモートビルドが走るため build-push 不要）
```

テストは pytest（`server/tests/`）。`bot.py` の純粋データ部分（`PERSONALITY_PRESETS` / `game_prompt`）を固定し、INV-2 / INV-3 / INV-4 を server 側から保護する。

## コードフォーマット

Ruff（`pyproject.toml`: line-length 100、`select = ["I"]` で import 順序のみチェック）。

## 環境変数（`.env`）

- `GOOGLE_API_KEY` — Gemini Live API キー（必須）
- `DAILY_API_KEY` — Daily ルーム作成用（ローカルでは必須、Pipecat Cloud では自動付与）
- `ENV=local` を設定するとローカル実行と判定され、Krisp ノイズフィルタが無効化される

## アーキテクチャ

### Pipecat パイプライン（`bot.py`）

ランタイムで動作するパイプラインは 6 段:

```
transport.input()
  → RTVIProcessor         # クライアント / サーバ間の双方向イベント中継（PipelineTask が自動追加）
  → user_aggregator       # ユーザー発話をコンテキストに集約（ミュート戦略 + VAD を内包）
  → GeminiLiveLLMService  # Gemini Live で音声応答を生成
  → transport.output()
  → assistant_aggregator  # アシスタント発話をコンテキストに集約
```

`bot.py:116-124` の `Pipeline([...])` には 5 段だけが書かれているが、`PipelineTask` の生成時にランタイムが `RTVIProcessor` を自動追加する。`bot.py` では `@task.rtvi.event_handler("on_client_ready")`（`bot.py:134`）でこの自動追加されたプロセッサにハンドラを登録し、クライアント接続時に `LLMRunFrame` をキューイングして会話を開始する。

重要なポイント：

- **STT は使わない**：`GeminiLiveLLMService` が音声入力を直接処理するため、STT サービスはパイプラインに無い
- **ミュート戦略 `MuteUntilFirstBotCompleteUserMuteStrategy`**：`LLMUserAggregatorParams.user_mute_strategies` に渡す形で `user_aggregator` 内部に統合されている（`bot.py:111`）。ボットの自己紹介が完了する前にユーザーが割り込むのを防ぎ、クライアント側のゲーム開始トリガー（`BotStoppedSpeaking` の初回発火）と対になっている
- **`personality`** はクライアントから `runner_args.body` で渡され、`PERSONALITY_PRESETS`（friendly / professional / enthusiastic / thoughtful / witty）からシステムプロンプトに合成される
- **Krisp ノイズフィルタ**：本番環境（`ENV != "local"`）では `KrispVivaFilter`（Krisp VIVA SDK ベース）が `DailyParams.audio_in_filter` として適用される（`bot.py:162-164`）。利用には `krisp_audio` パッケージが必要
- **VAD**：`SileroVADAnalyzer()` をデフォルト引数で `LLMUserAggregatorParams.vad_analyzer` に明示指定（`bot.py:112`）
- **ターン検出**：`bot.py` では明示指定していないため、`UserTurnStrategies` のデフォルト連鎖で `LocalSmartTurnAnalyzerV3` が user turn stop strategy として使われる（pipecat の標準デフォルト）

### システムプロンプト

`game_prompt` で Gemini に対し「`Is it [guess]?` 形式で推測を述べる」ことを明示している。クライアント側の正規表現マッチがこの形式に依存しているため、プロンプトを変更する場合はクライアント側の `TRANSCRIPT_PATTERNS.GUESS_PATTERN` との整合性に注意。

### 起動フロー

`bot()` がトランスポート種別ごとの `transport_params` を組み立て、`create_transport` でトランスポートを生成して `run_bot()` に渡す。`run_bot()` がパイプラインを構築し、`on_client_ready` イベントで `LLMRunFrame` をキューに入れて会話を開始する。

## デプロイ

Pipecat Cloud に GitHub Actions で自動デプロイ。`main` ブランチに `server/**` または `.github/workflows/deploy-server.yml` の変更がマージされると `.github/workflows/deploy-server.yml` が起動し、`uv sync --locked` → `uv run pcc deploy --yes` を実行する。

- 認証は PCC の Personal Access Token (`pcc_pat_...`)。GitHub Secrets `PCC_PAT` に保存し、ワークフローで `PIPECAT_TOKEN` env var として渡す
- `pcc-deploy.toml`（git 管理）で `agent_name` / `secret_set` / `agent_profile` / `[scaling]` を指定。Krisp Viva は `[krisp_viva] audio_filter = "pro"` で有効化する（旧 `enable_krisp = true` は deprecated）
- `Dockerfile` は `dailyco/pipecat-base` をベースに `uv sync --locked --no-install-project --no-dev` で依存を入れる構成。PCC 側でリモートビルドが走るため、ローカルでの `docker build-push` は不要
- **Secret (`word-wrangler-secrets`) の更新は手動運用**: GHA からは触らない。`server/.env` を更新したら手元で `uv run pcc secrets set word-wrangler-secrets --file .env` を実行する
- 手動再 deploy は `workflow_dispatch`、または手元で `uv run pcc deploy --yes` を実行
