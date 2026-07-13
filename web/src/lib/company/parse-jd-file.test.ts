import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gemini/client", () => ({
  generateGeminiVisionText: vi.fn(),
}));

vi.mock("@/lib/resume/parse", () => ({
  parseResumeBuffer: vi.fn(),
}));

import { generateGeminiVisionText } from "@/lib/gemini/client";
import { parseResumeBuffer } from "@/lib/resume/parse";
import { parseJdBuffer, validateJdFile } from "./parse-jd-file";

describe("validateJdFile", () => {
  it("accepts images and documents", () => {
    expect(validateJdFile({ name: "job.pdf", size: 1000 } as File)).toBeNull();
    expect(validateJdFile({ name: "job.png", size: 1000 } as File)).toBeNull();
  });

  it("rejects unknown extensions", () => {
    expect(validateJdFile({ name: "job.zip", size: 1000 } as File)).toContain("업로드");
  });
});

describe("parseJdBuffer", () => {
  it("parses pdf via document parser", async () => {
    vi.mocked(parseResumeBuffer).mockResolvedValue("담당업무: 마케팅 기획");
    const result = await parseJdBuffer(Buffer.from("x"), "posting.pdf");
    expect(result.source).toBe("document");
    expect(result.text).toContain("마케팅");
  });

  it("ocr image files", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(generateGeminiVisionText).mockResolvedValue(
      "모집분야: 신입\n담당업무: 영업\n자격요건: 대졸 이상",
    );
    const result = await parseJdBuffer(Buffer.from("img"), "posting.png");
    expect(result.source).toBe("image_ocr");
    expect(result.text).toContain("모집분야");
  });
});
