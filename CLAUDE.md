# CLAUDE.md

## プロジェクト概要

Word Wrangler は Pipecat と Google Gemini Live API を活用した、音声ベースの単語当てゲーム。ユーザーが画面に表示された単語を口頭で説明し、AI プレイヤー（Gemini）が説明から単語を推測する。クライアント / サーバ構成で、音声通信は Daily WebRTC を介して行う。

## リポジトリ構成

- `client/` — Next.js 15 / React 19 のフロントエンド。ゲーム本体に加え、**単語帳管理 UI（`/wordbooks`）と単語供給/正解増分 API（`/api/words`, `/api/words/increment`）** を持つ。`client/src/lib/wordbook/*` 経由で Firestore（database `wordbook`）を直読み・直書き。詳細は `client/CLAUDE.md`
- `server/` — Pipecat ベースの Python ボット。詳細は `server/CLAUDE.md`

> 旧 `wordbook/`（standalone Cloud Run サービス）は Phase 2b（案 Z）で `client` に完全吸収し、PR-4 で撤去済み。経緯は `docs/ideas/2026-05-18-wordbook-service.md`

それぞれのディレクトリにある `CLAUDE.md` に、コマンド・環境変数・アーキテクチャの詳細を記載している。作業対象のディレクトリ側を参照すること。

## システム全体の通信フロー

```
ブラウザ (Pipecat Client + Daily Transport)
   ↕ WebRTC 音声
Daily ルーム
   ↕
サーバ (bot.py の Pipecat Pipeline + Gemini Live)
```

クライアントは `POST /api/start` を Next.js API Route に送り、API Route が `BOT_START_URL`（Pipecat Cloud / ローカルランナー）にプロキシして Daily ルームを作成、ボットを起動する。Gemini Live が音声入力を直接処理するため、パイプラインに STT サービスは存在しない。

## クライアント・サーバ横断の注意事項

- **`runner_args.body` のプロトコル整合性**：ペルソナリティ追加など body の構造を変える場合、クライアント側 `client/src/app/api/start/route.ts` のリクエストボディと、サーバ側 `server/bot.py` の `config.get(...)` の両方を一致させること
- **ゲーム開始トリガーの保持**：クライアントはサーバの初回挨拶が終わったタイミング（`RTVIEvent.BotStoppedSpeaking` の初回発火）でゲームタイマーを開始する。`server/bot.py` の `game_prompt` 冒頭にある固定挨拶（`Welcome to Word Wrangler!...`）を変更する場合も、「最初に一度ボットが発話を終える」フローを必ず保つこと
- **テスト**：client は Vitest（`client/` で `npm test`）、server は pytest（`server/` で `uv run pytest`）。両者で INV-1〜4（`docs/invariants.md`）を保護している

## デプロイ

- サーバ：Pipecat Cloud（`server/CLAUDE.md` 参照）
- クライアント：Google Cloud Run / `asia-northeast1`、IAP 保護（`client/CLAUDE.md` 参照）
