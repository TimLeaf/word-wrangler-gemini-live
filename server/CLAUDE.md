# server/CLAUDE.md

Word Wrangler サーバ（Pipecat / Gemini Live）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

## コマンド

`server/` ディレクトリで実行（uv を使用、Python >=3.10）：

```bash
uv sync                              # 依存関係をインストール
uv run bot -t daily                  # ローカル起動（Daily トランスポート）
uv run pytest                        # ユニットテスト実行
docker build -t word-wrangler-server .                         # 本番イメージビルド
docker run --rm -p 7860:7860 \
  -e GOOGLE_API_KEY=... -e DAILY_API_KEY=... \
  word-wrangler-server                                         # 本番イメージのローカル動作確認
```

テストは pytest（`server/tests/`）。`bot.py` の純粋データ部分（`PERSONALITY_PRESETS` / `game_prompt`）を固定し、INV-2 / INV-3 / INV-4 を server 側から保護する。

## コードフォーマット

Ruff（`pyproject.toml`: line-length 100、`select = ["I"]` で import 順序のみチェック）。

## 環境変数（`.env`）

- `GOOGLE_API_KEY` — Gemini Live API キー（必須）
- `DAILY_API_KEY` — Daily ルーム作成用（必須）
- `KRISP_ENABLED` — `true` のとき Krisp ノイズフィルタを有効化。デフォルト（未設定）では無効。Krisp SDK 同梱とライセンスキー設定が別途必要

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
- **Krisp ノイズフィルタ**：`KRISP_ENABLED=true` の場合のみ `KrispVivaFilter`（Krisp VIVA SDK ベース）が `DailyParams.audio_in_filter` として適用される（`bot.py` の `bot()` 内）。利用には `krisp_audio` パッケージとライセンスキーが別途必要。デフォルトでは無効でフィルタは入らない
- **VAD**：`SileroVADAnalyzer()` をデフォルト引数で `LLMUserAggregatorParams.vad_analyzer` に明示指定（`bot.py:112`）
- **ターン検出**：`bot.py` では明示指定していないため、`UserTurnStrategies` のデフォルト連鎖で `LocalSmartTurnAnalyzerV3` が user turn stop strategy として使われる（pipecat の標準デフォルト）

### システムプロンプト

`game_prompt` で Gemini に対し「`Is it [guess]?` 形式で推測を述べる」ことを明示している。クライアント側の正規表現マッチがこの形式に依存しているため、プロンプトを変更する場合はクライアント側の `TRANSCRIPT_PATTERNS.GUESS_PATTERN` との整合性に注意。

### 起動フロー

`bot()` がトランスポート種別ごとの `transport_params` を組み立て、`create_transport` でトランスポートを生成して `run_bot()` に渡す。`run_bot()` がパイプラインを構築し、`on_client_ready` イベントで `LLMRunFrame` をキューに入れて会話を開始する。

## デプロイ

Google Cloud Run（`asia-northeast1`）に GitHub Actions で自動デプロイ。`main` への push で `server/**` または `.github/workflows/deploy-server.yml` が変わったときに `.github/workflows/deploy-server.yml` が起動する。

- 認証は Workload Identity Federation（client と共用、JSON キー不要）。SA は `github-actions-deployer@gen-ai-timleaf.iam.gserviceaccount.com`
- イメージは `server/Dockerfile`（`dailyco/pipecat-base` ベース）でビルドし、Artifact Registry `asia-northeast1-docker.pkg.dev/gen-ai-timleaf/word-wrangler/word-wrangler-server:<sha>` に push
- Cloud Run サービス: `word-wrangler-server`、ポート 7860、`--timeout=3600 --concurrency=1 --no-allow-unauthenticated`
- シークレット: `GOOGLE_API_KEY` / `DAILY_API_KEY` を Secret Manager から `--set-secrets` で注入
- Krisp は無効（`KRISP_ENABLED` 未設定）
- アクセス制御: 非公開。client Cloud Run runtime SA のみが `roles/run.invoker` を持ち、client 側 `/api/start/route.ts` が GCP metadata server から ID token を取得して `Authorization: Bearer` で呼び出す

GCP 側の構成・運用コマンドは `.steering/2026-05-09/server-deploy-to-cloudrun/tasks.md` 参照。
