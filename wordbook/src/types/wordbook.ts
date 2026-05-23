export const LANGUAGES = ["ja", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export type Wordbook = {
  id: string;
  name: string;
  language: Language;
  createdAt: number;
  updatedAt: number;
};
