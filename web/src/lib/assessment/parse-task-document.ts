/**
 * 평가 과제 문서 파싱 — 이력서 파서 재사용 (PDF/DOC/DOCX/TXT/MD, 5MB).
 */
import { createHash } from "crypto";
import {
  parseResumeBuffer,
  validateResumeFile,
} from "@/lib/resume/parse";

export const TASK_DOC_MAX_BYTES = 5 * 1024 * 1024;

export function validateTaskDocument(file: File): string | null {
  return validateResumeFile(file);
}

export type ParsedTaskDocument = {
  fileName: string;
  mimeType: string | null;
  byteSize: number;
  checksumSha256: string;
  extractedText: string;
};

export async function parseTaskDocument(file: File): Promise<ParsedTaskDocument> {
  const validationError = validateTaskDocument(file);
  if (validationError) throw new Error(validationError);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = await parseResumeBuffer(buffer, file.name);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    fileName: file.name,
    mimeType: file.type || null,
    byteSize: file.size,
    checksumSha256,
    extractedText,
  };
}

/** 관리자가 붙여넣은 샘플 과제 원문 → TaskSource용 메타 */
export function parseTaskSampleText(
  text: string,
  fileName = "sample-task.txt",
): ParsedTaskDocument {
  const extractedText = text.replace(/\r\n/g, "\n").trim();
  if (extractedText.length < 40) {
    throw new Error("샘플 과제 내용을 40자 이상 입력해 주세요.");
  }
  if (extractedText.length > 40_000) {
    throw new Error("샘플 원문이 너무 깁니다. 40,000자 이하로 줄여 주세요.");
  }
  const buffer = Buffer.from(extractedText, "utf8");
  return {
    fileName: fileName.trim() || "sample-task.txt",
    mimeType: "text/plain",
    byteSize: buffer.byteLength,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    extractedText,
  };
}
