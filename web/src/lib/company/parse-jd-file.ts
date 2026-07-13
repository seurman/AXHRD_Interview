import { generateGeminiVisionText } from "@/lib/gemini/client";
import { parseResumeBuffer } from "@/lib/resume/parse";

const MAX_BYTES = 5 * 1024 * 1024;

const DOCUMENT_EXT = new Set(["pdf", "doc", "docx", "txt", "md"]);
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const OCR_SYSTEM = `당신은 한국 채용공고 이미지 OCR 도구입니다.
이미지에 보이는 한국어·영어 텍스트를 빠짐없이 plain text로 추출하세요.
표·목록 구조는 줄바꿈으로 유지하고, 모집분야·자격요건·담당업무·근무조건·복리후생·접수방법을 누락하지 마세요.
해석·요약·추가 설명 없이 추출된 텍스트만 출력하세요.`;

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

function mimeFromExtension(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "image/jpeg";
  }
}

export function validateJdFile(file: File): string | null {
  const ext = getExtension(file.name);
  if (!DOCUMENT_EXT.has(ext) && !IMAGE_EXT.has(ext)) {
    return "PDF, Word, TXT, PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_BYTES) {
    return "파일 크기는 5MB 이하여야 합니다.";
  }
  return null;
}

export type ParseJdFileResult = {
  text: string;
  source: "document" | "image_ocr";
};

export async function parseJdBuffer(buffer: Buffer, fileName: string): Promise<ParseJdFileResult> {
  const ext = getExtension(fileName);

  if (DOCUMENT_EXT.has(ext)) {
    const text = await parseResumeBuffer(buffer, fileName);
    return { text, source: "document" };
  }

  if (IMAGE_EXT.has(ext)) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("이미지 공고 인식을 사용할 수 없습니다. 텍스트로 직접 입력해 주세요.");
    }
    const ocrText = await generateGeminiVisionText({
      systemInstruction: OCR_SYSTEM,
      userPrompt: "이 채용공고 이미지의 모든 텍스트를 추출하세요.",
      imageBase64: buffer.toString("base64"),
      mimeType: mimeFromExtension(ext),
      maxOutputTokens: 4096,
      timeoutMs: 30_000,
    });
    const text = (ocrText ?? "").trim();
    if (text.length < 15) {
      throw new Error(
        "이미지에서 채용공고 텍스트를 읽지 못했습니다. 더 선명한 이미지이거나 텍스트를 직접 붙여넣어 주세요.",
      );
    }
    return { text, source: "image_ocr" };
  }

  throw new Error(`지원하지 않는 형식: .${ext}`);
}
