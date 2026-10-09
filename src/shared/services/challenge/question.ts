import type { SymbolViewProps } from "expo-symbols";

import type { MessageKey } from "@/shared/i18n";

export type QuestionAuthor = "library" | "model";

/**
 * One question in the deck. Questions written from the library carry a localised frame
 * (`promptKey`) around a verbatim `excerpt`, so the wording follows the app language while the
 * article's own words stay exactly as the article wrote them. Questions written by the on-device
 * model carry their whole wording in `prompt`.
 */
export interface WrittenQuestion {
  id: string;
  prompt?: string;
  promptKey?: MessageKey;
  excerpt?: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** The saved article this came from, shown under the question. */
  source: string;
  readingId: string;
  icon: SymbolViewProps["name"];
  writtenBy: QuestionAuthor;
}

const LETTERS = ["A", "B", "C", "D"];

export function isWrittenQuestion(value: unknown): value is WrittenQuestion {
  if (!value || typeof value !== "object") return false;
  const item = value as WrittenQuestion;
  return (
    typeof item.id === "string" && item.id.length > 0 &&
    (typeof item.prompt === "string" || typeof item.promptKey === "string") &&
    Array.isArray(item.options) && item.options.length === LETTERS.length &&
    item.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    new Set(item.options.map((option) => option.toLowerCase())).size === LETTERS.length &&
    Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length &&
    typeof item.source === "string" && typeof item.readingId === "string" &&
    (item.writtenBy === "library" || item.writtenBy === "model")
  );
}
