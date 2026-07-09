import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOAuthAdapter } from "@/lib/oauth";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/jwt";

const STATE_COOKIE = "hr_in_oauth_state";

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/demo";
  return raw;
}

function oauthConfigured(provider: string): boolean {
  if (provider === "kakao") {
    return Boolean(process.env.KAKAO_CLIENT_ID?.trim());
  }
  if (provider === "naver") {
    return Boolean(process.env.NAVER_CLIENT_ID?.trim() && process.env.NAVER_CLIENT_SECRET?.trim());
  }
  return false;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const adapter = getOAuthAdapter(provider);

  if (!adapter) {
    return NextResponse.json({ error: "지원하지 않는 로그인 방식입니다." }, { status: 400 });
  }

  if (!oauthConfigured(provider)) {
    const loginUrl = new URL("/auth/login", req.url);
    const label = provider === "naver" ? "네이버" : "카카오";
    loginUrl.searchParams.set(
      "error",
      `${label} 로그인이 아직 설정되지 않았습니다. 이메일로 로그인해 주세요.`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));

  const state = randomUUID();
  const response = NextResponse.redirect(adapter.getAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(OAUTH_NEXT_COOKIE, next, OAUTH_COOKIE_OPTIONS);
  return response;
}
