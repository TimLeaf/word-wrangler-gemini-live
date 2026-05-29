# 不変条件 (Invariants)

このドキュメントは、Word Wrangler のコードベースで **「常に成り立っていなければならない約束事」** を集約する。新しい機能追加・リファクタ・依存ライブラリ更新の際は、ここに書かれた約束を破っていないかをまず確認すること。**UT を書く際は、ここに挙げた項目を最優先でカバーする。**

---

## INV-1: `runner_args.body` のスキーマ整合（client ⇄ server）

### 約束
クライアントが `/api/start` 経由でサーバに送る JSON の **`body` フィールドの構造**と、サーバが `runner_args.body` から読み出すキーの集合は、完全に一致しなければならない。

### 現状の実装
- **client**: `client/src/app/api/start/route.ts:78-86`
  ```ts
  body: JSON.stringify({
    createDailyRoom: true,
    dailyRoomProperties: { start_video_off: true },
    body: { personality, language },
  })
  ```
- **server**: `server/bot.py:152-157`
  ```python
  config: dict[str, Any] = runner_args.body or {}
  personality = config.get("personality", "witty")
  language = _resolve_language(config.get("language", "en"))
  ```

### なぜ壊れやすいか
- 片方だけ変更しても、もう片方が古いキーを参照し続けるとサイレントに既定値（`personality` → `"witty"`、`language` → `"en"`）にフォールバックする
- 型エラーにもならず、ランタイムにも例外が出ないため、発覚が遅れる

### UT 観点
- `route.ts` のレスポンス（≒ サーバへ送る body）のスキーマ snapshot テスト
- `bot.py` の `run_bot` に渡す `runner_args.body` のキー一覧を、テスト用の固定 dict と照合

---

## INV-2: `PERSONALITY_PRESETS` キー集合の一致

### 約束
クライアントが UI で選ばせる personality の選択肢（=サーバへ送る値）は、サーバの `PERSONALITY_PRESETS` のキーに含まれなければならない。

### 現状の実装
両者ともに `friendly | professional | enthusiastic | thoughtful | witty` の 5 種類。
- **client**: `client/src/types/personality.ts:1-7`（`PersonalityType` union）
- **server**: `server/bot.py:127`（`PERSONALITY_PRESETS`。i18n 化で `dict[str, dict[str, str]]` の **言語ごとにネストした** 構造になっており、`PERSONALITY_PRESETS[language][personality]` で引く）

### なぜ壊れやすいか
- どちらかに新キーを追加すると、片方が知らない値を送る/受け取ることになる
- サーバは未知キーを受け取ると言語選択後の `personality_presets["friendly"]` にフォールバックする（`bot.py:159-160`）ため、ユーザの意図した personality が反映されない事故が起きる

### UT 観点
- 両者のキー集合が一致することを cross-check するテスト（client と server を同じテストで読み込めないため、定数を共通の JSON や YAML に抽出するリファクタ余地あり。今は最低限、両側で「期待キー集合」を持つテストを書く）

---

## INV-3: ゲーム開始トリガー（サーバの初回挨拶 → クライアントのタイマー開始）

### 約束
ゲームのスコアタイマーは、**サーバ側のボットが初回の挨拶を喋り終わったタイミングで開始**しなければならない。これより早く開始するとユーザーが不利になり、遅く開始するとボットが早口になるなど UX が崩れる。

### 現状の実装
- **server**: 挨拶文は言語ごとに `INTRO_PHRASES`（`server/bot.py:35`）に定義し、`GAME_PROMPTS`（`bot.py:54`）冒頭でこれを一字一句発話するよう Gemini に指示する。en の文言:
  > "Welcome to Word Wrangler! I'll try to guess the words you describe. Remember, don't say any part of the word itself. Ready? Let's go!"
- 加えて `MuteUntilFirstBotCompleteUserMuteStrategy`（`bot.py:192`、`LLMUserAggregatorParams.user_mute_strategies` に渡す）で、挨拶中はユーザー音声をミュート
- **client**: `useFirstBotStoppedSpeaking` フック（`client/src/hooks/useFirstBotStoppedSpeaking.ts`）が `RTVIEvent.BotStoppedSpeaking` の **初回発火だけ** を捕捉して `startGame()` を呼ぶ。`WordWrangler.tsx:109-113` で購読（`enabled` は `WAITING_FOR_INTRO` のときのみ、`resetKey=isConnected` で再接続時にリセット）。`startGame`（`WordWrangler.tsx:132`）は `useGameState.initializeGame()` を **await** してから `gameTimer.startTimer()` を呼ぶ
- **ゲーム初期化はこの `startGame` 経由のみ**。マウント時に先回りで `initializeGame()` を呼ぶ実装は PR #63 で撤去した（PR-2 で `initializeGame` が `/api/words` フェッチで非同期化された結果、解決後の `setGameState(ACTIVE)` が `WAITING_FOR_INTRO` を上書きし、「挨拶前に単語が表示される」「タイマーが `startTimer` 経由で開始されずカウントダウンが動かない」不具合を起こしたため）

### なぜ壊れやすいか
- サーバ側の `GAME_PROMPTS` から「最初に挨拶する」指示（`INTRO_PHRASES` 発話）を消すと、クライアントは永遠に `WAITING_FOR_INTRO` のまま
- `useFirstBotStoppedSpeaking` の「初回だけ」ロジックや `resetKey` を変更すると、2 回目以降の `BotStoppedSpeaking` でもタイマーが再起動してしまう可能性
- `WAITING_FOR_INTRO` を経由せずに（例: マウント時や別経路で）`gameState` を `ACTIVE` にすると、`startGame` を通らないため `gameTimer.startTimer()` が呼ばれず、単語表示とタイマーが乖離する（上記 PR #63 の不具合と同型）
- パイプラインから user_aggregator のミュート戦略を外すと、挨拶中にユーザー音声が割り込み、ボットの挨拶が途切れて `BotStoppedSpeaking` が早すぎるタイミングで発火する

### React 補足（不慣れな方向け）
- `useFirstBotStoppedSpeaking` は内部で `useRef` を「初回かどうかのフラグ」に使い、`resetKey` が変わるとフラグを戻す（切断→再接続で再び 1 回だけ発火できる）
- `useRTVIClientEvent` は Pipecat の React 統合で、サーバから来るイベントを購読する hook（subscribe → イベント時にコールバックを呼ぶ）

### UT 観点
- `useGameState` の状態遷移単体テスト（`initializeGame` で `ACTIVE` 化、`/api/words` 取得とフォールバック。`client/src/hooks/useGameState.test.ts`）
- `BotStoppedSpeaking` イベントを 2 回連続で発火しても `startGame` が 1 回しか呼ばれないことの統合テスト（モックイベント）

---

## INV-4: `TRANSCRIPT_PATTERNS.GUESS_PATTERN` と `game_prompt` の応答形式の整合

### 約束
クライアントの正解判定は、ボットの応答が **`Is it [guess]?` 形式**であることに依存している。サーバ側のシステムプロンプトはこの形式で答えるよう Gemini に明示的に指示しなければならない。

### 現状の実装
i18n 化で、推測フレーズも正規表現も **言語ごと** に分かれている。
- **server**: 推測フレーズは `CANONICAL_GUESS_PHRASES`（`server/bot.py:48`、en = `"Is it [your guess]?"`、ja = `"答えは「[あなたの推測]」ですか？"`）に定義し、`GAME_PROMPTS` 内（en は `bot.py:69`）でこの定型文で答えるよう指示
- **client**: `client/src/constants/gameConstants.ts:106-109` の `GUESS_PATTERNS`（言語別）
  ```ts
  export const GUESS_PATTERNS = {
    en: /is it [""]?([^""?]+)[""]?(?:\?)?|is it (?:a|an) ([^?]+)(?:\?)?/i,
    ja: /答えは[「『"]?([^」』"？?。、]+?)[」』"]?\s*(?:ですか[？?。]?|か[？?])/,
  } as const;
  ```
  （`TRANSCRIPT_PATTERNS.GUESS_PATTERN` は en パターンへの後方互換エイリアス、`gameConstants.ts:112-114`）
- **client (使用箇所)**: `client/src/utils/wordDetection.ts:10-16`（`detectWordGuess`、`GUESS_PATTERNS[language]` を選択）

### なぜ壊れやすいか
- `CANONICAL_GUESS_PHRASES` と `GUESS_PATTERNS` は **言語ごとに対**になっている。片方の言語だけ文言/正規表現を変えると、その言語で明示推測がマッチせずフォールバック（トランスクリプトに単語が含まれているかの単純チェック）に丸投げされる
- プロンプトを「My guess is X」のような別形式に変更しても同様にマッチしなくなる
- LLM のモデル更新で、指示通りの形式を守らなくなる可能性もある（これは UT では検知できない、E2E スモークの守備範囲）

### UT 観点
- `detectWordGuess(transcript, targetWord)` への代表入力でのスナップショット:
  - `Is it apple?` + target=`apple` → `isCorrect=true, isExplicitGuess=true`
  - `Is it an elephant?` + target=`elephant` → `isCorrect=true, isExplicitGuess=true`（冠詞 `an` の除去）
  - `Is it "banana"?` + target=`banana` → `isCorrect=true`（引用符の除去）
  - `Is it cat?` + target=`dog` → `isCorrect=false, isExplicitGuess=true, guessedWord='cat'`
  - `I think the word might be apple.` + target=`apple` → `isCorrect=true, isExplicitGuess=false`（フォールバック）

---

<!--
"Known doc drift" セクションは 2026-05-06 にすべて修正済み。
詳細は `.steering/2026-05-06/server-claude-md-doc-drift-fix/` 参照。
-->

