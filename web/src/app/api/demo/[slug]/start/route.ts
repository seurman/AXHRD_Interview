import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsageLimit } from "@/lib/billing/usage";
import { isUsageExemptUser } from "@/lib/auth/roles";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { startInterviewSession } from "@/lib/interview/start-session";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * 고객 데모 공개 URL에서 모의면접 실행.
 * DemoWorkspace에 Global만 있어도 MAPS_TO로 NCS 면접 역량에 연결해 IRT 세션을 연다.
 * (DemoQuestion은 쇼케이스용 — 실제 채점 루프는 운영 Question 뱅크 사용)
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

  const body = await req.json().catch(() => ({}));
  const requested =
    typeof body.focusCompetency === "string" ? body.focusCompetency.trim().toUpperCase() : "";
  const jobRole = typeof body.jobRole === "string" ? body.jobRole : "OTHER";

  const ncsInKit = active
    .map((c) => c.code)
    .filter((code): code is CompetencyCode =>
      (COMPETENCY_CODES as readonly string[]).includes(code),
    );

  const globalCodes = active
    .map((c) => c.code)
    .filter((code) => !(COMPETENCY_CODES as readonly string[]).includes(code));

  // Global → NCS via MAPS_TO (edge is NCS → Global)
  const maps =
    globalCodes.length > 0
      ? await prisma.conceptRelation.findMany({
          where: {
            isActive: true,
            edgeType: "MAPS_TO",
            fromKind: "NCS_COMPETENCY",
            toKind: "GLOBAL_COMPETENCY",
            toKey: { in: globalCodes },
          },
          orderBy: { weight: "desc" },
        })
      : [];

  const globalToNcs = new Map<string, string>();
  for (const m of maps) {
    if (!globalToNcs.has(m.toKey)) globalToNcs.set(m.toKey, m.fromKey);
  }

  const mappedFromGlobal = [...new Set(globalToNcs.values())].filter((code): code is CompetencyCode =>
    (COMPETENCY_CODES as readonly string[]).includes(code),
  );

  const allowedSet = new Set<string>([...ncsInKit, ...mappedFromGlobal]);
  if (allowedSet.size === 0) {
    return NextResponse.json(
      {
        error:
          "이 키트의 역량으로는 IRT 면접을 시작할 수 없습니다. NCS 역량을 하나 이상 키트에 넣거나, Meaning Layer MAPS_TO 시드를 적용해 주세요.",
      },
      { status: 409 },
    );
  }

  let focus = requested;
  if (focus && !(COMPETENCY_CODES as readonly string[]).includes(focus)) {
    focus = globalToNcs.get(focus) ?? "";
  }
  if (!focus || !allowedSet.has(focus)) {
    focus = ncsInKit[0] ?? mappedFromGlobal[0] ?? [...allowedSet][0];
  }

  const result = await startInterviewSession(
    user,
    {
      companyName: snap.workspace.name,
      jobRole,
      focusCompetency: focus,
      industry: "OTHER",
    },
    {
      allowedCompetencies: [...allowedSet],
    },
  );

  if (result.ok) {
    return NextResponse.json({
      ...result.body,
      demoSlug: snap.workspace.slug,
      demoName: snap.workspace.name,
      resolvedFocus: focus,
      mappedFrom: requested && requested !== focus ? requested : null,
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
