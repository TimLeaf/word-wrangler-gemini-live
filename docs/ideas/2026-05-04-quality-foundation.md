# Quality Foundation: テスト & CI/CD 整備

作成日: 2026-05-04
最終更新: 2026-05-23
slug: quality-foundation
関連: [`2026-05-18-i18n-japanese.md`](./2026-05-18-i18n-japanese.md), [`2026-05-18-wordbook-service.md`](./2026-05-18-wordbook-service.md)

## 進捗サマリ（2026-05-23 時点）

- ✅ **PR CI 整備**（`.github/workflows/ci.yml`）：client は `eslint` + `vitest` + `next build`、server は `ruff` + `pytest`。`dorny/paths-filter` で変更があった側のみ実行
- ✅ **client UT の足場作り**：Vitest 導入。INV-4 `detectWordGuess`、INV-3 `useGameState` の UT 実装済み（5 ファイル / 25 ケース）
- ✅ **server UT の足場作り**：pytest 導入。純粋ロジック層の UT を整備
- ✅ **client 自動デプロイ**：main マージで GitHub Actions → Cloud Run（`asia-northeast1`）。Workload Identity Federation で keyless 認証。サービスは非公開（`roles/run.invoker` を本人のみ）。詳細は `.steering/2026-05-07/client-deploy-to-gcp/`
- ✅ **server 自動デプロイ**：main マージで GitHub Actions → Pipecat Cloud（`.github/workflows/deploy-server.yml`、`uv run pcc deploy --yes`）。認証は PAT (`PIPECAT_TOKEN`)、secret_set は手動運用。詳細は `.steering/2026-05-16/server-auto-deploy-to-pcc/`
- ✅ **server `ty` 型チェック導入**（2026-05-20）：CI に `uv run ty check` を追加
- ✅ **INV-3 `BotStoppedSpeaking` dedup テスト**：`useFirstBotStoppedSpeaking.test.ts` で 4 ケースカバー（`WordWrangler.tsx` からフック切り出し済み）
- ✅ **`api/start` 入力バリデーション**（2026-05-20）：不正 JSON / 非オブジェクト / 未知 personality を 400 で拒否、UT 6 ケース
- ✅ **Branch Protection 必須チェック化**（2026-05-22）：`main` で client / server CI を required、strict mode + admin enforce
- ✅ **デプロイ後ヘルスチェック**（2026-05-23, PR #47）：`deploy-server.yml` で `pcc agent status` の Active Deployment ID 前後比較 + `Ready` 検証
- ✅ **Renovate 導入**（2026-05-22）：週次（金曜 9am JST）で minor/patch を自動 PR、major は別ラベル運用。既知不具合の pin ルール込み（`@pipecat-ai/client-react <1.5.0` / `eslint <10`）
- ⏳ **未着手**：パイプライン統合テスト
- ⏸️ **保留**：E2E スモーク（実 Daily ルーム利用料が発生、個人プロジェクトとしては優先度低と判断）

## プロダクトビジョン

Word Wrangler が機能追加・ライブラリ更新・リファクタを経ても、「今動いているユーザー体験は壊れていない」と自動的に確信できる状態を作る。手動テストやレビュー時の目視確認に頼らず、PR の段階でリグレッションを検知し、main マージから本番反映までを安全に自動化する。

## 解決したい課題

- ~~現状 `server/` `client/` ともにテストが 0 件~~ → Vitest / pytest を導入し、純粋ロジック層の UT を整備済み。引き続きカバレッジ拡大が課題
- 一番怖いのは **既存機能の破壊**、特に「デプロイ後に音声が出ない」など、ユーザーがアプリを開いた瞬間に体験するレベルのリグレッション
- ~~既存の `.github/workflows/` はビルド / Lint / テストの CI が未整備~~ → PR CI 整備済み（client: eslint + vitest + build、server: ruff + ty + pytest）。残課題はパイプライン統合テスト
- デプロイは **client 側のみ自動化済み**（Cloud Run）。server 側は依然として手動で、main マージ後の反映漏れやプロトコル不整合のリスクが残る
- Pipecat + Gemini Live は非決定的なリアルタイム系のため、UT カバレッジを盲目的に追うのではなく、**層ごとに目的を分けた現実的な戦略**が必要

## 主要機能の候補

レイヤを 4 層に分け、コスパが高い順に整備する。

- **純粋ロジック層の UT** ✅ 着手済み（拡大中）
  - server: プロンプト組み立て、お題リスト管理、ゲーム状態遷移などの純粋関数
  - client: `detectWordGuess`、`useGameState`、`useFirstBotStoppedSpeaking` (INV-3 dedup)、`app/api/start/route.ts` (入力バリデーション) を実装済み
- **パイプライン統合テスト（中優先）** ⏳ 未着手
  - Pipecat の `PipelineRunner` をモック音声フレームで回し、フレームの流れと状態遷移を検証
  - Gemini Live 自体はモック化し、応答内容ではなく「呼ばれ方」を assert
- **E2E スモーク（低頻度・高シグナル）** ⏸️ 保留
  - 実 Daily ルームを立てて 1 ターン回す
  - PR ごとではなく nightly または手動トリガーで実行
  - 個人プロジェクトとしては Daily 利用料の費用対効果が薄く、当面は実装しない判断（必要性が出たら別ワークストリームで起動）
- **PR CI** ✅ 完了
  - server: `ruff` / `ty` / `pytest` 稼働中
  - client: `eslint` / `vitest` / `next build` 稼働中。専用 `tsc` ステップは未追加（`next build` で型チェックは走る）
  - GitHub Branch Protection で `Client (Next.js)` / `Server (Pipecat / Python)` を required（strict mode + admin enforce, 2026-05-22）
- **自動デプロイ（main マージ時）**
  - client → Cloud Run ✅ 完了（`.github/workflows/deploy-client.yml`、Workload Identity Federation、非公開）
  - server → Pipecat Cloud ✅ 完了（`.github/workflows/deploy-server.yml`、PAT 認証、`uv run pcc deploy --yes`）
  - client / server は別ワークフローで運用（変更頻度と失敗時影響範囲が異なるため）
- **デプロイ後ヘルスチェック** ✅ 完了（2026-05-23, PR #47）
  - `deploy-server.yml` で deploy 前後の `pcc agent status word-wrangler` を比較し、Active Deployment ID の変化 + `Ready` 表示を検証
  - 失敗時は workflow を fail（自動ロールバックは PCC 機能依存、必要になれば別タスク）
  - 当初候補だった `pcc agent deployments` は flaky なため不採用

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

- **Renovate 導入** ✅ 完了（2026-05-22）
  - 週次（金曜 9am JST）で minor/patch を自動 PR、major は `major` ラベルで分離
  - 対象: client (`package.json`)、server (`uv.lock`)、GitHub Actions (`.github/workflows/`)
  - Mend ダッシュボード `mode=auto`、`renovate.json` で既知不具合の pin（`@pipecat-ai/client-react <1.5.0` / `eslint <10`）
- **更新検証チェックリストの自動化**
  - 既存 PR CI（lint / UT / build）を最低ラインに
  - パイプライン統合テストと E2E スモーク（未着手）が揃うと「更新 PR をマージしても壊れていない確証」が得られる
- **アップストリーム監視との統合**
  - 既存 `watch-upstream.yml`（pipecat-examples 上流監視）と並列で、依存ライブラリの release 動向も Issue 化する余地

### 新規 idea との関係

- **idea A（多言語）**: 文字列処理・正規表現が増える → UT で守る範囲が広がる
- **idea B（単語帳サービス）**: モノレポに 3 つ目のサービスが増える → CI の paths-filter / デプロイワークフローの設計を最初から品質基盤と整合させる

### 残タスクとの統合

- ✅ Renovate 導入と運用ルール策定（2026-05-22）
- ⏳ パイプライン統合テストを「ライブラリ更新時の検証手段」として位置付ける（残タスク）
- ⏸️ E2E スモークは費用対効果が薄く保留判断
