import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveCompetencies } from "@/lib/competency/bank";
import {
  canUseInterviewKitBuilder,
  MIN_ORG_KIT_QUESTIONS,
  parseSelectedQuestionIds,
  platformRubricOptions,
  RECOMMENDED_ORG_KIT_QUESTIONS,
} from "@/lib/org/interview-kit";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { COMPETENCY_CODES } from "@/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const access = await canUseInterviewKitBuilder(user);
  if (!access.allowed) {
    const status =
      access.reason === "not_admin" || access.reason === "no_org" ? 403 : 402;
    return NextResponse.json(
      {
        error:
          access.reason === "plan_required"
            ? "ORG_STANDARD 또는 ORG_ENTERPRISE 플랜이 필요합니다."
            : "권한이 없습니다.",
        code: access.reason,
      },
      { status }
    );
  }

  const organizationId = user.organizationId!;

  const [competencies, questions, kits] = await Promise.all([
    getActiveCompetencies(),
    prisma.question.findMany({
      where: { isActive: true, competency: { isActive: true } },
      orderBy: [{ competency: { sortOrder: "asc" } }, { level: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        externalId: true,
        level: true,
        template: true,
        competency: { select: { code: true } },
      },
    }),
    prisma.orgInterviewKit.findMany({
      where: { organizationId },
    }),
  ]);

  const competencyRows = await prisma.competency.findMany({
    where: { code: { in: competencies.map((c) => c.code) } },
    select: { code: true, rubricByLevel: true },
  });
  const rubricByCode = new Map(competencyRows.map((c) => [c.code, c.rubricByLevel]));

  return NextResponse.json({
    organizationId,
    limits: {
      min: MIN_ORG_KIT_QUESTIONS,
      recommended: RECOMMENDED_ORG_KIT_QUESTIONS,
    },
    competencies: competencies.map((c) => ({
      code: c.code,
      nameKo: c.nameKo,
      description: c.description,
      platformRubricOptions: platformRubricOptions(c.code, rubricByCode.get(c.code)),
    })),
    questions: questions.map((q) => ({
      id: q.id,
      externalId: q.externalId,
      competencyCode: q.competency.code,
      level: q.level,
      template: q.template,
    })),
    kits: kits.map((k) => ({
      competency: k.competency,
      selectedQuestionIds: parseSelectedQuestionIds(k.selectedQuestionIds),
      customRubricCriteria: parseRubricCriteria(k.customRubricCriteria),
      updatedAt: k.updatedAt.toISOString(),
    })),
    competencyCodes: [...COMPETENCY_CODES],
  });
}

type PutBody = {
  competency?: string;
  selectedQuestionIds?: string[];
  customRubricCriteria?: string[];
};

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const access = await canUseInterviewKitBuilder(user);
  if (!access.allowed) {
    const status =
      access.reason === "not_admin" || access.reason === "no_org" ? 403 : 402;
    return NextResponse.json(
      {
        error:
          access.reason === "plan_required"
            ? "ORG_STANDARD 또는 ORG_ENTERPRISE 플랜이 필요합니다."
            : "권한이 없습니다.",
        code: access.reason,
      },
      { status }
    );
  }

  const body = (await req.json()) as PutBody;
  const competency = typeof body.competency === "string" ? body.competency.trim() : "";
  if (!competency || !(COMPETENCY_CODES as readonly string[]).includes(competency)) {
    return NextResponse.json({ error: "유효한 역량 코드가 필요합니다." }, { status: 400 });
  }

  const selectedQuestionIds = Array.isArray(body.selectedQuestionIds)
    ? body.selectedQuestionIds.filter((id): id is string => typeof id === "string")
    : [];
  const customRubricCriteria = Array.isArray(body.customRubricCriteria)
    ? body.customRubricCriteria
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
    : [];

  if (selectedQuestionIds.length > 0 && selectedQuestionIds.length < MIN_ORG_KIT_QUESTIONS) {
    return NextResponse.json(
      {
        error: `최소 ${MIN_ORG_KIT_QUESTIONS}개 이상의 문항을 선택해야 합니다.`,
        min: MIN_ORG_KIT_QUESTIONS,
      },
      { status: 400 }
    );
  }

  if (selectedQuestionIds.length > 0) {
    const validCount = await prisma.question.count({
      where: {
        id: { in: selectedQuestionIds },
        isActive: true,
        competency: { code: competency, isActive: true },
      },
    });
    if (validCount !== selectedQuestionIds.length) {
      return NextResponse.json(
        { error: "선택한 문항 중 이 역량에 속하지 않거나 비활성 문항이 있습니다." },
        { status: 400 }
      );
    }
  }

  const organizationId = user.organizationId!;

  const kit = await prisma.orgInterviewKit.upsert({
    where: { organizationId_competency: { organizationId, competency } },
    create: {
      organizationId,
      competency,
      selectedQuestionIds,
      customRubricCriteria,
      updatedByUserId: user.id,
    },
    update: {
      selectedQuestionIds,
      customRubricCriteria,
      updatedByUserId: user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    kit: {
      competency: kit.competency,
      selectedQuestionIds: parseSelectedQuestionIds(kit.selectedQuestionIds),
      customRubricCriteria: parseRubricCriteria(kit.customRubricCriteria),
      updatedAt: kit.updatedAt.toISOString(),
    },
  });
}

/** 역량별 설정 초기화 — 플랫폼 기본값으로 되돌림 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const access = await canUseInterviewKitBuilder(user);
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const competency = searchParams.get("competency")?.trim() ?? "";
  if (!competency || !(COMPETENCY_CODES as readonly string[]).includes(competency)) {
    return NextResponse.json({ error: "유효한 역량 코드가 필요합니다." }, { status: 400 });
  }

  await prisma.orgInterviewKit.deleteMany({
    where: { organizationId: user.organizationId!, competency },
  });

  return NextResponse.json({ ok: true });
}
