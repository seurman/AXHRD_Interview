import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOAuthAdapter } from "@/lib/oauth";
import { applySessionCookie } from "@/lib/auth/session";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { recordUserLogin } from "@/lib/auth/presence";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { OAuthProvider as PrismaOAuthProvider } from "@prisma/client";

const STATE_COOKIE = "hr_in_oauth_state";

function toPrismaProvider(provider: string): PrismaOAuthProvider {
  return provider.toUpperCase() as PrismaOAuthProvider;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const adapter = getOAuthAdapter(provider);
  const loginUrl = new URL("/auth/login", req.url);

  if (!adapter) {
    loginUrl.searchParams.set("error", "지원하지 않는 로그인 방식입니다.");
    return NextResponse.redirect(loginUrl);
  }

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

    await syncSuperadminPlatformRole(user.id, user.email);
    await recordUserLogin(user.id);

    const nextRaw = jar.get(OAUTH_NEXT_COOKIE)?.value;
    jar.delete(OAUTH_NEXT_COOKIE);

    const accessContext = await loadPersonalAccessContext(user.id);
    const redirectTo = resolvePostLoginRedirect(user, accessContext, nextRaw);

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    await applySessionCookie(response, user.id);
    return response;
  } catch (e) {
    console.error(`[oauth/${provider}/callback]`, e);
    loginUrl.searchParams.set("error", "로그인 처리 중 오류가 발생했습니다.");
    return NextResponse.redirect(loginUrl);
  }
}

async function linkOrCreateUser(
  provider: PrismaOAuthProvider,
  profile: { providerAccountId: string; email: string | null; name: string | null },
) {
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
