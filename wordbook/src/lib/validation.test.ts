import { describe, expect, it } from "vitest";
import {
  parseWordbookInput,
  parseWordText,
  WORDBOOK_NAME_MAX_LENGTH,
  WORD_TEXT_MAX_LENGTH,
} from "./validation";

describe("parseWordbookInput", () => {
  it("accepts a trimmed name and a valid language", () => {
    const result = parseWordbookInput("  my book  ", "ja");
    expect(result).toEqual({
      ok: true,
      value: { name: "my book", language: "ja" },
    });
  });

  it("rejects when name is missing", () => {
    expect(parseWordbookInput(undefined, "ja")).toEqual({
      ok: false,
      message: "name is required",
    });
  });

  it("rejects when name is only whitespace", () => {
    expect(parseWordbookInput("   ", "en")).toEqual({
      ok: false,
      message: "name is required",
    });
  });

  it("rejects names longer than the limit", () => {
    const longName = "a".repeat(WORDBOOK_NAME_MAX_LENGTH + 1);
    expect(parseWordbookInput(longName, "ja")).toEqual({
      ok: false,
      message: `name must be ${WORDBOOK_NAME_MAX_LENGTH} characters or fewer`,
    });
  });

  it("rejects unknown language codes", () => {
    expect(parseWordbookInput("hello", "fr")).toEqual({
      ok: false,
      message: "language must be 'ja' or 'en'",
    });
  });

  it("rejects non-string language", () => {
    expect(parseWordbookInput("hello", undefined)).toEqual({
      ok: false,
      message: "language must be 'ja' or 'en'",
    });
  });
});

describe("parseWordText", () => {
  it("trims and accepts a non-empty string", () => {
    expect(parseWordText("  apple  ")).toEqual({ ok: true, value: "apple" });
  });

  it("rejects when missing", () => {
    expect(parseWordText(undefined)).toEqual({
      ok: false,
      message: "text is required",
    });
  });

  it("rejects whitespace-only", () => {
    expect(parseWordText("   ")).toEqual({
      ok: false,
      message: "text is required",
    });
  });

  it("rejects text longer than the limit", () => {
    const longText = "a".repeat(WORD_TEXT_MAX_LENGTH + 1);
    expect(parseWordText(longText)).toEqual({
      ok: false,
      message: `text must be ${WORD_TEXT_MAX_LENGTH} characters or fewer`,
    });
  });
});
