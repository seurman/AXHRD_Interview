import { NextResponse } from "next/server";
import type { CompetencyLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { setCompetencyLifecycle } from "@/lib/repository/service";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

const VALID: CompetencyLifecycleStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

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
  const lifecycleStatus = body.lifecycleStatus as CompetencyLifecycleStatus;
  if (!VALID.includes(lifecycleStatus)) {
    return NextResponse.json(
      { error: "lifecycleStatus는 DRAFT, ACTIVE, ARCHIVED 중 하나여야 합니다." },
      { status: 400 },
    );
  }

  const competency = await setCompetencyLifecycle(id, lifecycleStatus);
  return NextResponse.json({ competency });
}
