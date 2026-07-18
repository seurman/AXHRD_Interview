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
