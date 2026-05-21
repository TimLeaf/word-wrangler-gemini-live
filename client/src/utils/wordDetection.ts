import { GUESS_PATTERNS } from '@/constants/gameConstants';
import { Language } from '@/types/language';

/**
 * Checks if a transcript contains a correct guess for the target word.
 *
 * 言語ごとに canonical な推測フレーズが異なるため、`GUESS_PATTERNS[language]` を
 * 切り替える。server 側の `CANONICAL_GUESS_PHRASES` と対応している。
 */
export function detectWordGuess(
  transcript: string,
  targetWord: string,
  language: Language = 'en'
) {
  const currentWordLower = targetWord.toLowerCase().trim();
  const guessPattern = GUESS_PATTERNS[language] ?? GUESS_PATTERNS.en;

  // Primary detection: Look for explicit guesses
  const guessMatch = transcript.match(guessPattern);

  if (guessMatch) {
    // Extract the guessed word from whichever group matched (group 1 or 2)
    let guessedWord = (guessMatch[1] || guessMatch[2] || '')
      .toLowerCase()
      .trim();

    if (language === 'en') {
      // Remove articles ("a", "an", "the") from the beginning of the guessed word
      guessedWord = guessedWord.replace(/^(a|an|the)\s+/i, '');
    }

    return {
      isCorrect: guessedWord === currentWordLower,
      isExplicitGuess: true,
      guessedWord,
    };
  }

  // Secondary detection: Check if word appears in transcript
  const containsWord = transcript.toLowerCase().includes(currentWordLower);

  return {
    isCorrect: containsWord,
    isExplicitGuess: false,
    guessedWord: containsWord ? targetWord : null,
  };
}
