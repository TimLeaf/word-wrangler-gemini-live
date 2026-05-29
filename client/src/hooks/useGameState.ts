import { GAME_CONFIG, GAME_STATES, GameState } from "@/constants/gameConstants";
import { getRandomCatchPhraseWords } from "@/data/wordWranglerWords";
import { Language } from "@/types/language";
import { useCallback, useState } from "react";

// 出題単語。Firestore 由来は id を持ち、フォールバック（組み込み単語）は id: null。
// id は正解時の correctCount 増分（PR-3）で利用する。
export type GameWord = { id: string | null; text: string };

// アクティブ単語帳の単語を取得。未設定・空・エラー時は組み込み単語にフォールバックする。
async function fetchGameWords(language: Language): Promise<GameWord[]> {
  try {
    const res = await fetch("/api/words");
    if (res.ok) {
      const data = (await res.json()) as {
        words?: { id: string; text: string }[];
      };
      if (Array.isArray(data.words) && data.words.length > 0) {
        return data.words.map((w) => ({ id: w.id, text: w.text }));
      }
    }
  } catch {
    // フォールバックへ
  }
  return getRandomCatchPhraseWords(GAME_CONFIG.WORD_POOL_SIZE, language).map(
    (text) => ({ id: null, text }),
  );
}

export function useGameState({ language = "en" }: { language?: Language } = {}) {
  // Game state
  const [gameState, setGameState] = useState<GameState>(GAME_STATES.IDLE);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.GAME_DURATION);
  const [score, setScore] = useState(0);
  const [words, setWords] = useState<GameWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [skipsRemaining, setSkipsRemaining] = useState(GAME_CONFIG.MAX_SKIPS);
  const [bestScore, _setBestScore] = useState(0);

  // Initialize or reset game state
  const initializeGame = useCallback(async () => {
    const freshWords = await fetchGameWords(language);
    setWords(freshWords);
    setGameState(GAME_STATES.ACTIVE);
    setTimeLeft(GAME_CONFIG.GAME_DURATION);
    setScore(0);
    setCurrentWordIndex(0);
    setSkipsRemaining(GAME_CONFIG.MAX_SKIPS);

    // Get best score from local storage
    const storedScore = localStorage.getItem("bestScore");
    if (storedScore) {
      _setBestScore(Number(storedScore) || 0);
    }
    return freshWords;
  }, [language]);

  // End game
  const finishGame = useCallback(() => {
    setGameState(GAME_STATES.FINISHED);
  }, []);

  // Handle scoring
  const incrementScore = useCallback(() => {
    setScore((prev) => prev + 1);
  }, []);

  // Handle best score
  const setBestScore = useCallback((newBestScore: number) => {
    _setBestScore(newBestScore);
    localStorage.setItem("bestScore", newBestScore.toString());
  }, []);

  // Handle word navigation
  const moveToNextWord = useCallback(() => {
    if (currentWordIndex >= words.length - 1) {
      // 末尾に達したら単語プールを再充填して先頭に戻る
      void fetchGameWords(language).then((freshWords) => {
        setWords(freshWords);
        setCurrentWordIndex(0);
      });
      return;
    }
    setCurrentWordIndex((prev) => prev + 1);
  }, [currentWordIndex, words.length, language]);

  // Handle skipping
  const useSkip = useCallback(() => {
    if (skipsRemaining <= 0) return false;
    setSkipsRemaining((prev) => prev - 1);
    return true;
  }, [skipsRemaining]);

  // Update timer
  const decrementTimer = useCallback(() => {
    return setTimeLeft((prev) => {
      if (prev <= 1) {
        return 0;
      }
      return prev - 1;
    });
  }, []);

  return {
    // State
    gameState,
    setGameState,
    timeLeft,
    score,
    bestScore,
    words,
    currentWord: words[currentWordIndex]?.text || "",
    currentWordId: words[currentWordIndex]?.id ?? null,
    skipsRemaining,

    // Actions
    initializeGame,
    finishGame,
    incrementScore,
    setBestScore,
    moveToNextWord,
    useSkip,
    decrementTimer,
  };
}
