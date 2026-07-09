/**
 * 채용공고 URL → 본문 텍스트 추출.
 * SSRF 방지를 위해 private/metadata 호스트를 차단하고, HTML은 단순 텍스트로 정리한다.
 */

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_TEXT_CHARS = 12_000;
const MIN_USEFUL_CHARS = 150;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
]);

const NAV_BOILERPLATE_MARKERS = ["지역별", "직업별", "역세권별", "HOT100", "헤드헌팅", "채용관", "큐레이션"];

/** 사이트별로 우선 추출할 class 이름 (앞일수록 구체적) */
const PRIORITY_CONTENT_CLASSES: { needle: string; weight: number }[] = [
  { needle: "user_content", weight: 5 },
  { needle: "wrap_jv_cont", weight: 4 },
  { needle: "job_description", weight: 4 },
  { needle: "job-description", weight: 4 },
  { needle: "posting-content", weight: 4 },
  { needle: "content__body", weight: 3 },
  { needle: "recruit-content", weight: 3 },
  { needle: "se-main-container", weight: 3 },
];

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(host)) return true;
  if (host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }
  return false;
}

function sanitizeHtmlForExtraction(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function fragmentToPlainText(fragment: string): string {
  return fragment
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/th)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<dt[^>]*>/gi, "\n")
    .replace(/<dd[^>]*>/gi, ": ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function looksLikeNavBoilerplate(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 80) return false;
  const hits = NAV_BOILERPLATE_MARKERS.filter((m) => trimmed.includes(m)).length;
  if (hits >= 3) return true;
  return (
    trimmed.includes("본문 바로가기") ||
    trimmed.includes("커리어의 시작") ||
    trimmed.includes("전체메뉴")
  );
}

function scorePlainText(text: string, weight: number): number {
  if (text.length < 40) return 0;
  let score = text.length * weight;
  const navHits = NAV_BOILERPLATE_MARKERS.filter((m) => text.includes(m)).length;
  score -= navHits * 150;
  if (text.includes("본문 바로가기")) score -= 2500;
  if (text.includes("커리어의 시작")) score -= 1500;
  if (text.includes("전체메뉴")) score -= 1500;
  return score;
}

function extractBalancedDivContent(html: string, contentStart: number): string | null {
  let depth = 1;
  let i = contentStart;
  while (i < html.length && depth > 0) {
    const rest = html.slice(i);
    const nextOpen = rest.search(/<div\b/i);
    const nextClose = rest.search(/<\/div>/i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i += nextOpen + 4;
      continue;
    }
    depth -= 1;
    const closeAt = i + nextClose;
    if (depth === 0) return html.slice(contentStart, closeAt);
    i = closeAt + 6;
  }
  return null;
}

function findDivContentsByClass(html: string, classNeedle: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<div\\b[^>]*class="[^"]*\\b${classNeedle}\\b[^"]*"[^>]*>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const inner = extractBalancedDivContent(html, match.index + match[0].length);
    if (inner) results.push(inner);
  }
  return results;
}

function extractTagBlocks(html: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  return results;
}

function extractMetaContent(html: string, attr: "name" | "property", key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`,
    "i",
  );
  const match = html.match(re);
  const raw = match?.[1] ?? match?.[2];
  return raw ? fragmentToPlainText(raw) : null;
}

function extractJsonLdDescriptions(html: string): string[] {
  const results: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        if (obj["@type"] === "JobPosting" || obj["@type"] === "https://schema.org/JobPosting") {
          if (typeof obj.description === "string") results.push(fragmentToPlainText(obj.description));
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return results;
}

type RegionCandidate = { html: string; weight: number };

function collectRegionCandidates(html: string): RegionCandidate[] {
  const candidates: RegionCandidate[] = [];

  for (const { needle, weight } of PRIORITY_CONTENT_CLASSES) {
    for (const block of findDivContentsByClass(html, needle)) {
      candidates.push({ html: block, weight });
    }
  }

  for (const block of extractTagBlocks(html, "article")) {
    candidates.push({ html: block, weight: 3 });
  }
  for (const block of extractTagBlocks(html, "main")) {
    candidates.push({ html: block, weight: 2 });
  }
  for (const block of extractJsonLdDescriptions(html)) {
    candidates.push({ html: block, weight: 4 });
  }

  return candidates;
}

function pickBestPlainText(candidates: RegionCandidate[]): string {
  let best = "";
  let bestScore = 0;

  for (const { html, weight } of candidates) {
    const text = fragmentToPlainText(html);
    if (!text || looksLikeNavBoilerplate(text)) continue;
    const score = scorePlainText(text, weight);
    if (score > bestScore) {
      bestScore = score;
      best = text;
    }
  }

  return best;
}

function buildSupplementalHeader(html: string): string {
  const parts: string[] = [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? fragmentToPlainText(titleMatch[1]) : null;
  if (title) parts.push(title);

  const description =
    extractMetaContent(html, "property", "og:description") ??
    extractMetaContent(html, "name", "description");
  if (description && description !== title) parts.push(description);

  return parts.join("\n\n").trim();
}

/** 사람인 relay URL은 JS로 본문을 채우므로 SEO view URL로 정규화 */
export function normalizeJdFetchUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  const host = parsed.hostname.toLowerCase();
  if (host.endsWith("saramin.co.kr") && parsed.pathname.includes("/jobs/relay/view")) {
    const recIdx = parsed.searchParams.get("rec_idx");
    if (recIdx) {
      const view = new URL("https://www.saramin.co.kr/zf_user/jobs/view");
      view.searchParams.set("rec_idx", recIdx);
      return view.toString();
    }
  }

  return parsed.toString();
}

export function htmlToPlainText(html: string): string {
  const sanitized = sanitizeHtmlForExtraction(html);
  const supplemental = buildSupplementalHeader(html);
  let best = pickBestPlainText(collectRegionCandidates(sanitized));

  if (!best || best.length < MIN_USEFUL_CHARS) {
    const fallback = fragmentToPlainText(sanitized);
    if (fallback && !looksLikeNavBoilerplate(fallback)) {
      best = fallback;
    }
  }

  let text = best;
  if (supplemental) {
    if (!text) {
      text = supplemental;
    } else if (!text.includes(supplemental.slice(0, Math.min(40, supplemental.length)))) {
      text = `${supplemental}\n\n${text}`;
    }
  }

  return text.slice(0, MAX_TEXT_CHARS);
}

export type FetchJdUrlResult =
  | { ok: true; url: string; title: string | null; text: string; bytes: number; ms: number }
  | { ok: false; error: string; status?: number };

export async function fetchJdTextFromUrl(rawUrl: string): Promise<FetchJdUrlResult> {
  const started = Date.now();
  let parsed: URL;
  try {
    parsed = new URL(normalizeJdFetchUrl(rawUrl));
  } catch {
    return { ok: false, error: "올바른 URL이 아닙니다." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "http(s) URL만 지원합니다." };
  }
  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return { ok: false, error: "내부 네트워크 URL은 가져올 수 없습니다." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": BROWSER_UA,
      },
    });

    try {
      const finalHost = new URL(res.url).hostname;
      if (isPrivateOrBlockedHost(finalHost)) {
        return { ok: false, error: "리다이렉트 대상이 차단된 호스트입니다.", status: 400 };
      }
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `채용공고 페이지를 불러오지 못했습니다. (${res.status})`,
        status: res.status,
      };
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return { ok: false, error: "페이지가 너무 큽니다. 텍스트를 직접 붙여넣어 주세요." };
    }

    const raw = buf.toString("utf-8");
    let text: string;
    let title: string | null = null;

    if (contentType.includes("text/plain") || contentType.includes("markdown")) {
      text = raw.replace(/\r/g, "").trim().slice(0, MAX_TEXT_CHARS);
    } else {
      const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) ?? null;
      text = htmlToPlainText(raw);
    }

    if (text.length < MIN_USEFUL_CHARS || looksLikeNavBoilerplate(text)) {
      return {
        ok: false,
        error:
          "본문을 충분히 추출하지 못했습니다. 로그인이 필요하거나 JS로만 그려지는 페이지일 수 있습니다. 텍스트를 직접 붙여넣어 주세요.",
      };
    }

    return {
      ok: true,
      url: res.url || parsed.toString(),
      title,
      text,
      bytes: buf.byteLength,
      ms: Date.now() - started,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "요청 시간이 초과되었습니다. URL을 확인하거나 텍스트를 붙여넣어 주세요." };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "채용공고 URL을 가져오지 못했습니다.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** URL이면 fetch, 아니면 원문을 JD로 사용 */
export async function resolveJdText(input: {
  jdText?: string | null;
  jdUrl?: string | null;
}): Promise<{ text: string; source: "text" | "url" | "none"; meta?: FetchJdUrlResult }> {
  const pasted = typeof input.jdText === "string" ? input.jdText.trim() : "";
  const url = typeof input.jdUrl === "string" ? input.jdUrl.trim() : "";

  if (url && /^https?:\/\//i.test(url)) {
    const fetched = await fetchJdTextFromUrl(url);
    if (fetched.ok) {
      if (pasted.length >= 80) {
        return { text: pasted, source: "text", meta: fetched };
      }
      return { text: fetched.text, source: "url", meta: fetched };
    }
    if (pasted.length >= 15) return { text: pasted, source: "text", meta: fetched };
    return { text: "", source: "none", meta: fetched };
  }

  if (pasted.length >= 15) return { text: pasted, source: "text" };
  return { text: "", source: "none" };
}
