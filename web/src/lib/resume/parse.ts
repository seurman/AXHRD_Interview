import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXT = new Set(["pdf", "doc", "docx", "txt", "md"]);

export function validateResumeFile(file: File): string | null {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return "PDF, Word(.doc/.docx), TXT, MD 파일만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_BYTES) {
    return "파일 크기는 5MB 이하여야 합니다.";
  }
  return null;
}

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseResumeBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = getExtension(fileName);

  let raw = "";

  switch (ext) {
    case "txt":
    case "md":
      raw = buffer.toString("utf-8");
      break;

    case "pdf":
      raw = await parsePdf(buffer);
      break;

    case "docx":
      raw = await parseDocx(buffer);
      break;

    case "doc":
      raw = await parseDoc(buffer);
      break;

    default:
      throw new Error(`지원하지 않는 형식: .${ext}`);
  }

  const text = normalizeText(raw);
  if (!text || text.length < 10) {
    throw new Error(
      "파일에서 텍스트를 읽지 못했습니다. 스캔 PDF이거나 빈 문서일 수 있습니다."
    );
  }

  return text;
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mod = await import("mammoth");
  const mammoth = mod.default ?? mod;
  const result = await mammoth.extractRawText({ buffer });
  if (result.messages?.some((m: { type: string }) => m.type === "error")) {
    console.warn("[mammoth]", result.messages);
  }
  return result.value ?? "";
}

async function parseDoc(buffer: Buffer): Promise<string> {
  const mod = await import("word-extractor");
  const WordExtractor = mod.default ?? mod;
  const tmpPath = join(tmpdir(), `hr-in-${randomUUID()}.doc`);
  await writeFile(tmpPath, buffer);
  try {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(tmpPath);
    return doc.getBody() ?? "";
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export { MAX_BYTES, ALLOWED_EXT };
