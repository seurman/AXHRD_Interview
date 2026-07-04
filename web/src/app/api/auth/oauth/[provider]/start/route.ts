import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getOAuthAdapter } from "@/lib/oauth";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/jwt";

const STATE_COOKIE = "hr_in_oauth_state";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const adapter = getOAuthAdapter(provider);

  if (!adapter) {
    return NextResponse.json({ error: "지원하지 않는 로그인 방식입니다." }, { status: 400 });
  }

  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));

  const state = randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set(OAUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(adapter.getAuthUrl(state));
}
