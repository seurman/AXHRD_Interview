import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";
import type { RubricByLevel } from "@/lib/competency/rubric";

type Ctx = { params: Promise<{ id: string; compId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId, compId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    nameKo?: string;
    description?: string | null;
    isActive?: boolean;
    rubricByLevel?: RubricByLevel;
  } = {};

  if (typeof body.nameKo === "string") data.nameKo = body.nameKo.trim();
  if (body.description === null || typeof body.description === "string") {
    data.description = body.description?.trim() || null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.rubricByLevel && typeof body.rubricByLevel === "object") {
    data.rubricByLevel = body.rubricByLevel as RubricByLevel;
  }

  try {
    const updated = await prisma.demoCompetency.update({
      where: { id: compId, workspaceId },
      data,
    });
    return NextResponse.json({ competency: updated });
  } catch {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId, compId } = await params;
  try {
    await prisma.demoCompetency.delete({ where: { id: compId, workspaceId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }
}
