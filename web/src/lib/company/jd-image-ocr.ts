/**
 * 채용공고 이미지 OCR — Gemini Vision (기존 GEMINI_API_KEY 사용)
 */

import { generateGeminiVisionText } from "@/lib/gemini/client";

const MAX_IMAGE_BYTES = 4_000_000;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const MAX_OCR_IMAGES = 2;

const ALLOWED_IMAGE_HOST_SUFFIXES = ["saraminimage.co.kr", "saramin.co.kr"];

const OCR_SYSTEM = `당신은 한국 채용공고 이미지 OCR 도구입니다.
이미지에 보이는 한국어·영어 텍스트를 빠짐없이 plain text로 추출하세요.
표·목록 구조는 줄바꿈으로 유지하고, 모집분야·자격요건·담당업무·근무조건·복리후생·접수방법을 누락하지 마세요.
해석·요약·추가 설명 없이 추출된 텍스트만 출력하세요.`;

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
  if (/^(10\.|127\.|169\.254\.|192\.168\.)/.test(host)) return true;
  return false;
}

export function isAllowedJdImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isPrivateOrBlockedHost(host)) return false;
  return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function resolveRecruitImageUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    if (trimmed.startsWith("//")) return new URL(`https:${trimmed}`).toString();
    if (trimmed.startsWith("/")) return new URL(trimmed, "https://www.saramin.co.kr").toString();
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function scoreRecruitImageUrl(url: string): number {
  let score = 0;
  if (/\/recruit\//i.test(url)) score += 12;
  if (/bbs_recruit|recruit26|recruit25/i.test(url)) score += 8;
  if (/\.(png|jpe?g|webp)$/i.test(url)) score += 2;
  if (/logo|icon|graphic|banner|ai_pass|loading|sprite/i.test(url)) score -= 30;
  return score;
}

function findUserContentBlocks(html: string): string[] {
  const results: string[] = [];
  const re = /<div\b[^>]*class="[^"]*\buser_content\b[^"]*"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < html.length && depth > 0) {
      const rest = html.slice(i);
      const nextOpen = rest.search(/<div\b/i);
      const nextClose = rest.search(/<\/div>/i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i += nextOpen + 4;
      } else {
        depth -= 1;
        if (depth === 0) {
          results.push(html.slice(match.index + match[0].length, i + nextClose));
          break;
        }
        i += nextClose + 6;
      }
    }
  }
  return results;
}

/** user_content 안의 채용 본문 이미지 URL (우선순위 정렬) */
export function extractRecruitImageUrls(html: string): string[] {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const blocks = findUserContentBlocks(sanitized);
  const urls: string[] = [];

  for (const block of blocks) {
    const re = /<img\b[\s\S]*?\bsrc=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(block)) !== null) {
      const resolved = resolveRecruitImageUrl(match[1]);
      if (!resolved) continue;
      try {
        const host = new URL(resolved).hostname;
        if (!isAllowedJdImageHost(host)) continue;
      } catch {
        continue;
      }
      urls.push(resolved);
    }
  }

  return [...new Set(urls)]
    .sort((a, b) => scoreRecruitImageUrl(b) - scoreRecruitImageUrl(a))
    .slice(0, MAX_OCR_IMAGES);
}

function mimeFromContentType(contentType: string | null, url: string): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("png")) return "image/png";
  if (ct.includes("webp")) return "image/webp";
  if (ct.includes("gif")) return "image/gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "image/jpeg";
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  if (/\.jpe?g(\?|$)/i.test(url)) return "image/jpeg";
  return "image/png";
}

export async function downloadJdImageAsBase64(
  imageUrl: string,
): Promise<{ base64: string; mimeType: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }
  if (!isAllowedJdImageHost(parsed.hostname)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.saramin.co.kr/",
      },
    });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;

    return {
      base64: buf.toString("base64"),
      mimeType: mimeFromContentType(res.headers.get("content-type"), parsed.toString()),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function ocrRecruitImageUrl(imageUrl: string): Promise<string | null> {
  const image = await downloadJdImageAsBase64(imageUrl);
  if (!image) return null;

  return generateGeminiVisionText({
    systemInstruction: OCR_SYSTEM,
    userPrompt: "이 채용공고 이미지의 모든 텍스트를 추출하세요.",
    imageBase64: image.base64,
    mimeType: image.mimeType,
    maxOutputTokens: 4096,
    timeoutMs: 25_000,
  });
}

export function shouldOcrJdHtml(html: string, text: string): boolean {
  if (process.env.JD_IMAGE_OCR === "0") return false;
  if (!process.env.GEMINI_API_KEY) return false;
  if (/담당업무|자격요건|모집분야|주요업무|근무조건/.test(text)) return false;
  if (/이미지 공고로 제공되어/.test(text)) return true;
  return extractRecruitImageUrls(html).some((url) => scoreRecruitImageUrl(url) > 0);
}

export async function enrichJdTextWithImageOcr(html: string, text: string): Promise<string> {
  if (!shouldOcrJdHtml(html, text)) return text;

  const imageUrls = extractRecruitImageUrls(html);
  const ocrChunks: string[] = [];

  for (const url of imageUrls) {
    if (scoreRecruitImageUrl(url) <= 0) continue;
    const ocr = await ocrRecruitImageUrl(url);
    if (ocr && ocr.replace(/\s/g, "").length >= 60) {
      ocrChunks.push(ocr.trim());
    }
  }

  if (ocrChunks.length === 0) return text;

  const ocrBody = ocrChunks.join("\n\n").slice(0, 9000);
  return applyOcrToDetailSection(text, ocrBody);
}

export function applyOcrToDetailSection(text: string, ocrBody: string): string {
  if (text.includes("## 상세요강")) {
    return text.replace(/## 상세요강\n[\s\S]*?(?=\n## |$)/, `## 상세요강\n${ocrBody}\n`);
  }
  return `${text}\n\n## 상세요강\n${ocrBody}`;
}
