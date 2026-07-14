import { describe, expect, it } from "vitest";
import {
  extractGeminiVisibleText,
  resolveThinkingBudget,
  resumeReviewModelChain,
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

  it("applies thinking budget only to pro-class models", () => {
    expect(resolveThinkingBudget("gemini-2.5-pro", 0)).toBe(128);
    expect(resolveThinkingBudget("gemini-2.5-pro")).toBe(1024);
    expect(resolveThinkingBudget("gemini-flash-latest")).toBeUndefined();
    expect(resolveThinkingBudget("gemini-3.1-flash-lite")).toBeUndefined();
  });

  it("builds resume review model chain with flash-latest first by default", () => {
    const prev = process.env.GEMINI_RESUME_REVIEW_MODEL;
    delete process.env.GEMINI_RESUME_REVIEW_MODEL;
    delete process.env.GEMINI_RESUME_REVIEW_FALLBACK_MODEL;
    const chain = resumeReviewModelChain();
    expect(chain[0]).toBe("gemini-flash-latest");
    expect(chain).toContain("gemini-flash-lite-latest");
    if (prev) process.env.GEMINI_RESUME_REVIEW_MODEL = prev;
  });
});
