# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Word Wrangler is a voice-based word guessing game powered by Pipecat and Google's Gemini Live API. Users describe words they're given while an AI player tries to guess them. Built as a client/server app with WebRTC communication via Daily.

## Commands

### Client (Next.js)
```bash
cd client
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
```

### Server (Python/Pipecat)
```bash
cd server
uv sync              # Install dependencies
uv run bot -t daily  # Run locally with Daily transport
uv run pcc deploy    # Deploy to Pipecat Cloud
```

### Formatting
- Client: Prettier (2 spaces, no semicolons, double quotes) — see `.prettierrc`
- Server: Ruff (line length 100) — configured in `pyproject.toml`

## Architecture

### Communication Flow
Client (Next.js) ↔ Daily WebRTC ↔ Server (Pipecat pipeline)

### Server Pipeline (`server/bot.py`)
Transport Input → RTVIProcessor → STTMuteFilter → LLMContext → GeminiLiveLLM → Transport Output

- `GeminiLiveLLMService` handles AI interaction
- `STTMuteFilter` with `MUTE_UNTIL_FIRST_BOT_COMPLETE` prevents user interrupting bot intro
- `RTVIProcessor` handles bidirectional client/server state communication
- 5 personality presets injected into system prompt based on client selection

### Client State Management
- **Jotai** for global atoms/state
- Game states flow: `IDLE` → `CONNECTING` → `WAITING_FOR_INTRO` → `ACTIVE` → `FINISHED`
- Custom hooks: `useGameState`, `useGameTimer`, `useConnectionState`, `useWordDetection`, `useVisualFeedback`
- Best score persisted in localStorage

### Key Client Files
- `src/app/page.tsx` — Main game page
- `src/components/Game/WordWrangler.tsx` — Core game component
- `src/providers/PipecatProvider.tsx` — Pipecat client setup
- `src/hooks/useGameState.ts` — Score, timer, word pool management
- `src/hooks/useWordDetection.ts` — Regex-based guess detection from bot transcripts
- `src/constants/gameConstants.ts` — Game config (60s duration, 3 skips, 30-word pool)
- `src/data/wordWranglerWords.ts` — Word pool

### Word Detection Pattern
Regex matching for "Is it X?" in bot transcripts with article handling and substring fallback:
`/is it [""]?([^""?]+)[""]?(?:\?)?|is it (?:a|an) ([^?]+)(?:\?)?/i`

## Environment Variables

### Server (.env)
`DAILY_API_KEY`, `DAILY_API_URL`, `DAILY_SAMPLE_ROOM_URL`, `GOOGLE_API_KEY`

### Client (.env.local)
`BOT_START_URL` (default: `http://localhost:7860/start`), `BOT_START_PUBLIC_API_KEY`, `AGENT_NAME`

## Tech Stack
- **Client**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Jotai, @pipecat-ai/client-react
- **Server**: Python 3.10+, pipecat-ai (with daily/google/silero plugins), Pipecat Cloud
- **Path aliases**: `@/` maps to `client/src/`
