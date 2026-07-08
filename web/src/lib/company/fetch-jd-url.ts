/**
 * 채용공고 URL → 본문 텍스트 추출.
 * SSRF 방지를 위해 private/metadata 호스트를 차단하고, HTML은 단순 텍스트로 정리한다.
 */

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_TEXT_CHARS = 12_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  // IPv4 private / link-local / CGNAT
  if (/^(10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(host)) return true;
  // IPv6 local / unique local
  if (host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }
  return false;
}

export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Prefer main / article / job description blocks when present
  const mainMatch =
    text.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    text.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    text.match(/<(?:div|section)[^>]*(?:job|description|posting|recruit)[^>]*>([\s\S]*?)<\/(?:div|section)>/i);

  if (mainMatch?.[1] && mainMatch[1].replace(/<[^>]+>/g, "").trim().length > 200) {
    text = mainMatch[1];
  }

  text = text
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
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

  return text.slice(0, MAX_TEXT_CHARS);
}

export type FetchJdUrlResult =
  | { ok: true; url: string; title: string | null; text: string; bytes: number; ms: number }
  | { ok: false; error: string; status?: number };

export async function fetchJdTextFromUrl(rawUrl: string): Promise<FetchJdUrlResult> {
  const started = Date.now();
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
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
        "User-Agent": "AXHRD-JDFetcher/1.0 (+https://app.axhrd.com)",
      },
    });

    // Re-check final URL after redirects
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

    if (text.length < 40) {
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
      // Prefer pasted if user already provided substantial text
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
