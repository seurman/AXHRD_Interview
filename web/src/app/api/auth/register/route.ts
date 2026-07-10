import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { applySessionCookie } from "@/lib/auth/session";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { clientIpFromRequest, evaluateSignupAnomaly } from "@/lib/auth/signup-anomaly";

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, next, dataUseConsent } = await req.json();

    if (!email?.trim() || !password || password.length < 8) {
      return NextResponse.json(
        { error: "이메일과 비밀번호(8자 이상)를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
    }
    if (dataUseConsent !== true) {
      return NextResponse.json(
        { error: "데이터 활용 동의가 필요합니다." },
        { status: 400 },
      );
    }

    const normalized = normalizeEmail(email);
    const exists = await prisma.user.findUnique({
      where: { email: normalized },
      include: { profile: true },
    });

    if (exists?.passwordHash) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인해 주세요." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);
    const ip = clientIpFromRequest(req);
    const signupFlag = evaluateSignupAnomaly(ip, normalized);
    const now = new Date();

    const user = exists
      ? await prisma.user.update({
          where: { id: exists.id },
          data: {
            name: name.trim(),
            phone: phone?.trim(),
            passwordHash,
            dataUseConsentAt: now,
            signupFlag,
            ...(!exists.profile ? { profile: { create: {} } } : {}),
          },
        })
      : await prisma.user.create({
          data: {
            email: normalized,
            name: name.trim(),
            phone: phone?.trim(),
            passwordHash,
            dataUseConsentAt: now,
            signupFlag,
            profile: { create: {} },
          },
        });

    await syncSuperadminPlatformRole(user.id, user.email);
    const accessContext = await loadPersonalAccessContext(user.id);
    const redirect = resolvePostLoginRedirect(user, accessContext, next);

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      upgraded: Boolean(exists),
      redirect,
    });
    await applySessionCookie(response, user.id);
    return response;
  } catch (e) {
    console.error("[auth/register]", e);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
