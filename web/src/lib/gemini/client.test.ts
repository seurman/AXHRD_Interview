import { describe, expect, it } from "vitest";
import {
  extractGeminiVisibleText,
  resolveThinkingBudget,
} from "@/lib/gemini/client";

describe("gemini client text extraction", () => {
  it("skips thought parts and joins visible text", () => {
    const text = extractGeminiVisibleText({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "internal reasoning..." },
              { text: '{"overallSummary":"ok"}' },
            ],
          },
        },
      ],
    });
    expect(text).toBe('{"overallSummary":"ok"}');
  });

  it("returns empty when only thoughts or MAX_TOKENS emptied output", () => {
    expect(
      extractGeminiVisibleText({
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: { parts: [{ thought: true, text: "..." }] },
          },
        ],
      })
    ).toBe("");
  });

  it("clamps pro thinking budget to at least 128", () => {
    expect(resolveThinkingBudget("gemini-2.5-pro", 0)).toBe(128);
    expect(resolveThinkingBudget("gemini-2.5-flash", 0)).toBe(0);
    expect(resolveThinkingBudget("gemini-2.5-pro")).toBe(1024);
  });
});
