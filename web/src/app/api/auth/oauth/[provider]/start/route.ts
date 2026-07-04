import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getOAuthAdapter } from "@/lib/oauth";

const STATE_COOKIE = "hr_in_oauth_state";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const adapter = getOAuthAdapter(provider);

  if (!adapter) {
    return NextResponse.json({ error: "지원하지 않는 로그인 방식입니다." }, { status: 400 });
  }

  const state = randomUUID();
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분 — 인가 화면에서 오래 머물러도 실패하지 않도록
  });

  return NextResponse.redirect(adapter.getAuthUrl(state));
}
