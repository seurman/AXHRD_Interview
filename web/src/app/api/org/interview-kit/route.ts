import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import {
  MIN_ORG_KIT_QUESTIONS,
  parseOrgKitRubricByLevel,
  parseSelectedQuestionIds,
  RECOMMENDED_ORG_KIT_QUESTIONS,
  resolveInterviewKitAccess,
} from "@/lib/org/interview-kit";
import { parseRubricByLevel, type RubricByLevel } from "@/lib/competency/rubric";
import { COMPETENCY_CODES } from "@/types";

const ACCESS_ERRORS: Record<string, string> = {
  not_admin: "기관 ADMIN 권한이 필요합니다.",
  no_org: "대상 기관을 찾을 수 없습니다.",
  not_enabled: "SaaS 개인화 권한이 부여되지 않은 기관입니다. 슈퍼어드민에게 문의하세요.",
};

function accessErrorResponse(reason: string) {
  return NextResponse.json(
    { error: ACCESS_ERRORS[reason] ?? "권한이 없습니다.", code: reason },
    { status: 403 }
  );
}

async function resolveAccessFromRequest(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const access = await resolveInterviewKitAccess(user, organizationId);
  if (!access.allowed) {
    return { error: accessErrorResponse(access.reason) };
  }
  return { user, access };
}

export async function GET(req: Request) {
  const resolved = await resolveAccessFromRequest(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const organizationId = access.organizationId;
  const bank = await loadContentBankSnapshot();
  const kits = await prisma.orgInterviewKit.findMany({
    where: { organizationId },
  });

  const rubricByCode = new Map(bank.competencies.map((c) => [c.code, c.rubricByLevel]));

  return NextResponse.json({
    organizationId,
    organizationName: access.organizationName,
    mode: access.mode,
    limits: {
      min: MIN_ORG_KIT_QUESTIONS,
      recommended: RECOMMENDED_ORG_KIT_QUESTIONS,
    },
    competencies: bank.competencies
      .filter((c) => c.isActive)
      .map((c) => ({
        code: c.code,
        nameKo: c.nameKo,
        description: c.description,
        rubricByLevel: parseRubricByLevel(rubricByCode.get(c.code)),
      })),
    questions: bank.questions.map((q) => ({
      id: q.id,
      externalId: q.externalId,
      competencyCode: q.competencyCode,
      level: q.level,
      template: q.template,
      isActive: q.isActive,
      sortOrder: q.sortOrder,
    })),
    kits: kits.map((k) => ({
      competency: k.competency,
      selectedQuestionIds: parseSelectedQuestionIds(k.selectedQuestionIds),
      customRubricByLevel: parseOrgKitRubricByLevel(k.customRubricCriteria),
      updatedAt: k.updatedAt.toISOString(),
    })),
    competencyCodes: [...COMPETENCY_CODES],
  });
}

type PutBody = {
  competency?: string;
  selectedQuestionIds?: string[];
  customRubricByLevel?: RubricByLevel;
};

function normalizeCustomRubricByLevel(raw: unknown): RubricByLevel {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: RubricByLevel = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(val)) continue;
    const lines = val
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    if (lines.length > 0) out[key] = lines;
  }
  return out;
}

export async function PUT(req: Request) {
  const resolved = await resolveAccessFromRequest(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { user, access } = resolved;

  const body = (await req.json()) as PutBody;
  const competency = typeof body.competency === "string" ? body.competency.trim() : "";
  if (!competency || !(COMPETENCY_CODES as readonly string[]).includes(competency)) {
    return NextResponse.json({ error: "유효한 역량 코드가 필요합니다." }, { status: 400 });
  }

  const selectedQuestionIds = Array.isArray(body.selectedQuestionIds)
    ? body.selectedQuestionIds.filter((id): id is string => typeof id === "string")
    : [];
  const customRubricByLevel = normalizeCustomRubricByLevel(body.customRubricByLevel);

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

  const organizationId = access.organizationId;

  const kit = await prisma.orgInterviewKit.upsert({
    where: { organizationId_competency: { organizationId, competency } },
    create: {
      organizationId,
      competency,
      selectedQuestionIds,
      customRubricCriteria: customRubricByLevel as unknown as Prisma.InputJsonValue,
      updatedByUserId: user.id,
    },
    update: {
      selectedQuestionIds,
      customRubricCriteria: customRubricByLevel as unknown as Prisma.InputJsonValue,
      updatedByUserId: user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    kit: {
      competency: kit.competency,
      selectedQuestionIds: parseSelectedQuestionIds(kit.selectedQuestionIds),
      customRubricByLevel: parseOrgKitRubricByLevel(kit.customRubricCriteria),
      updatedAt: kit.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: Request) {
  const resolved = await resolveAccessFromRequest(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const { searchParams } = new URL(req.url);
  const competency = searchParams.get("competency")?.trim() ?? "";
  if (!competency || !(COMPETENCY_CODES as readonly string[]).includes(competency)) {
    return NextResponse.json({ error: "유효한 역량 코드가 필요합니다." }, { status: 400 });
  }

  await prisma.orgInterviewKit.deleteMany({
    where: { organizationId: access.organizationId, competency },
  });

  return NextResponse.json({ ok: true });
}
