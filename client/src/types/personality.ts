import { Language } from './language';

export type PersonalityType =
  | 'friendly'
  | 'professional'
  | 'enthusiastic'
  | 'thoughtful'
  | 'witty';

// 単一源泉: バリデーション・テストはこれを参照する。
// 表示ラベルは PERSONALITY_LABELS_BY_LANG を使うこと。
export const PERSONALITY_PRESETS: Record<PersonalityType, string> = {
  friendly: 'Friendly',
  professional: 'Professional',
  enthusiastic: 'Enthusiastic',
  thoughtful: 'Thoughtful',
  witty: 'Witty',
};

// Localized display labels (UI 表示専用)
export const PERSONALITY_LABELS_BY_LANG: Record<
  Language,
  Record<PersonalityType, string>
> = {
  en: PERSONALITY_PRESETS,
  ja: {
    friendly: 'フレンドリー',
    professional: 'プロフェッショナル',
    enthusiastic: '情熱的',
    thoughtful: '思慮深い',
    witty: '機知に富む',
  },
};

// Default personality to use
export const DEFAULT_PERSONALITY: PersonalityType = 'witty';
