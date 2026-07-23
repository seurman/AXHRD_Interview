import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { applySessionCookie } from "@/lib/auth/session";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { recordUserLogin } from "@/lib/auth/presence";
import { clientIpFromRequest, evaluateSignupAnomaly } from "@/lib/auth/signup-anomaly";
import { createMembershipRequest } from "@/lib/org/membership";
import { acceptOrgInvitation } from "@/lib/org/invitations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, phone, next, dataUseConsent, joinCode, invite } = body as {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
      next?: string;
      dataUseConsent?: boolean;
      joinCode?: string;
      invite?: string;
    };

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

    let user = exists
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

    let membershipNote: string | null = null;
    let redirectOverride: string | null = null;

    const inviteToken = typeof invite === "string" ? invite.trim() : "";
    const code = typeof joinCode === "string" ? joinCode.trim().toUpperCase() : "";

    if (inviteToken) {
      try {
        const accepted = await acceptOrgInvitation(inviteToken, user.id);
        membershipNote = `${accepted.organization.name} 초대를 수락했습니다.`;
        redirectOverride = "/org/dashboard";
        user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      } catch (e) {
        membershipNote =
          e instanceof Error ? `초대 수락 실패: ${e.message}` : "초대 수락에 실패했습니다.";
        redirectOverride = `/org/invite/${inviteToken}`;
      }
    } else if (code) {
      try {
        const result = await createMembershipRequest({
          userId: user.id,
          joinCode: code,
        });
        if (result.mode === "joined") {
          membershipNote = `${result.organization.name}에 소속되었습니다.`;
          redirectOverride = "/dashboard/jobseeker";
        } else {
          membershipNote = `${result.organization.name} 승인 대기 중입니다.`;
          redirectOverride = "/org/setup";
        }
        user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      } catch (e) {
        membershipNote =
          e instanceof Error ? `기관 연결 실패: ${e.message}` : "기관 연결에 실패했습니다.";
        redirectOverride = "/org/setup";
      }
    }

    await syncSuperadminPlatformRole(user.id, user.email);
    const accessContext = await loadPersonalAccessContext(user.id);
    const redirect =
      redirectOverride ?? resolvePostLoginRedirect(user, accessContext, next);

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      upgraded: Boolean(exists),
      redirect,
      membershipNote,
    });
    await recordUserLogin(user.id);
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
