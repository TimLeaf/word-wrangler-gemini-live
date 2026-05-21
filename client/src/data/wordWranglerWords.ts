// 言語別の単語プールを束ね、ランダム抽出を行うルーター。
// 個別の言語別リストは `wordWranglerWords.{en,ja}.ts` を参照。

import { Language } from '@/types/language';
import { ALL_CATCH_PHRASE_WORDS_EN } from './wordWranglerWords.en';
import { ALL_CATCH_PHRASE_WORDS_JA } from './wordWranglerWords.ja';

const WORDS_BY_LANGUAGE: Record<Language, readonly string[]> = {
  en: ALL_CATCH_PHRASE_WORDS_EN,
  ja: ALL_CATCH_PHRASE_WORDS_JA,
};

// Get a batch of random words (useful for starting a game with multiple words)
export const getRandomCatchPhraseWords = (
  count: number = 30,
  language: Language = 'en'
): string[] => {
  const source = WORDS_BY_LANGUAGE[language] ?? WORDS_BY_LANGUAGE.en;
  const wordList = [...source];

  // Shuffle the array using Fisher-Yates algorithm
  for (let i = wordList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
  }

  return wordList.slice(0, count);
};
