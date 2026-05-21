export type Language = 'en' | 'ja';

export const LANGUAGE_PRESETS: Record<Language, string> = {
  en: 'English',
  ja: '日本語',
};

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_STORAGE_KEY = 'language';
