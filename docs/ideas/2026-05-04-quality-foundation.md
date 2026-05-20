# Quality Foundation: テスト & CI/CD 整備

作成日: 2026-05-04
最終更新: 2026-05-18
slug: quality-foundation
関連: [`2026-05-18-i18n-japanese.md`](./2026-05-18-i18n-japanese.md), [`2026-05-18-wordbook-service.md`](./2026-05-18-wordbook-service.md)

## 進捗サマリ（2026-05-16 時点）

- ✅ **PR CI 整備**（`.github/workflows/ci.yml`）：client は `eslint` + `vitest` + `next build`、server は `ruff` + `pytest`。`dorny/paths-filter` で変更があった側のみ実行
- ✅ **client UT の足場作り**：Vitest 導入。INV-4 `detectWordGuess`、INV-3 `useGameState` の UT 実装済み（5 ファイル / 25 ケース）
- ✅ **server UT の足場作り**：pytest 導入。純粋ロジック層の UT を整備
- ✅ **client 自動デプロイ**：main マージで GitHub Actions → Cloud Run（`asia-northeast1`）。Workload Identity Federation で keyless 認証。サービスは非公開（`roles/run.invoker` を本人のみ）。詳細は `.steering/2026-05-07/client-deploy-to-gcp/`
- ✅ **server 自動デプロイ**：main マージで GitHub Actions → Pipecat Cloud（`.github/workflows/deploy-server.yml`、`uv run pcc deploy --yes`）。認証は PAT (`PIPECAT_TOKEN`)、secret_set は手動運用。詳細は `.steering/2026-05-16/server-auto-deploy-to-pcc/`
- ⏳ **未着手**：`ty`、パイプライン統合テスト、E2E スモーク、デプロイ後ヘルスチェック、INV-3 の `WordWrangler.tsx` BotStoppedSpeaking dedup テスト、Branch Protection の必須チェック化
- ⏳ **新規追加スコープ（2026-05-18）**：ライブラリ更新を安全に回せる体制（Dependabot/Renovate、定期更新フロー）。下記「ライブラリ更新を支える」節を参照

## プロダクトビジョン

Word Wrangler が機能追加・ライブラリ更新・リファクタを経ても、「今動いているユーザー体験は壊れていない」と自動的に確信できる状態を作る。手動テストやレビュー時の目視確認に頼らず、PR の段階でリグレッションを検知し、main マージから本番反映までを安全に自動化する。

## 解決したい課題

- ~~現状 `server/` `client/` ともにテストが 0 件~~ → Vitest / pytest を導入し、純粋ロジック層の UT を整備済み。引き続きカバレッジ拡大が課題
- 一番怖いのは **既存機能の破壊**、特に「デプロイ後に音声が出ない」など、ユーザーがアプリを開いた瞬間に体験するレベルのリグレッション
- ~~既存の `.github/workflows/` はビルド / Lint / テストの CI が未整備~~ → PR CI 整備済み。`ty` / 型チェックの拡充と、パイプライン統合テストが残課題
- デプロイは **client 側のみ自動化済み**（Cloud Run）。server 側は依然として手動で、main マージ後の反映漏れやプロトコル不整合のリスクが残る
- Pipecat + Gemini Live は非決定的なリアルタイム系のため、UT カバレッジを盲目的に追うのではなく、**層ごとに目的を分けた現実的な戦略**が必要

## 主要機能の候補

レイヤを 4 層に分け、コスパが高い順に整備する。

- **純粋ロジック層の UT** ✅ 着手済み（拡大中）
  - server: プロンプト組み立て、お題リスト管理、ゲーム状態遷移などの純粋関数
  - client: `detectWordGuess`、`useGameState` を実装済み。残り: `WordWrangler.tsx` の BotStoppedSpeaking dedup、`app/api/start/route.ts` の入力バリデーション
- **パイプライン統合テスト（中優先）** ⏳ 未着手
  - Pipecat の `PipelineRunner` をモック音声フレームで回し、フレームの流れと状態遷移を検証
  - Gemini Live 自体はモック化し、応答内容ではなく「呼ばれ方」を assert
- **E2E スモーク（低頻度・高シグナル）** ⏳ 未着手
  - 実 Daily ルームを立てて 1 ターン回す
  - PR ごとではなく nightly または手動トリガーで実行
- **PR CI** ✅ 完了（拡張余地あり）
  - server: `ruff` / `pytest` 稼働中。`ty` 追加が残課題
  - client: `eslint` / `vitest` / `next build` 稼働中。専用 `tsc` ステップは未追加（`next build` で型チェックは走る）
  - 既に PR ごとに走るが、GitHub Branch Protection の「必須チェック」化はまだ
- **自動デプロイ（main マージ時）**
  - client → Cloud Run ✅ 完了（`.github/workflows/deploy-client.yml`、Workload Identity Federation、非公開）
  - server → Pipecat Cloud ✅ 完了（`.github/workflows/deploy-server.yml`、PAT 認証、`uv run pcc deploy --yes`）
  - client / server は別ワークフローで運用（変更頻度と失敗時影響範囲が異なるため）
- **デプロイ後ヘルスチェック** ⏳ 未着手
  - bot 起動 → Daily ルーム作成 → 初回挨拶までを smoke check
  - 失敗時は自動ロールバック or 通知

## ターゲットユーザー

- **私（作成者自身）**。Word Wrangler の保守と機能追加を 1 人で進めるオーナー兼エンジニア
- 想定状況: 新機能を追加するたびに「ゲーム開始トリガーは壊れていないか」「`runner_args.body` のクライアント / サーバ整合は崩れていないか」を毎回手で確認するのが負担になっている。安心して機能追加に集中できる土台が欲しい

## ライブラリ更新を支える（2026-05-18 追加）

新規 idea（多言語対応 / 単語帳サービス）に取り組むほど、依存ライブラリ（`next`, `react`, `pipecat`, `google-genai`, `@pipecat-ai/client-js` など）の更新を取り込み続ける必要性が増す。**テスト基盤の目的に「ライブラリ更新を安全に回せる」を明示的に追加**する。

### 課題

- 現状は更新タイミングが属人的（気付いたときに手動）
- 更新で「音声が出ない」「ゲーム開始トリガーが壊れる」といったリアルタイム系のリグレッションを踏んでも、PR 段階で検知できない
- `pipecat` / `google-genai` は破壊的変更が比較的多い

### 取り組み候補

- **Dependabot or Renovate 導入**
  - 週次で minor/patch を自動 PR
  - major は手動レビュー前提で別ルール
  - 対象: client (`package.json`)、server (`uv.lock`)、GitHub Actions (`.github/workflows/`)
- **更新検証チェックリストの自動化**
  - 既存 PR CI（lint / UT / build）を最低ラインに
  - パイプライン統合テストと E2E スモーク（未着手）が揃うと「更新 PR をマージしても壊れていない確証」が得られる
- **アップストリーム監視との統合**
  - 既存 `watch-upstream.yml`（pipecat-examples 上流監視）と並列で、依存ライブラリの release 動向も Issue 化する余地

### 新規 idea との関係

- **idea A（多言語）**: 文字列処理・正規表現が増える → UT で守る範囲が広がる
- **idea B（単語帳サービス）**: モノレポに 3 つ目のサービスが増える → CI の paths-filter / デプロイワークフローの設計を最初から品質基盤と整合させる

### 残タスクとの統合

「未着手」リストに以下を追加：
- Dependabot or Renovate の導入と運用ルール策定
- パイプライン統合テスト / E2E スモークを「ライブラリ更新時の検証手段」として位置付ける
