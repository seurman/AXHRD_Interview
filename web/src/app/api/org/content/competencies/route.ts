import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { parseRubricByLevel } from "@/lib/competency/rubric";
import {
  generateOrgCompetencyCode,
  resolveOrgContentAccess,
} from "@/lib/content/org-access";
import { serializeCompetencyRow } from "@/lib/content/promote";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

const ACCESS_ERRORS: Record<string, string> = {
  not_authenticated: "로그인이 필요합니다.",
  not_admin: "기관 ADMIN 권한이 필요합니다.",
  read_only: "조회만 가능합니다. 편집은 기관 ADMIN에게 문의하세요.",
  no_org: "대상 기관을 찾을 수 없습니다.",
  not_enabled: "SaaS 개인화 권한이 부여되지 않은 기관입니다.",
};

function accessError(reason: string, status = 403) {
  return NextResponse.json(
    { error: ACCESS_ERRORS[reason] ?? "권한이 없습니다.", code: reason },
    { status }
  );
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const access = await resolveOrgContentAccess(user, searchParams.get("organizationId"));
  if (!access.allowed) {
    const status = access.reason === "not_authenticated" ? 401 : 403;
    return accessError(access.reason, status);
  }

  const [platformBank, orgRows] = await Promise.all([
    loadContentBankSnapshot(),
    prisma.competency.findMany({
      where: { organizationId: access.organizationId, ownerScope: "ORG" },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        organization: { select: { name: true } },
        forkedFrom: { select: { code: true, nameKo: true, rubricByLevel: true } },
        _count: { select: { questions: true } },
      },
    }),
  ]);

  return NextResponse.json({
    organizationId: access.organizationId,
    organizationName: access.organizationName,
    canWrite: access.canWrite,
    platformCompetencies: platformBank.competencies
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        code: c.code,
        nameKo: c.nameKo,
        description: c.description,
        rubricByLevel: parseRubricByLevel(c.rubricByLevel),
        ownerScope: "PLATFORM",
        questionCount: c.questionCount,
      })),
    orgCompetencies: orgRows.map(serializeCompetencyRow),
  });
}

type PostBody = {
  forkedFromId?: string;
  nameKo?: string;
  definition?: string;
  rubricByLevel?: Record<string, string[]>;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const access = await resolveOrgContentAccess(user, searchParams.get("organizationId"), {
    requireWrite: true,
  });
  if (!access.allowed) {
    const status =
      access.reason === "not_authenticated" ? 401 : access.reason === "read_only" ? 403 : 403;
    return accessError(access.reason, status);
  }

  const body = (await req.json()) as PostBody;
  const nameKo = typeof body.nameKo === "string" ? body.nameKo.trim() : "";
  const definition = typeof body.definition === "string" ? body.definition.trim() : "";
  const rubricByLevel = body.rubricByLevel ?? {};
  if (!nameKo) {
    return NextResponse.json({ error: "역량명(nameKo)이 필요합니다." }, { status: 400 });
  }

  let forkedFromId: string | null = null;
  if (body.forkedFromId) {
    const base = await prisma.competency.findFirst({
      where: {
        id: body.forkedFromId,
        OR: [PLATFORM_OWNER_FILTER, { organizationId: access.organizationId, ownerScope: "ORG" }],
      },
    });
    if (!base) {
      return NextResponse.json({ error: "복제 원본 역량을 찾을 수 없습니다." }, { status: 400 });
    }
    forkedFromId = base.ownerScope === "PLATFORM" ? base.id : base.forkedFromId ?? base.id;
  }

  const code = await generateOrgCompetencyCode(access.organizationId, forkedFromId);
  const created = await prisma.competency.create({
    data: {
      code,
      nameKo,
      description: definition || null,
      rubricByLevel: rubricByLevel as Prisma.InputJsonValue,
      ownerScope: "ORG",
      organizationId: access.organizationId,
      forkedFromId,
      createdByUserId: user!.id,
      source: "CUSTOM",
      isActive: true,
    },
    include: {
      organization: { select: { name: true } },
      forkedFrom: { select: { code: true, nameKo: true, rubricByLevel: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ competency: serializeCompetencyRow(created) }, { status: 201 });
}
