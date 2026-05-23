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
npm test             # vitest run
```

ポートは `3001`（`client/` の `3000` と被らないように）。

### ローカル開発（Firestore Emulator）

```bash
# 1 つ目のターミナル: Firestore Emulator を起動
# パッケージ名は firebase-tools（"firebase" は JS SDK で CLI 無し）
npx firebase-tools emulators:start --only firestore

# 2 つ目のターミナル: dev サーバを emulator に接続して起動
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run dev
```

`FIRESTORE_EMULATOR_HOST` が設定されていれば `@google-cloud/firestore` SDK は自動で emulator に接続する。本番 Cloud Run では未設定 → ADC で実 Firestore（database `wordbook`）に接続。

## アーキテクチャ

- **利用者は作成者本人のみ** — 認証なし、Cloud Run の IAM レベルで本人のみアクセス可能にする運用
- **ストレージ: Firestore**（Spark プラン無料枠内、Cloud Run と同じ GCP プロジェクト）
- **Word Wrangler 本体との API 連携は Phase 2 で別ワークストリーム**

データモデル:

- `wordbooks/{id}`: `name` / `language` (`ja` | `en`) / `isDefault?: boolean` / `createdAt` / `updatedAt`
  - `isDefault` は高々 1 件のみ true。`setDefaultWordbook` が batch で他の `isDefault` を clear して相互排他を維持する
- `wordbooks/{id}/words/{wordId}`（**サブコレクション**）: `text` / `createdAt` / `usageCount` (default 0)
  - 親 doc 削除時に Firestore は subcollection を自動削除しない → `deleteWordbook` で `deleteAllWordsIn` を呼んでバッチカスケード削除する
  - Phase 2 で Word Wrangler が低使用順に取得する想定：`wordbooks/{id}/words` を `orderBy("usageCount", "asc")` で取得。サブコレクションの単一フィールドは Firestore が自動で index 作成するため index 設定不要

ルーティング:

- `/` — デフォルト単語帳が設定されていれば `/wordbooks/{defaultId}` にリダイレクト、未設定なら `/wordbooks` にリダイレクト（入口の振り分け専用）
- `/wordbooks` — 単語帳一覧（作成・削除・名前変更・デフォルト切替）
- `/wordbooks/[id]` — 単語帳詳細（単語の追加・編集・削除）

## 環境変数

- `FIRESTORE_EMULATOR_HOST` — 設定時は SDK が自動で emulator に接続。ローカル開発専用
- `GOOGLE_CLOUD_PROJECT` — 本番（Cloud Run）では runtime に自動付与。ローカルで実 Firestore に繋ぐ場合のみ手動指定
- `FIRESTORE_PROJECT_ID` — 上記が無い場合のフォールバック

## データレイヤ

- Firestore データベース ID: `wordbook`（`(default)` ではない別 DB、論理分離のため）
- ルートコレクション: `wordbooks`、サブコレクション: `wordbooks/{id}/words`
- 永続化は `src/lib/wordbooks.ts` / `src/lib/words.ts` の関数を経由する。Server Actions (`src/app/actions.ts`) からのみ呼ばれる前提

## Server Actions

CRUD は `src/app/actions.ts` の `"use server"` 関数で実装。Client Component から `<form action={fn}>` または `useActionState` で呼ぶ。Phase 2 で Word Wrangler が叩く GET エンドポイントだけ Route Handler を別途追加する想定。

## デプロイ

PR-1 時点では未配備。PR-4 で `.github/workflows/deploy-wordbook.yml` を新設して Cloud Run（`asia-northeast1`、非公開）に自動デプロイする計画。詳細は `.steering/2026-05-23/wordbook-service-mvp/plan.md`。
