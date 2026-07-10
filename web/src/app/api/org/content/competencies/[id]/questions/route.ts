import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  generateOrgQuestionExternalId,
  resolveOrgContentAccess,
} from "@/lib/content/org-access";
import { canEditCompetency } from "@/lib/content/ownership";
import { serializeQuestionRow } from "@/lib/content/promote";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const access = await resolveOrgContentAccess(user, null);
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const competency = await prisma.competency.findFirst({
    where: {
      id,
      OR: [
        { ownerScope: "PLATFORM", organizationId: null },
        { organizationId: access.organizationId, ownerScope: "ORG" },
      ],
    },
  });
  if (!competency) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const questions = await prisma.question.findMany({
    where: { competencyId: id, isActive: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    include: {
      competency: { select: { code: true, nameKo: true } },
      forkedFrom: { select: { template: true, level: true } },
    },
  });

  return NextResponse.json({
    competencyId: id,
    ownerScope: competency.ownerScope,
    readOnly: competency.ownerScope === "PLATFORM",
    questions: questions.map(serializeQuestionRow),
  });
}

type PostBody = {
  level?: number;
  template?: string;
  difficulty?: number;
  discrimination?: number;
  forkedFromId?: string;
};

export async function POST(req: Request, { params }: Params) {
  const { id: competencyId } = await params;
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const access = await resolveOrgContentAccess(user, searchParams.get("organizationId"), {
    requireWrite: true,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const competency = await prisma.competency.findUnique({ where: { id: competencyId } });
  if (!competency || competency.ownerScope !== "ORG") {
    return NextResponse.json(
      { error: "기관 소유 역량에만 문항을 추가할 수 있습니다." },
      { status: 400 }
    );
  }
  if (
    !canEditCompetency(competency, {
      isSuperadmin: Boolean(user && hasSuperadminAccess(user)),
      organizationId: access.organizationId,
    })
  ) {
    return NextResponse.json({ error: "편집 권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as PostBody;
  const level = Number(body.level);
  const template = typeof body.template === "string" ? body.template.trim() : "";
  if (!Number.isFinite(level) || level < 1 || level > 5 || !template) {
    return NextResponse.json({ error: "level(1~5)과 template가 필요합니다." }, { status: 400 });
  }

  const difficulty = Number.isFinite(body.difficulty) ? Number(body.difficulty) : 0;
  const discrimination = Number.isFinite(body.discrimination) ? Number(body.discrimination) : 1;

  let forkedFromId: string | null = null;
  if (body.forkedFromId) {
    const baseQ = await prisma.question.findFirst({
      where: { id: body.forkedFromId, competencyId: competency.forkedFromId ?? undefined },
    });
    if (baseQ) forkedFromId = baseQ.id;
  }

  const externalId = await generateOrgQuestionExternalId(competency.code, level);
  const created = await prisma.question.create({
    data: {
      externalId,
      competencyId,
      level,
      template,
      difficulty,
      discrimination,
      ownerScope: "ORG",
      organizationId: access.organizationId,
      forkedFromId,
      createdByUserId: user!.id,
      isActive: true,
      rubricCriteria: [] as unknown as Prisma.InputJsonValue,
    },
    include: {
      competency: { select: { code: true, nameKo: true } },
      forkedFrom: { select: { template: true, level: true } },
    },
  });

  return NextResponse.json({ question: serializeQuestionRow(created) }, { status: 201 });
}
