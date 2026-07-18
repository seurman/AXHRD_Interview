import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
  toCandidateScenarioPayload,
} from "@/lib/assessment/load-scenario-context";

type StartBody = {
  scenarioId?: string;
  scenarioCode?: string;
  /** 기관 배포 링크로 진입한 경우 — /a/[slug] */
  shareSlug?: string;
};

/** 역량평가 시도 시작. 진행 중(IN_PROGRESS) 시도가 있으면 새로 만들지 않고 그걸 반환한다. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(`assessment:start:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: StartBody;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 배포 링크 검증(있는 경우) — 비활성/만료/미승인 기관/기능 미부여면 404로 숨긴다
  let orgShareId: string | null = null;
  let shareScenarioId: string | null = null;
  if (body.shareSlug) {
    const share = await prisma.orgAssessmentShare.findUnique({
      where: { slug: body.shareSlug },
      include: {
        organization: { select: { status: true, assessmentEnabled: true } },
      },
    });
    if (
      !share ||
      !share.isActive ||
      (share.expiresAt && share.expiresAt.getTime() < Date.now()) ||
      share.organization.status !== "APPROVED" ||
      !share.organization.assessmentEnabled
    ) {
      return NextResponse.json(
        { error: "링크를 찾을 수 없거나 만료되었습니다." },
        { status: 404 },
      );
    }
    orgShareId = share.id;
    shareScenarioId = share.scenarioId;
  }

  const scenario = await prisma.assessmentScenario.findFirst({
    where: {
      isActive: true,
      ...(shareScenarioId
        ? { id: shareScenarioId }
        : body.scenarioId
          ? { id: body.scenarioId }
          : body.scenarioCode
            ? { code: body.scenarioCode }
            : { id: "__none__" }),
      // 배포 링크 진입이 아니면: 플랫폼 공용 또는 본인 기관 시나리오만
      ...(shareScenarioId
        ? {}
        : {
            OR: [
              { organizationId: null },
              ...(user.organizationId
                ? [{ organizationId: user.organizationId }]
                : []),
            ],
          }),
    },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!scenario) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  // 같은 시나리오의 진행 중 시도 재사용(중복 생성 방지)
  const existing = await prisma.assessmentAttempt.findFirst({
    where: {
      userId: user.id,
      scenarioId: scenario.id,
      status: { in: ["DRAFT", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const attempt =
    existing ??
    (await prisma.assessmentAttempt.create({
      data: {
        userId: user.id,
        scenarioId: scenario.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        orgShareId,
        // 역할연기는 상대역의 고정 첫 발화로 대화를 연다(LLM 호출 없음)
        dialogueJson:
          scenario.kind === "ROLE_PLAY" && scenario.openingLine
            ? [{ role: "PERSONA", text: scenario.openingLine, at: Date.now() }]
            : [],
      },
    }));

  return NextResponse.json({
    attemptId: attempt.id,
    scenario: toCandidateScenarioPayload(scenario),
  });
}
