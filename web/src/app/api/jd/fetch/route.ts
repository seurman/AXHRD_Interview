import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchJdTextFromUrl } from "@/lib/company/fetch-jd-url";

export const maxDuration = 20;

/** 면접 설정의 채용공고 URL → 본문 텍스트 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`jd:fetch:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "URL을 입력해 주세요." }, { status: 400 });
  }

  const result = await fetchJdTextFromUrl(url);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status && result.status >= 400 ? result.status : 422 });
  }

  return NextResponse.json({
    url: result.url,
    title: result.title,
    text: result.text,
    bytes: result.bytes,
    ms: result.ms,
    chars: result.text.length,
  });
}
