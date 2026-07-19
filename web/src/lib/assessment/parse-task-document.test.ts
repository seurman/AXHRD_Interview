import { describe, expect, it } from "vitest";
import {
  isUploadBlob,
  parseTaskSampleText,
  TASK_DOC_MAX_BYTES,
  validateTaskDocument,
} from "@/lib/assessment/parse-task-document";

describe("parse-task-document", () => {
  it("accepts duck-typed upload blobs", () => {
    expect(
      isUploadBlob({
        name: "a.txt",
        size: 12,
        arrayBuffer: async () => new ArrayBuffer(12),
      }),
    ).toBe(true);
    expect(isUploadBlob("x")).toBe(false);
    expect(isUploadBlob({ size: 1 })).toBe(false);
  });

  it("parses sample text with checksum metadata", () => {
    const text =
      "응시자 역할: 팀장. 성과 부진 팀원과의 1:1 면담을 진행하고 개선 계획을 합의하세요. 평가 역량은 의사소통입니다.";
    const parsed = parseTaskSampleText(text, "sample.txt");
    expect(parsed.fileName).toBe("sample.txt");
    expect(parsed.mimeType).toBe("text/plain");
    expect(parsed.extractedText.length).toBeGreaterThanOrEqual(40);
    expect(parsed.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects short sample text", () => {
    expect(() => parseTaskSampleText("너무 짧음")).toThrow(/40자/);
  });

  it("validates extension and size like resume parser", () => {
    expect(
      validateTaskDocument({
        name: "task.exe",
        size: 100,
        arrayBuffer: async () => new ArrayBuffer(100),
      }),
    ).toMatch(/PDF|Word|TXT|MD/i);
    expect(
      validateTaskDocument({
        name: "task.txt",
        size: TASK_DOC_MAX_BYTES + 1,
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    ).toMatch(/5MB/i);
    expect(
      validateTaskDocument({
        name: "task.txt",
        size: 40,
        arrayBuffer: async () => new ArrayBuffer(40),
      }),
    ).toBeNull();
  });
});
