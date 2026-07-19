/**
 * 평가 과제 문서 파싱 — 이력서 파서 재사용 (PDF/DOC/DOCX/TXT/MD, 5MB).
 */
import { createHash } from "crypto";
import {
  parseResumeBuffer,
  validateResumeFile,
} from "@/lib/resume/parse";

export const TASK_DOC_MAX_BYTES = 5 * 1024 * 1024;

/** FormData 파일이 Node/Edge에서 File instanceof가 깨질 수 있어 duck-type 사용 */
export type UploadBlob = {
  name?: string;
  type?: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export function isUploadBlob(value: unknown): value is UploadBlob {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.size === "number" &&
    typeof v.arrayBuffer === "function" &&
    (typeof v.name === "string" || typeof v.name === "undefined")
  );
}

export function validateTaskDocument(file: UploadBlob): string | null {
  const asFile = {
    name: file.name || "upload.bin",
    type: file.type || "",
    size: file.size,
  } as File;
  return validateResumeFile(asFile);
}

export type ParsedTaskDocument = {
  fileName: string;
  mimeType: string | null;
  byteSize: number;
  checksumSha256: string;
  extractedText: string;
};

export async function parseTaskDocument(file: UploadBlob): Promise<ParsedTaskDocument> {
  const fileName = (file.name || "upload.bin").trim() || "upload.bin";
  const validationError = validateTaskDocument({ ...file, name: fileName });
  if (validationError) throw new Error(validationError);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = await parseResumeBuffer(buffer, fileName);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    fileName,
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
