# 不変条件 (Invariants)

このドキュメントは、Word Wrangler のコードベースで **「常に成り立っていなければならない約束事」** を集約する。新しい機能追加・リファクタ・依存ライブラリ更新の際は、ここに書かれた約束を破っていないかをまず確認すること。**UT を書く際は、ここに挙げた項目を最優先でカバーする。**

---

## INV-1: `runner_args.body` のスキーマ整合（client ⇄ server）

### 約束
クライアントが `/api/start` 経由でサーバに送る JSON の **`body` フィールドの構造**と、サーバが `runner_args.body` から読み出すキーの集合は、完全に一致しなければならない。

### 現状の実装
- **client**: `client/src/app/api/start/route.ts:23-30`
  ```ts
  body: JSON.stringify({
    createDailyRoom: true,
    dailyRoomProperties: { start_video_off: true },
    body: { personality },
  })
  ```
- **server**: `server/bot.py:72-76`
  ```python
  config = runner_args.body
  personality = config.get("personality", "witty")
  ```

### なぜ壊れやすいか
- 片方だけ変更しても、もう片方が古いキーを参照し続けるとサイレントに既定値（`"witty"`）にフォールバックする
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
- **server**: `server/bot.py:61-67`（`PERSONALITY_PRESETS` dict）

### なぜ壊れやすいか
- どちらかに新キーを追加すると、片方が知らない値を送る/受け取ることになる
- サーバは未知キーを受け取ると `PERSONALITY_PRESETS["friendly"]` にフォールバックする（`bot.py:78`）ため、ユーザの意図した personality が反映されない事故が起きる

### UT 観点
- 両者のキー集合が一致することを cross-check するテスト（client と server を同じテストで読み込めないため、定数を共通の JSON や YAML に抽出するリファクタ余地あり。今は最低限、両側で「期待キー集合」を持つテストを書く）

---

## INV-3: ゲーム開始トリガー（サーバの初回挨拶 → クライアントのタイマー開始）

### 約束
ゲームのスコアタイマーは、**サーバ側のボットが初回の挨拶を喋り終わったタイミングで開始**しなければならない。これより早く開始するとユーザーが不利になり、遅く開始するとボットが早口になるなど UX が崩れる。

### 現状の実装
- **server**: `server/bot.py:32-58` の `game_prompt` で、ボットに以下の固定文言で挨拶させるよう指示:
  > "Welcome to Word Wrangler! I'll try to guess the words you describe. Remember, don't say any part of the word itself. Ready? Let's go!"
- 加えて `MuteUntilFirstBotCompleteUserMuteStrategy`（`bot.py:111`）で、挨拶中はユーザー音声をミュート
- **client**: `client/src/components/Game/WordWrangler.tsx:108-117` で `RTVIEvent.BotStoppedSpeaking` の **初回発火**（`botIntroCompletedRef` で 1 回目だけ捕捉）を契機に `startGame()` を呼ぶ

### なぜ壊れやすいか
- サーバ側の `game_prompt` から「最初に挨拶する」指示を消すと、クライアントは永遠に `WAITING_FOR_INTRO` のまま
- クライアント側の `botIntroCompletedRef` のロジックを変更すると、2 回目以降の `BotStoppedSpeaking` でもタイマーが再起動してしまう可能性
- パイプラインから user_aggregator のミュート戦略を外すと、挨拶中にユーザー音声が割り込み、ボットの挨拶が途切れて `BotStoppedSpeaking` が早すぎるタイミングで発火する

### React 補足（不慣れな方向け）
- `useRef` は値を保持するが再レンダーを引き起こさない箱。ここでは「初回かどうかを覚えておくフラグ」用途
- `useRTVIClientEvent` は Pipecat の React 統合で、サーバから来るイベントを購読する hook（subscribe → イベント時にコールバックを呼ぶ）

### UT 観点
- `useGameState` の状態遷移単体テスト（`WAITING_FOR_INTRO → ACTIVE` の前提条件と副作用）
- `BotStoppedSpeaking` イベントを 2 回連続で発火しても `startGame` が 1 回しか呼ばれないことの統合テスト（モックイベント）

---

## INV-4: `TRANSCRIPT_PATTERNS.GUESS_PATTERN` と `game_prompt` の応答形式の整合

### 約束
クライアントの正解判定は、ボットの応答が **`Is it [guess]?` 形式**であることに依存している。サーバ側のシステムプロンプトはこの形式で答えるよう Gemini に明示的に指示しなければならない。

### 現状の実装
- **server**: `server/bot.py:46`
  > 4. When you think you know the answer, state it clearly: "Is it [your guess]?"
- **client**: `client/src/constants/gameConstants.ts:45-49`
  ```ts
  GUESS_PATTERN:
    /is it [""]?([^""?]+)[""]?(?:\?)?|is it (?:a|an) ([^?]+)(?:\?)?/i
  ```
- **client (使用箇所)**: `client/src/utils/wordDetection.ts:6-37`

### なぜ壊れやすいか
- プロンプトを変えて「My guess is X」のような形式に変更すると、正規表現が一切マッチしなくなり、フォールバック（トランスクリプトに単語が含まれているかの単純チェック）に丸投げされる
- LLM のモデル更新で、指示通りの形式を守らなくなる可能性もある（これは UT では検知できない、E2E スモークの守備範囲）

### UT 観点
- `detectWordGuess(transcript, targetWord)` への代表入力でのスナップショット:
  - `Is it apple?` + target=`apple` → `isCorrect=true, isExplicitGuess=true`
  - `Is it an elephant?` + target=`elephant` → `isCorrect=true, isExplicitGuess=true`（冠詞 `an` の除去）
  - `Is it "banana"?` + target=`banana` → `isCorrect=true`（引用符の除去）
  - `Is it cat?` + target=`dog` → `isCorrect=false, isExplicitGuess=true, guessedWord='cat'`
  - `I think the word might be apple.` + target=`apple` → `isCorrect=true, isExplicitGuess=false`（フォールバック）

---

## 既知のドキュメント不整合（Known doc drift）

将来 CLAUDE.md を更新するときに直すべき箇所:

- `server/CLAUDE.md` の「Pipecat パイプライン」図に `RTVIProcessor` と `STTMuteFilter` が個別 processor として書かれているが、実際の `bot.py:116-124` では:
  - パイプラインは `transport.input() → user_aggregator → llm → transport.output() → assistant_aggregator` の 5 段
  - RTVI は `task.rtvi`（PipelineTask の属性）経由で扱われる
  - ミュート機能は `user_aggregator` 内の `MuteUntilFirstBotCompleteUserMuteStrategy` として実装されている（`STTMuteFilter` という processor は存在しない）
- `server/CLAUDE.md` に `LocalSmartTurnAnalyzerV3` と `SileroVADAnalyzer(stop_secs=0.2)` の言及があるが、現行 `bot.py` では Smart Turn Analyzer は使われておらず、VAD は `SileroVADAnalyzer()`（デフォルト引数）

この不整合自体は invariant ではないが、UT を書く際の参照情報として混乱の元になるので、quality-foundation の作業の一環として `server/CLAUDE.md` の該当箇所を更新することを推奨。
