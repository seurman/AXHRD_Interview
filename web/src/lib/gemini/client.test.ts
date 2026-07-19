import { describe, expect, it } from "vitest";
import {
  extractGeminiVisibleText,
  resolveThinkingBudget,
  resumeReviewModelChain,
} from "@/lib/gemini/client";
import {
  GEMINI_TASK_TIER,
  listProTasks,
  modelChainForTier,
} from "@/lib/gemini/model-tiers";

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

  it("builds pro chain with pro-latest first by default", () => {
    const prev = process.env.GEMINI_RESUME_REVIEW_MODEL;
    const prevPro = process.env.GEMINI_PRO_MODEL;
    delete process.env.GEMINI_RESUME_REVIEW_MODEL;
    delete process.env.GEMINI_PRO_MODEL;
    expect(modelChainForTier("pro")[0]).toBe("gemini-pro-latest");
    expect(resumeReviewModelChain()[0]).toBe("gemini-pro-latest");
    if (prev) process.env.GEMINI_RESUME_REVIEW_MODEL = prev;
    if (prevPro) process.env.GEMINI_PRO_MODEL = prevPro;
  });
});

describe("gemini model tiers", () => {
  it("routes quality-critical interview tasks to pro", () => {
    expect(GEMINI_TASK_TIER.personalize_question).toBe("pro");
    expect(GEMINI_TASK_TIER.triple_feedback).toBe("pro");
    expect(GEMINI_TASK_TIER.resume_review).toBe("pro");
    expect(GEMINI_TASK_TIER.evidence_report).toBe("pro");
  });

  it("keeps high-volume utility on lite/standard", () => {
    expect(GEMINI_TASK_TIER.evaluate_answer).toBe("lite");
    expect(GEMINI_TASK_TIER.transcript_correct).toBe("lite");
    expect(GEMINI_TASK_TIER.theme_mining).toBe("lite");
    expect(GEMINI_TASK_TIER.resume_enrich).toBe("standard");
    expect(GEMINI_TASK_TIER.jd_map).toBe("standard");
    expect(GEMINI_TASK_TIER.assessment_scenario_draft).toBe("standard");
  });

  it("lists pro tasks for observability", () => {
    const pro = listProTasks();
    expect(pro).toContain("personalize_question");
    expect(pro).toContain("evidence_report");
    expect(pro).not.toContain("evaluate_answer");
    expect(pro).not.toContain("transcript_correct");
  });

  it("puts flash-lite ahead on lite chain", () => {
    const prev = process.env.GEMINI_LITE_MODEL;
    const prevText = process.env.GEMINI_TEXT_MODEL;
    delete process.env.GEMINI_LITE_MODEL;
    delete process.env.GEMINI_TEXT_MODEL;
    expect(modelChainForTier("lite")[0]).toBe("gemini-flash-lite-latest");
    if (prev) process.env.GEMINI_LITE_MODEL = prev;
    if (prevText) process.env.GEMINI_TEXT_MODEL = prevText;
  });
});
