import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveOrgContentAccess } from "@/lib/content/org-access";
import { canEditCompetency } from "@/lib/content/ownership";
import { serializeCompetencyRow } from "@/lib/content/promote";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const access = await resolveOrgContentAccess(user, searchParams.get("organizationId"), {
    requireWrite: true,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const row = await prisma.competency.findUnique({ where: { id } });
  if (!row || row.ownerScope !== "ORG") {
    return NextResponse.json({ error: "기관 커스텀 역량을 찾을 수 없습니다." }, { status: 404 });
  }
  if (
    !canEditCompetency(row, {
      isSuperadmin: Boolean(user && hasSuperadminAccess(user)),
      organizationId: access.organizationId,
    })
  ) {
    return NextResponse.json({ error: "편집 권한이 없습니다." }, { status: 403 });
  }

  const body = (await req.json()) as {
    nameKo?: string;
    definition?: string;
    rubricByLevel?: Record<string, string[]>;
    isActive?: boolean;
  };

  const updated = await prisma.competency.update({
    where: { id },
    data: {
      ...(typeof body.nameKo === "string" ? { nameKo: body.nameKo.trim() } : {}),
      ...(typeof body.definition === "string" ? { description: body.definition.trim() } : {}),
      ...(body.rubricByLevel
        ? { rubricByLevel: body.rubricByLevel as Prisma.InputJsonValue }
        : {}),
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
    },
    include: {
      organization: { select: { name: true } },
      forkedFrom: { select: { code: true, nameKo: true, rubricByLevel: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ competency: serializeCompetencyRow(updated) });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const access = await resolveOrgContentAccess(user, searchParams.get("organizationId"), {
    requireWrite: true,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const row = await prisma.competency.findUnique({ where: { id } });
  if (!row || row.ownerScope !== "ORG" || row.organizationId !== access.organizationId) {
    return NextResponse.json({ error: "삭제할 역량을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.competency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
