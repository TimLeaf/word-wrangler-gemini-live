> [!WARNING]
> This is ARCHIVED. See the [`pipecat-examples` repo](https://github.com/pipecat-ai/pipecat-examples/tree/main/word-wrangler-gemini-live) for the latest Gemini Live demos.


# Word Wrangler

「Word Wrangler」は、PipecatとGemini Live APIを活用した音声ベースの単語当てゲーム(ウェブベースアプリ)

## Web-Based Game Modes

あなたが単語を提示し、AIプレイヤーがその説明をもとにその単語を当てるというゲーム

## Game Rules

1. このウェブアプリでは、説明する単語が表示される
2. その単語のどの部分も口に出さずに、その単語を説明してください
3. AIプレイヤーが、あなたの説明をもとにその単語を当てようとする
4. アプリが自動的に正解を確認し、スコアを記録する
5. 「スキップ」をクリックすると、次の単語に進む
6. 60秒間でできるだけ多くのポイントを獲得する

## Architecture

このWebゲームは、シンプルな直線的なフローを採用している：

1. **Transport Input** - Daily WebRTCトランスポートを介して、Webブラウザから音声を受信する
2. **RTVIProcessor** - RTVIは、音声AIの分野におけるクライアント／サーバー間通信の標準規格です。このプロセッサはサーバー側の情報を収集し、クライアントが利用できるようにする。さらに、クライアントはサーバーにイベントを送信することができ、これらはこのプロセッサを通じて処理される
3. **STTMuteFilter** - 特定の条件下で音声をフィルタリングする。このゲームでは、ユーザーの最初の音声が「ミュート」され、ボットが中断されることなく最初のメッセージ全体を確実に送信できるようにする
4. **User Context Aggregator** - 会話のコンテキストの一部として、ユーザーのメッセージを集約する
5. **LLM** - LLMは、AIプレイヤーの対話機能を支えている
6. **Transport Output** - Daily WebRTCトランスポートを使用して、オーディオをブラウザに送信する
7. **Assistant Context Aggregator** - アシスタントのメッセージを会話コンテキストの一部として集約する

## Run Locally

### Run the Server

```bash
uv run bot -t daily
```

### Run the Client

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## Deployment

### Deploy your Server

Pipecat Cloud を使用してサーバーコードをデプロイできる。詳細な手順については、[Pipecat Cloud クイックスタート](https://docs.pipecat.daily.co/quickstart) をご覧ください

以下の手順を実行してください：

- Docker イメージをビルド、タグ付けし、レジストリにプッシュします（例：`uv run pcc docker build-push`）
- CLI またはダッシュボードを使用して、Pipecat Cloud のシークレットを作成する。このエージェントの場合、必要なのは `GOOGLE_API_KEY` のみです。`DAILY_API_KEY` は自動的に適用される
- エージェントイメージをデプロイする。pcc-deploy.toml ファイルを使用すると、デプロイが簡単になる。例：

```toml
agent_name = "word-wrangler"
image = "your-dockerhub-name/word-wrangler:0.1"
secret_set = "word-wrangler-secrets"
enable_krisp = true

[scaling]
  min_agents = 1
  max_agents = 5
```

その後、CLI を使用して `uv run pcc deploy` を実行し、デプロイできる

- 最後に、エージェントがデプロイされたことを確認してください。ターミナルに結果が表示される

### Deploy your Client

このプロジェクトは TypeScript、React、Next.js を使用しているため、[Vercel](https://vercel.com/) に最適。

- クライアントディレクトリで、VercelのCLIツールをインストールします：`npm install -g vercel`
- `vercel --version` を実行して、インストールが正常に行われたことを確認します
- `vercel login` を実行して、Vercelアカウントにログインします
- `vercel` を実行して、クライアントをVercelにデプロイします

## Tech stack

- [Pipecat](https://www.pipecat.ai/) framework for real-time voice conversation
- Google's Gemini Live API
- Real-time communication (Web via Daily)
