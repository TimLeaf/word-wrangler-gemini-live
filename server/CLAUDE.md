# server/CLAUDE.md

Word Wrangler サーバ（Pipecat / Gemini Live）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

## コマンド

`server/` ディレクトリで実行（uv を使用、Python >=3.10）：

```bash
uv sync                              # 依存関係をインストール
uv run bot -t daily                  # ローカル起動（Daily トランスポート）
uv run pcc docker build-push         # Pipecat Cloud 用 Docker イメージのビルドとプッシュ
uv run pcc deploy                    # Pipecat Cloud にデプロイ
```

テストフレームワークは未設定。

## コードフォーマット

Ruff（`pyproject.toml`: line-length 100、`select = ["I"]` で import 順序のみチェック）。

## 環境変数（`.env`）

- `GOOGLE_API_KEY` — Gemini Live API キー（必須）
- `DAILY_API_KEY` — Daily ルーム作成用（ローカルでは必須、Pipecat Cloud では自動付与）
- `ENV=local` を設定するとローカル実行と判定され、Krisp ノイズフィルタが無効化される

## アーキテクチャ

### Pipecat パイプライン（`bot.py`）

```
transport.input()
  → RTVIProcessor              # クライアント / サーバ間のイベント中継
  → STTMuteFilter              # ボットの初回挨拶中はユーザー音声をミュート
  → context_aggregator.user()  # ユーザー発話をコンテキストに集約
  → GeminiLiveLLMService       # Gemini Live で音声応答を生成
  → transport.output()
  → context_aggregator.assistant()
```

重要なポイント：

- **STT は使わない**：`GeminiLiveLLMService` が音声入力を直接処理するため、STT サービスはパイプラインに無い
- **`STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE`** によって、ボットの自己紹介が完了する前にユーザーが割り込むのを防いでいる。これはクライアント側のゲーム開始トリガー（`BotStoppedSpeaking` の初回発火）と対になっている
- **`personality`** はクライアントから `runner_args.body` で渡され、`PERSONALITY_PRESETS`（friendly / professional / enthusiastic / thoughtful / witty）からシステムプロンプトに合成される
- 本番環境（`ENV != "local"`）では `KrispFilter` が音声入力フィルタとして適用される
- ターン検出は `LocalSmartTurnAnalyzerV3`、VAD は `SileroVADAnalyzer`（`stop_secs=0.2`）

### システムプロンプト

`game_prompt` で Gemini に対し「`Is it [guess]?` 形式で推測を述べる」ことを明示している。クライアント側の正規表現マッチがこの形式に依存しているため、プロンプトを変更する場合はクライアント側の `TRANSCRIPT_PATTERNS.GUESS_PATTERN` との整合性に注意。

### 起動フロー

`bot()` がトランスポート種別ごとの `transport_params` を組み立て、`create_transport` でトランスポートを生成して `run_bot()` に渡す。`run_bot()` がパイプラインを構築し、`on_client_ready` イベントで `LLMRunFrame` をキューに入れて会話を開始する。

## デプロイ

Pipecat Cloud。`pcc-deploy.toml` で `agent_name`、`image`、`secret_set`、`enable_krisp` を指定。Krisp 有効化が前提。`Dockerfile` は `dailyco/pipecat-base` をベースに `uv sync --locked --no-install-project --no-dev` で依存を入れる構成。
