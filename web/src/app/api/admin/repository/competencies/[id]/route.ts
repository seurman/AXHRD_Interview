import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { deleteRepositoryCompetency } from "@/lib/repository/service";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.competency.findFirst({
    where: { id, ...PLATFORM_OWNER_FILTER },
  });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    nameKo?: string;
    description?: string | null;
    clusterId?: string | null;
  } = {};

  if (typeof body.nameKo === "string" && body.nameKo.trim()) {
    data.nameKo = body.nameKo.trim();
  }
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (body.clusterId !== undefined) {
    data.clusterId = typeof body.clusterId === "string" ? body.clusterId : null;
  }

  const competency = await prisma.competency.update({ where: { id }, data });
  return NextResponse.json({ competency });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const result = await deleteRepositoryCompetency(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
