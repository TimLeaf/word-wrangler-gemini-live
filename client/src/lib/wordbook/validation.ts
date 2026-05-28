import { isLanguage, type Language } from "@/types/wordbook";

export const WORDBOOK_NAME_MAX_LENGTH = 80;

export type ParsedWordbookInput = {
  name: string;
  language: Language;
};

export type ValidationError = { ok: false; message: string };
export type ValidationOk<T> = { ok: true; value: T };
export type ValidationResult<T> = ValidationOk<T> | ValidationError;

export function parseWordbookInput(
  rawName: unknown,
  rawLanguage: unknown,
): ValidationResult<ParsedWordbookInput> {
  if (typeof rawName !== "string") {
    return { ok: false, message: "name is required" };
  }
  const name = rawName.trim();
  if (name.length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (name.length > WORDBOOK_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `name must be ${WORDBOOK_NAME_MAX_LENGTH} characters or fewer`,
    };
  }
  if (!isLanguage(rawLanguage)) {
    return { ok: false, message: "language must be 'ja' or 'en'" };
  }
  return { ok: true, value: { name, language: rawLanguage } };
}

export const WORD_TEXT_MAX_LENGTH = 120;

export function parseWordText(rawText: unknown): ValidationResult<string> {
  if (typeof rawText !== "string") {
    return { ok: false, message: "text is required" };
  }
  const text = rawText.trim();
  if (text.length === 0) {
    return { ok: false, message: "text is required" };
  }
  if (text.length > WORD_TEXT_MAX_LENGTH) {
    return {
      ok: false,
      message: `text must be ${WORD_TEXT_MAX_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, value: text };
}
