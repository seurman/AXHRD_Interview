import { describe, expect, it } from "vitest";
import { ttsCacheKey, ttsCacheKeyForQuestion } from "./tts-cache-key";

describe("ttsCacheKey", () => {
  it("distinguishes follow-up from parent question with same id", () => {
    const parent = ttsCacheKey("q1", "첫 질문 텍스트", false);
    const followUp = ttsCacheKey("q1", "꼬리질문 텍스트", true);
    expect(parent).not.toBe(followUp);
  });

  it("uses question flags for follow-up", () => {
    const key = ttsCacheKeyForQuestion(
      {
        id: "abc",
        externalId: "ext",
        competency: "COMM",
        level: 2,
        text: "base",
        isFollowUp: true,
        personalizedText: "follow up text",
      },
      "follow up text"
    );
    expect(key).toContain(":followup:");
  });
});
