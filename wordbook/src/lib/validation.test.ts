import { describe, expect, it } from "vitest";
import { parseWordbookInput, WORDBOOK_NAME_MAX_LENGTH } from "./validation";

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
