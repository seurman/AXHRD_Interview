import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOAuthAdapter } from "@/lib/oauth";
import { setSessionCookie } from "@/lib/auth/session";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { OAuthProvider as PrismaOAuthProvider } from "@prisma/client";

const STATE_COOKIE = "hr_in_oauth_state";

function toPrismaProvider(provider: string): PrismaOAuthProvider {
  return provider.toUpperCase() as PrismaOAuthProvider;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const adapter = getOAuthAdapter(provider);
  const loginUrl = new URL("/auth/login", req.url);

  if (!adapter) {
    loginUrl.searchParams.set("error", "지원하지 않는 로그인 방식입니다.");
    return NextResponse.redirect(loginUrl);
  }

  // 콜백은 로그인 전이라 사용자 식별이 안 되므로 IP 기준으로 남용 방지
  const ip = getClientIp(req);
  const rl = checkRateLimit(`oauth:callback:${provider}:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    loginUrl.searchParams.set("error", "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    return NextResponse.redirect(loginUrl);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    loginUrl.searchParams.set("error", "로그인이 취소되었습니다.");
    return NextResponse.redirect(loginUrl);
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    loginUrl.searchParams.set("error", "로그인 요청이 유효하지 않습니다. 다시 시도해 주세요.");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { accessToken } = await adapter.exchangeCode(code, state);
    const profile = await adapter.fetchProfile(accessToken);
    const prismaProvider = toPrismaProvider(provider);

    const user = await linkOrCreateUser(prismaProvider, profile);

    await setSessionCookie(user.id);

    const nextRaw = jar.get(OAUTH_NEXT_COOKIE)?.value;
    jar.delete(OAUTH_NEXT_COOKIE);
    const next =
      nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
        ? nextRaw
        : "/dashboard";

    return NextResponse.redirect(new URL(next, req.url));
  } catch (e) {
    console.error(`[oauth/${provider}/callback]`, e);
    loginUrl.searchParams.set("error", "로그인 처리 중 오류가 발생했습니다.");
    return NextResponse.redirect(loginUrl);
  }
}

async function linkOrCreateUser(
  provider: PrismaOAuthProvider,
  profile: { providerAccountId: string; email: string | null; name: string | null }
) {
  // 1) 이미 연동된 계정이면 그대로 로그인
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  // 2) 이메일이 있고 기존 이메일/비밀번호 계정과 일치하면 계정 연동(중복 가입 방지)
  if (profile.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existingUser) {
      await prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerAccountId: profile.providerAccountId,
          providerEmail: profile.email,
        },
      });
      return existingUser;
    }
  }

  // 3) 신규 사용자 생성
  // 이메일 동의를 거부한 경우를 대비해 placeholder 이메일 부여 (User.email이 필수·unique이므로)
  const email =
    profile.email ?? `${provider.toLowerCase()}_${profile.providerAccountId}@oauth.hr-in.local`;

  return prisma.user.create({
    data: {
      email,
      name: profile.name?.trim() || "회원",
      passwordHash: null,
      profile: { create: {} },
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
          providerEmail: profile.email,
        },
      },
    },
  });
}
