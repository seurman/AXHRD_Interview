import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUsageExemptUser, canManageDemoWorkspaces } from "@/lib/auth/roles";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { ensureDemoKitMaterialized } from "@/lib/demo/materialize";
import { startInterviewSession } from "@/lib/interview/start-session";
import {
  createDemoPresenterToken,
  DEMO_PRESENTER_COOKIE,
} from "@/lib/demo/presenter-tokens";
import {
  getOrCreateDemoPresenterUser,
  validatePresenterKey,
} from "@/lib/demo/presenter";
import { warmIrtEngine } from "@/lib/irt-client";

export const maxDuration = 120;

type Ctx = { params: Promise<{ slug: string }> };

/**
 * 고객 데모 공개 URL → 모의면접 실행.
 * - 로그인 사용자: 일반 시작
 * - 시연 키(?pk=) 또는 관리자: 로그인 없이 시연 세션 시작
 */
export async function POST(req: Request, { params }: Ctx) {
  const { slug: rawSlug } = await params;
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug);
    } catch {
      return rawSlug;
    }
  })();

  const body = await req.json().catch(() => ({}));
  const presenterKey =
    typeof body.presenterKey === "string" ? body.presenterKey.trim() : "";
  const presenterMode = body.presenterMode === true || !!presenterKey;

  const user = await getCurrentUser();
  const presenterAuth = presenterKey
    ? await validatePresenterKey(slug, presenterKey)
    : null;

  if (presenterMode) {
    if (!presenterAuth && !user) {
      return NextResponse.json(
        { error: "시연 키가 필요합니다." },
        { status: 401 },
      );
    }
    if (!presenterAuth && user && !canManageDemoWorkspaces(user)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  } else if (!user) {
    return NextResponse.json(
      {
        error: "로그인이 필요합니다.",
        redirect: `/auth/login?next=${encodeURIComponent(`/demo/${encodeURIComponent(slug)}`)}`,
      },
      { status: 401 },
    );
  }

  const snap = await loadDemoWorkspaceBySlug(slug);
  if (!snap) {
    return NextResponse.json(
      { error: "데모를 찾을 수 없습니다. 관리자 화면에서 미리보기 URL을 다시 확인해 주세요." },
      { status: 404 },
    );
  }

  const active = snap.competencies.filter((c) => c.isActive);
  if (active.length === 0) {
    return NextResponse.json(
      { error: "키트에 활성 역량이 없습니다. 데모 편집에서 역량을 추가해 주세요." },
      { status: 409 },
    );
  }

  const withQuestions = active.filter((c) => c.questionCount > 0);
  if (withQuestions.length === 0) {
    return NextResponse.json(
      { error: "키트 역량에 문항이 없습니다. 질의 조정에서 문항을 추가해 주세요." },
      { status: 409 },
    );
  }

  const actorUser = presenterMode
    ? await getOrCreateDemoPresenterUser()
    : user!;

  const rl = checkRateLimit(`interview:start:${actorUser.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "면접 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!presenterMode && user) {
    const exempt = isUsageExemptUser({
      email: user.email,
      platformRole: user.platformRole,
    });
    if (!exempt) {
      const { checkUsageLimit } = await import("@/lib/billing/usage");
      const usage = await checkUsageLimit(user.id, "mock_interview");
      if (!usage.allowed) {
        return NextResponse.json(
          {
            error: usage.message,
            code: "PLAN_LIMIT_EXCEEDED",
            upgradeUrl: usage.upgradeUrl,
            used: usage.used,
            limit: usage.limit,
          },
          { status: 402 },
        );
      }
    }
  }

  const [materialize] = await Promise.all([
    ensureDemoKitMaterialized(snap.workspace.id).catch((e) => {
      console.error("[demo/start materialize]", e);
      throw e;
    }),
    warmIrtEngine().catch(() => ({ ok: false, elapsedMs: 0 })),
  ]);

  if (materialize.codes.length === 0 || materialize.questionCount === 0) {
    return NextResponse.json(
      { error: "면접에 쓸 문항을 준비하지 못했습니다. 키트 문항을 확인해 주세요." },
      { status: 409 },
    );
  }

  const requested =
    typeof body.focusCompetency === "string" ? body.focusCompetency.trim().toUpperCase() : "";
  const jobRole = typeof body.jobRole === "string" ? body.jobRole : "OTHER";

  const allowed = materialize.codes;
  const focus =
    requested && allowed.includes(requested) ? requested : withQuestions[0]?.code ?? allowed[0];

  const result = await startInterviewSession(
    actorUser,
    {
      companyName: snap.workspace.name,
      jobRole,
      focusCompetency: focus,
      industry: "OTHER",
    },
    {
      allowedCompetencies: allowed,
      allowAnyCompetencyCode: true,
      kitOrganizationId: null,
      demoMode: true,
      isPresenterDemo: presenterMode,
      demoWorkspaceId: snap.workspace.id,
    },
  );

  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  const payload = {
    ...result.body,
    demoSlug: snap.workspace.slug,
    demoName: snap.workspace.name,
    resolvedFocus: focus,
    materialize,
    presenterMode,
  };

  if (presenterMode) {
    const token = await createDemoPresenterToken(result.body.sessionId);
    const res = NextResponse.json(payload);
    res.cookies.set(DEMO_PRESENTER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 4 * 60 * 60,
    });
    return res;
  }

  return NextResponse.json(payload);
}
