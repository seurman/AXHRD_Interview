import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  generateAssessmentShareSlug,
  resolveAssessmentShareAccess,
} from "@/lib/org/assessment-share";

/** 내 기관 배포 링크 목록(+응시 현황) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const access = await resolveAssessmentShareAccess(user);
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 404 });
  }

  const shares = await prisma.orgAssessmentShare.findMany({
    where: { organizationId: access.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      scenario: { select: { titleKo: true, kind: true } },
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      slug: s.slug,
      label: s.label,
      isActive: s.isActive,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      scenarioTitle: s.scenario.titleKo,
      scenarioKind: s.scenario.kind,
      attemptCount: s._count.attempts,
    })),
  });
}

type CreateBody = {
  scenarioId?: string;
  label?: string;
  expiresAt?: string | null;
};

/** 배포 링크 생성 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const access = await resolveAssessmentShareAccess(user);
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 404 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const label = (body.label ?? "").trim();
  if (!label) {
    return NextResponse.json({ error: "캠페인 이름을 입력해 주세요." }, { status: 400 });
  }
  if (!body.scenarioId) {
    return NextResponse.json({ error: "과제를 선택해 주세요." }, { status: 400 });
  }

  // 플랫폼 공용 또는 우리 기관 시나리오만 배포 가능
  const scenario = await prisma.assessmentScenario.findFirst({
    where: {
      id: body.scenarioId,
      isActive: true,
      OR: [{ organizationId: null }, { organizationId: access.organizationId }],
    },
    select: { id: true },
  });
  if (!scenario) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "만료일 형식이 잘못됐습니다." }, { status: 400 });
    }
    expiresAt = d;
  }

  const share = await prisma.orgAssessmentShare.create({
    data: {
      organizationId: access.organizationId,
      scenarioId: scenario.id,
      slug: generateAssessmentShareSlug(),
      label,
      expiresAt,
      createdByUserId: user.id,
    },
  });

  return NextResponse.json({ id: share.id, slug: share.slug }, { status: 201 });
}
