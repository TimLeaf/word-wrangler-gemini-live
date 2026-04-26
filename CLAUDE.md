# CLAUDE.md

## プロジェクト概要

Word Wrangler は Pipecat と Google Gemini Live API を活用した、音声ベースの単語当てゲーム。ユーザーが画面に表示された単語を口頭で説明し、AI プレイヤー（Gemini）が説明から単語を推測する。クライアント / サーバ構成で、音声通信は Daily WebRTC を介して行う。

## リポジトリ構成

- `client/` — Next.js 15 / React 19 のフロントエンド。詳細は `client/CLAUDE.md`
- `server/` — Pipecat ベースの Python ボット。詳細は `server/CLAUDE.md`

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
- **テストフレームワーク未設定**：このリポジトリにはテストコマンドが存在しない

## デプロイ

- サーバ：Pipecat Cloud（`server/CLAUDE.md` 参照）
- クライアント：Vercel 推奨（`client/CLAUDE.md` 参照）
