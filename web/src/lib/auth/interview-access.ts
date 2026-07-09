import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  DEMO_PRESENTER_COOKIE,
  verifyDemoPresenterToken,
} from "@/lib/demo/presenter-tokens";

async function readPresenterToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEMO_PRESENTER_COOKIE)?.value ?? null;
}

function readPresenterTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`${DEMO_PRESENTER_COOKIE}=([^;]+)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function resolveWithToken(
  sessionId: string,
  token: string | null,
): Promise<{ userId: string; isPresenter: boolean } | null> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, isPresenterDemo: true },
  });
  if (!session) return null;

  const user = await getCurrentUser();
  if (user && session.userId === user.id) {
    return { userId: user.id, isPresenter: false };
  }

  if (
    session.isPresenterDemo &&
    token &&
    (await verifyDemoPresenterToken(token, sessionId))
  ) {
    return { userId: session.userId, isPresenter: true };
  }

  return null;
}

/** 면접 페이지 — 로그인 사용자 또는 유효한 시연 쿠키 */
export async function resolveInterviewActor(sessionId: string) {
  const token = await readPresenterToken();
  return resolveWithToken(sessionId, token);
}

/** API Route — Request 쿠키에서 시연 세션 확인 */
export async function resolveInterviewActorFromRequest(
  req: Request,
  sessionId: string,
) {
  const token = readPresenterTokenFromRequest(req);
  return resolveWithToken(sessionId, token);
}
