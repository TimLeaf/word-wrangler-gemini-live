import { Language } from "@/types/language";

// Game configuration
export const GAME_CONFIG = {
  MAX_SKIPS: 3,
  GAME_DURATION: 60, // seconds
  WORD_POOL_SIZE: 30,
  ANIMATION_DURATION: 1000, // ms
  TIMER_INTERVAL: 1000, // ms
  LOW_TIME_WARNING: 10, // seconds
};

// Game states
export const GAME_STATES = {
  IDLE: "idle",
  CONNECTING: "connecting",
  WAITING_FOR_INTRO: "waitingForIntro",
  ACTIVE: "active",
  FINISHED: "finished",
} as const;

export type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];

// Text used in the game (per language)
export interface GameTextDict {
  time: string;
  score: string;
  gameOver: string;
  finalScore: string;
  correct: string;
  endGame: string;
  skip: string;
  noSkips: string;
  skipsRemaining: (num: number) => string;
  startingGame: string;
  waitingForIntro: string;
  clickToStart: string;
  describeWord: string;
  introTitle: string;
  introGuide1: string;
  introGuide2: string;
  introGuide3: string;
  aiPersonality: string;
  language: string;
  finalScoreMessage: string;
  viewSourceCode: string;
}

export const GAME_TEXT_BY_LANG: Record<Language, GameTextDict> = {
  en: {
    time: "Time",
    score: "Score",
    gameOver: "Game Over!",
    finalScore: "Final Score",
    correct: "Mark Correct",
    endGame: "End Game",
    skip: "Skip →",
    noSkips: "No Skips Left",
    skipsRemaining: (num: number) => `Skip (${num} left)`,
    startingGame: `How many words can you describe in ${GAME_CONFIG.GAME_DURATION} seconds?`,
    waitingForIntro: "Getting ready...",
    clickToStart: "Press Start Game to begin",
    describeWord: "Describe the following word:",
    introTitle: "How many words can you describe within 60 seconds?",
    introGuide1: "Earn points each time the AI correctly guesses the word",
    introGuide2: "Do not say the word, or you will lose points",
    introGuide3: "You can skip the word if you don't know it",
    aiPersonality: "AI Personality",
    language: "Language",
    finalScoreMessage: "Your best score:",
    viewSourceCode: "View project source code",
  },
  ja: {
    time: "残り時間",
    score: "スコア",
    gameOver: "ゲーム終了！",
    finalScore: "最終スコア",
    correct: "正解にする",
    endGame: "ゲーム終了",
    skip: "スキップ →",
    noSkips: "スキップ残り 0",
    skipsRemaining: (num: number) => `スキップ（残り ${num}）`,
    startingGame: `${GAME_CONFIG.GAME_DURATION} 秒間でいくつ説明できるかな？`,
    waitingForIntro: "準備中...",
    clickToStart: "「ゲーム開始」を押して始めましょう",
    describeWord: "次の単語を説明してください:",
    introTitle: "60 秒間でいくつの単語を説明できますか？",
    introGuide1: "AI が単語を正しく当てるたびに得点します",
    introGuide2: "単語そのものを言うと減点されます",
    introGuide3: "分からなければスキップできます",
    aiPersonality: "AI のパーソナリティ",
    language: "言語",
    finalScoreMessage: "ベストスコア:",
    viewSourceCode: "プロジェクトのソースコードを見る",
  },
};

// 後方互換: 既存呼び出しは英語版にフォールバック。新規は useTexts() を使用すること。
export const GAME_TEXT = GAME_TEXT_BY_LANG.en;

// Patterns for detecting guesses in transcripts (per language).
// 各言語の canonical 推測フレーズは server/bot.py の `CANONICAL_GUESS_PHRASES`
// に対応する。フレーズを変更する場合は両側を揃えること。
// - en: `Is it [your guess]?` （任意で "word" 引用符 / a/an 冠詞付き）
// - ja: `答えは「[あなたの推測]」ですか？` （「」省略・句読点バリエーション許容）
export const GUESS_PATTERNS = {
  en: /is it [""]?([^""?]+)[""]?(?:\?)?|is it (?:a|an) ([^?]+)(?:\?)?/i,
  ja: /答えは[「『"]?([^」』"？?。、]+?)[」』"]?\s*(?:ですか[？?。]?|か[？?])/,
} as const;

// 後方互換: 既存呼び出しを壊さないため英語パターンを残置。新規は GUESS_PATTERNS を直接参照。
export const TRANSCRIPT_PATTERNS = {
  GUESS_PATTERN: GUESS_PATTERNS.en,
};

// Connection states
export const CONNECTION_STATES = {
  ACTIVE: ["connected", "ready"],
  CONNECTING: ["connecting", "initializing", "initialized", "authenticating"],
  DISCONNECTING: ["disconnecting"],
};

// Button text (per language)
export interface ButtonTextDict {
  START: string;
  END: string;
  CONNECTING: string;
  STARTING: string;
  RESTART: string;
}

export const BUTTON_TEXT_BY_LANG: Record<Language, ButtonTextDict> = {
  en: {
    START: "Start Game",
    END: "End Game",
    CONNECTING: "Connecting...",
    STARTING: "Starting...",
    RESTART: "Play Again",
  },
  ja: {
    START: "ゲーム開始",
    END: "ゲーム終了",
    CONNECTING: "接続中...",
    STARTING: "開始中...",
    RESTART: "もう一度遊ぶ",
  },
};

// 後方互換
export const BUTTON_TEXT = BUTTON_TEXT_BY_LANG.en;
