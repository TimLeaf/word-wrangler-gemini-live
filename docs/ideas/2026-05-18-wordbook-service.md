# カスタム単語帳サービス

作成日: 2026-05-18
最終更新: 2026-05-23（Phase 1 MVP 完了）
slug: wordbook-service
関連: [`2026-05-18-i18n-japanese.md`](./2026-05-18-i18n-japanese.md), [`2026-05-04-quality-foundation.md`](./2026-05-04-quality-foundation.md)

## 進捗サマリ（2026-05-23 時点）

- ✅ **Phase 1 MVP**: `wordbook/` を Cloud Run（`asia-northeast1`、非公開）に配備。自分専用・認証なし・ja/en 両対応・Firestore（database `wordbook`）。詳細は `.steering/2026-05-23/wordbook-service-mvp/`
  - PR #51 scaffolding / #52 Firestore + Wordbook CRUD（Server Actions）/ #53 単語 CRUD + デフォルト単語帳機能 / #54 Cloud Run デプロイ / #55 Server Actions proxy CSRF fix
  - 単語帳 CRUD、単語 CRUD、★ デフォルト単語帳機能、`/` がデフォルトへの誘導
- ⏳ **Phase 2**: Word Wrangler 本体との API 連携 + `usageCount` 増分（未着手、必要になったタイミングで steering 起こす）
- ⏸️ **Phase 3**: 共有・公開・複数ユーザー対応（保留）

## プロダクトビジョン

ユーザーが**自分の単語帳**を登録・管理できる独立サービスを作り、API 経由で Word Wrangler に単語を供給できるようにする。誕生日パーティーの内輪ネタ、英会話学校の語彙テスト、子供向けの平仮名単語など、**コンテキストに合わせた単語セット**でゲームを遊べる状態にする。

## 解決したい課題

- 現状の単語は `client/src/data/wordWranglerWords.ts` にハードコード（Easy 100 / Medium 300 / Hard 100）。バリエーションが固定で、ユーザーが自分用に追加できない
- 単語の追加・編集にコード変更とデプロイが必要 → 非エンジニアは触れない
- 多言語化（idea A）と組み合わせると、言語 × 難易度 × ユースケースで組み合わせ爆発。ハードコードでは限界
- スマホで「思いついた単語をその場で追加」する用途に対応できない

## スコープ

### 単語帳側（新規）

- **モノレポに追加**：`wordbook/` 配下に独立アプリとして配置
  - フロント（Next.js または別フレームワーク）+ バックエンド API
  - Word Wrangler client/server とはコードを共有せず、HTTP 契約のみで結合
- **データモデル（最小）**
  - `Wordbook`: id, owner, name, language, visibility (private/public/shared)
  - `Word`: id, wordbook_id, text, difficulty?, tags?
- **機能（MVP）**
  - 単語帳の作成・名前変更・削除
  - 単語の追加・編集・削除（スマホで素早く打てる UI）
  - 単語帳の一覧 / 詳細表示
- **認証**
  - Google OAuth（client 側で既に Google アカウントを使っている前提と揃える）
- **API**
  - `GET /api/wordbooks/:id/words?language=ja&limit=30` を Word Wrangler が叩く想定
  - 公開単語帳 / 共有単語帳の取得経路

### Word Wrangler 側（拡張）

- 設定画面で「使用する単語帳」を選択可能に
- 未選択時は従来通り `wordWranglerWords.ts` をフォールバック
- API 失敗時のフォールバック挙動を明示

### スマホフレンドリーな UI

- タップで単語追加、長押しで編集、スワイプで削除
- オフラインでも入力 → オンライン復帰時に同期 ができると理想

## 主要な論点

### 論点 1: モノレポ内の配置

`client/` `server/` と並列に `wordbook/` を置くのが素直。ただし以下を決める必要あり：
- CI: 既存 `ci.yml` の paths-filter に `wordbook/**` を追加。`dorny/paths-filter` で独立実行
- デプロイ: client と同じ Cloud Run? 別 Cloud Run サービス?
- 共通の型定義（`Word`, `Wordbook`）をどこに置くか（`packages/shared/` を新設する案）

### 論点 2: バックエンド技術選定（未確定）

| 案 | Pros | Cons |
|---|---|---|
| **Firestore (BaaS)** | サーバ実装ほぼ不要、認証も Firebase Auth で楽 | ベンダーロック、複雑なクエリが弱い |
| **Supabase** | Postgres + Auth + RLS、SQL の柔軟性 | セルフホスト or 別 SaaS の運用負担 |
| **Cloud Run + 自前 API + Cloud SQL** | 既存 GCP インフラと整合、完全制御 | 実装コスト最大 |

### 論点 3: 認証戦略

- Word Wrangler 本体は現状ほぼ認証なし（Cloud Run の IAM レベルで本人のみ）
- 単語帳は **複数ユーザーが使う前提**になり得る → Google OAuth 導入が現実的
- Word Wrangler 側もログイン化するか、無認証のまま「公開単語帳のみ参照可」とするか

### 論点 4: API 契約

- Word Wrangler が API を叩くタイミング: ゲーム開始時に 30 語フェッチ? 起動時に全件キャッシュ?
- レスポンスの単語形式: `string[]` で十分か、`{ text, difficulty, tags }[]` か
- Rate limit / キャッシュ戦略

### 論点 5: idea A との関係

- 単語帳は **最初から `language` フィールド必須**
- A の「お題の出所」論点と直結 → A の中期目標が B の前提
- 順序: A 先行 → B（A の language を引き継ぐ）が自然

## ターゲットユーザー

- **私（作成者）と Word Wrangler を試してくれた友人・家族**
- 想定シナリオ
  - 子供の語彙練習用に「小学校 1 年生の漢字」単語帳を作る
  - 友人グループの内輪ネタ単語帳を共有して盛り上がる
  - 英会話レッスンの講師が生徒用の単語帳を作る

## スコープ外（MVP では入れない）

- 単語帳のマーケットプレイス / 評価機能
- 単語ごとのヒント・例文・画像
- AI による単語自動生成
- 単語帳のバージョニング / 履歴
- チーム単位の権限管理

## 既存システムへの影響

- ルート `CLAUDE.md` に `wordbook/` セクションを追加（プロジェクト構成図の更新）
- `client/` 側の「単語の出所」が変わる → `useGameState` の単語供給ロジックを差し替え可能にする
- CI / デプロイの workflow が増える → `quality-foundation` に「3 サービスをどう管理するか」観点が追加

## 段階計画

1. ✅ **Phase 0**: idea A（多言語）で `language` 概念を client に導入（完了済み）
2. ✅ **Phase 1**: 単語帳 MVP（自分専用、認証なし、Cloud Run + Firestore）。Word Wrangler は引き続きハードコードリストを使う（2026-05-23 完了）
3. ⏳ **Phase 2**: Word Wrangler と API 連携。設定で単語帳選択可能に、`usageCount` 増分
4. ⏸️ **Phase 3**: 共有・公開機能、複数ユーザー対応（個人プロジェクトとして優先度低、保留判断）

## Phase 1 確定事項（実装後の反映）

- **モノレポ配置**: `wordbook/` を `client/` `server/` と並列（論点 1 確定）
- **バックエンド**: Firestore（database `wordbook`、Spark プラン無料枠）+ Next.js 15 / React 19、Cloud Run `asia-northeast1`（論点 2 確定）
- **認証**: なし（Cloud Run の `roles/run.invoker` を本人のみで非公開化、論点 3 確定）
- **API 契約**: Phase 1 では Word Wrangler 連携をやらないため未定。Phase 2 で詰める（論点 4）
- **データモデル**:
  - `wordbooks/{id}`: `name` / `language` (`ja` | `en`) / `isDefault?: boolean` / `createdAt` / `updatedAt`
  - `wordbooks/{id}/words/{wordId}` サブコレクション: `text` / `createdAt` / `usageCount` (default 0)
- **デフォルト単語帳**: `/` を開いたらデフォルトの詳細にリダイレクト、未設定時は `/wordbooks` 一覧へ

## Phase 2 に向けたメモ

- API 契約: `GET /api/wordbooks/{id}/words?orderBy=usageCount&limit=30` を Word Wrangler の Next.js Route Handler 経由で叩く想定
- 認証: 同じ GCP プロジェクト内なので、Cloud Run 間の service-to-service 認証（identity token）で OK
- `usageCount` 増分: ゲーム終了時に `FieldValue.increment(1)` を該当 word doc に対して発行
- 着手時に `.steering/{date}/wordbook-phase2-integration/` を起こす
