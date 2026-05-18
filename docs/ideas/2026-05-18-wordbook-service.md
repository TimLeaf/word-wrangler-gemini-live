# カスタム単語帳サービス

作成日: 2026-05-18
slug: wordbook-service
関連: [`2026-05-18-i18n-japanese.md`](./2026-05-18-i18n-japanese.md), [`2026-05-04-quality-foundation.md`](./2026-05-04-quality-foundation.md)

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

## 段階計画（案）

1. **Phase 0**: idea A（多言語）で `language` 概念を client に導入
2. **Phase 1**: 単語帳 MVP（自分専用、認証なし or シンプル）。Word Wrangler は引き続きハードコードリストを使う
3. **Phase 2**: Word Wrangler と API 連携。設定で単語帳選択可能に
4. **Phase 3**: 共有・公開機能、複数ユーザー対応

## 次のアクション

1. 論点 1（モノレポ配置）と論点 2（バックエンド選定）を実装プラン段階で決める
2. idea A の `language` 設計と整合させる
3. MVP のデータモデルと API 契約をスケッチ
