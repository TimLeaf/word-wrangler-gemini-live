# Quality Foundation: テスト & CI/CD 整備

作成日: 2026-05-04
最終更新: 2026-05-09
slug: quality-foundation

## 進捗サマリ（2026-05-09 時点）

- ✅ **PR CI 整備**（`.github/workflows/ci.yml`）：client は `eslint` + `vitest` + `next build`、server は `ruff` + `pytest`。`dorny/paths-filter` で変更があった側のみ実行
- ✅ **client UT の足場作り**：Vitest 導入。INV-4 `detectWordGuess`、INV-3 `useGameState` の UT 実装済み（5 ファイル / 25 ケース）
- ✅ **server UT の足場作り**：pytest 導入。純粋ロジック層の UT を整備
- ✅ **client 自動デプロイ**：main マージで GitHub Actions → Cloud Run（`asia-northeast1`）。Workload Identity Federation で keyless 認証。サービスは非公開（`roles/run.invoker` を本人のみ）。詳細は `.steering/2026-05-07/client-deploy-to-gcp/`
- ⏳ **未着手**：server の Cloud Run 移行、`mypy`、パイプライン統合テスト、E2E スモーク、デプロイ後ヘルスチェック、INV-3 の `WordWrangler.tsx` BotStoppedSpeaking dedup テスト

## プロダクトビジョン

Word Wrangler が機能追加・ライブラリ更新・リファクタを経ても、「今動いているユーザー体験は壊れていない」と自動的に確信できる状態を作る。手動テストやレビュー時の目視確認に頼らず、PR の段階でリグレッションを検知し、main マージから本番反映までを安全に自動化する。

## 解決したい課題

- ~~現状 `server/` `client/` ともにテストが 0 件~~ → Vitest / pytest を導入し、純粋ロジック層の UT を整備済み。引き続きカバレッジ拡大が課題
- 一番怖いのは **既存機能の破壊**、特に「デプロイ後に音声が出ない」など、ユーザーがアプリを開いた瞬間に体験するレベルのリグレッション
- ~~既存の `.github/workflows/` はビルド / Lint / テストの CI が未整備~~ → PR CI 整備済み。`mypy` / 型チェックの拡充と、パイプライン統合テストが残課題
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
  - server: `ruff` / `pytest` 稼働中。`mypy` 追加が残課題
  - client: `eslint` / `vitest` / `next build` 稼働中。専用 `tsc` ステップは未追加（`next build` で型チェックは走る）
  - 既に PR ごとに走るが、GitHub Branch Protection の「必須チェック」化はまだ
- **自動デプロイ（main マージ時）**
  - client → Cloud Run ✅ 完了（`.github/workflows/deploy-client.yml`、Workload Identity Federation、非公開）
  - server → ⏳ 未着手。Cloud Run 化を検討中（Pipecat Cloud のままにする選択肢もあり、要決定）
  - client / server を 1 ワークフローで束ねるか別々にするかは、server の移行先決定後に再検討
- **デプロイ後ヘルスチェック** ⏳ 未着手
  - bot 起動 → Daily ルーム作成 → 初回挨拶までを smoke check
  - 失敗時は自動ロールバック or 通知

## ターゲットユーザー

- **私（作成者自身）**。Word Wrangler の保守と機能追加を 1 人で進めるオーナー兼エンジニア
- 想定状況: 新機能を追加するたびに「ゲーム開始トリガーは壊れていないか」「`runner_args.body` のクライアント / サーバ整合は崩れていないか」を毎回手で確認するのが負担になっている。安心して機能追加に集中できる土台が欲しい
