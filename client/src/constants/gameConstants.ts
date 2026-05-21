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

// Text used in the game
export const GAME_TEXT = {
  time: "Time",
  score: "Score",
  gameOver: "Game Over!",
  finalScore: "Final Score",
  correct: "Mark Correct",
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
  finalScoreMessage: "Your best score:",
};

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

// Button text
export const BUTTON_TEXT = {
  START: "Start Game",
  END: "End Game",
  CONNECTING: "Connecting...",
  STARTING: "Starting...",
  RESTART: "Play Again",
};
