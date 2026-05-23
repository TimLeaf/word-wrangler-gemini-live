# wordbook/CLAUDE.md

Wordbook サービス（Next.js 15 / React 19）の Claude Code 向けガイド。リポジトリ全体の概要はルートの `CLAUDE.md` を参照。

Phase 1 MVP のステータスやプランは `.steering/2026-05-23/wordbook-service-mvp/` を参照。

## コマンド

`wordbook/` ディレクトリで実行：

```bash
npm install          # 依存関係をインストール
npm run dev          # 開発サーバ (http://localhost:3001)
npm run build        # 本番ビルド
npm run lint         # ESLint
```

ポートは `3001`（`client/` の `3000` と被らないように）。

## アーキテクチャ

- **利用者は作成者本人のみ** — 認証なし、Cloud Run の IAM レベルで本人のみアクセス可能にする運用
- **ストレージ: Firestore**（Spark プラン無料枠内、Cloud Run と同じ GCP プロジェクト）
- **Word Wrangler 本体との API 連携は Phase 2 で別ワークストリーム**

データモデル（Phase 1 想定）:

- `Wordbook`: `id` / `name` / `language` (`ja` | `en`) / `createdAt` / `updatedAt`
- `Word`: `id` / `wordbookId` / `text` / `createdAt` / `usageCount` (default 0、Phase 2 で `FieldValue.increment(1)` する想定)

## 環境変数（`.env.local`）

- 未設定（PR-1 時点）。Firestore 接続パラメータと Emulator 設定は PR-2 で追加予定

## デプロイ

PR-1 時点では未配備。PR-4 で `.github/workflows/deploy-wordbook.yml` を新設して Cloud Run（`asia-northeast1`、非公開）に自動デプロイする計画。詳細は `.steering/2026-05-23/wordbook-service-mvp/plan.md`。
