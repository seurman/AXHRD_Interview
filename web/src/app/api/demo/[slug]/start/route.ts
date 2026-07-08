import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsageLimit } from "@/lib/billing/usage";
import { isUsageExemptUser } from "@/lib/auth/roles";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { materializeDemoKitToInterviewBank } from "@/lib/demo/materialize";
import { startInterviewSession } from "@/lib/interview/start-session";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * 고객 데모 공개 URL → 모의면접 실행.
 * 키트에 NCS가 없어도 DemoCompetency/Question을 운영 뱅크에 재료화한 뒤 IRT 세션을 연다.
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

  const user = await getCurrentUser();
  if (!user) {
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

  const rl = checkRateLimit(`interview:start:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "면접 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const exempt = isUsageExemptUser({
    email: user.email,
    platformRole: user.platformRole,
  });
  if (!exempt) {
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

  let materialize;
  try {
    materialize = await materializeDemoKitToInterviewBank(snap.workspace.id);
  } catch (e) {
    console.error("[demo/start materialize]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `면접용 문항 준비 실패: ${e.message}`
            : "면접용 문항 준비에 실패했습니다.",
      },
      { status: 500 },
    );
  }

  if (materialize.codes.length === 0 || materialize.questionCount === 0) {
    return NextResponse.json(
      { error: "면접에 쓸 문항을 준비하지 못했습니다. 키트 문항을 확인해 주세요." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const requested =
    typeof body.focusCompetency === "string" ? body.focusCompetency.trim().toUpperCase() : "";
  const jobRole = typeof body.jobRole === "string" ? body.jobRole : "OTHER";

  const allowed = materialize.codes;
  const focus =
    requested && allowed.includes(requested) ? requested : withQuestions[0]?.code ?? allowed[0];

  const result = await startInterviewSession(
    user,
    {
      companyName: snap.workspace.name,
      jobRole,
      focusCompetency: focus,
      industry: "OTHER",
    },
    {
      allowedCompetencies: allowed,
      allowAnyCompetencyCode: true,
    },
  );

  if (result.ok) {
    return NextResponse.json({
      ...result.body,
      demoSlug: snap.workspace.slug,
      demoName: snap.workspace.name,
      resolvedFocus: focus,
      materialize,
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
