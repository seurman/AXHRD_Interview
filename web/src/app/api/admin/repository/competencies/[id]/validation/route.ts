import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { validateCompetencyRubrics } from "@/lib/repository/service";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

export async function GET(
  _req: Request,
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

  const validation = await validateCompetencyRubrics(id);
  return NextResponse.json(validation);
}
