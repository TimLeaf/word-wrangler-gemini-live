export const LANGUAGES = ["ja", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export type Wordbook = {
  id: string;
  name: string;
  language: Language;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Word = {
  id: string;
  text: string;
  createdAt: number;
  usageCount: number;
};
