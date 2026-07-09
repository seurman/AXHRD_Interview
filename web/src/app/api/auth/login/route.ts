import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { applySessionCookie } from "@/lib/auth/session";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";

export async function POST(req: Request) {
  try {
    const { email, password, next } = await req.json();

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    if (!user) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "비밀번호가 설정되지 않은 계정입니다. 회원가입 페이지에서 같은 이메일로 비밀번호를 설정해 주세요.",
        },
        { status: 401 },
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    await syncSuperadminPlatformRole(user.id, user.email);
    const accessContext = await loadPersonalAccessContext(user.id);
    const redirect = resolvePostLoginRedirect(user, accessContext, next);

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      redirect,
    });
    await applySessionCookie(response, user.id);
    return response;
  } catch (e) {
    console.error("[auth/login]", e);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
