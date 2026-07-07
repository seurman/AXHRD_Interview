import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditActor, isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { logAdminAudit, snapshotCompetency } from "@/lib/admin/audit";

const CODE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const nameKo = typeof body.nameKo === "string" ? body.nameKo.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "역량 코드는 대문자·숫자·밑줄만 사용할 수 있습니다 (예: COMMUNICATION)." },
      { status: 400 }
    );
  }
  if (!nameKo) {
    return NextResponse.json({ error: "한글 역량명을 입력해 주세요." }, { status: 400 });
  }

  const maxOrder = await prisma.competency.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const created = await prisma.competency.create({
      data: { code, nameKo, description, sortOrder, isActive: true },
    });
    await logAdminAudit({
      actor: auditActor(auth),
      action: "CREATE",
      entityType: "competency",
      entityId: created.id,
      summary: `역량 생성: ${created.code}`,
      beforeState: null,
      afterState: snapshotCompetency(created),
    });
    return NextResponse.json({ competency: created });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 역량 코드입니다." }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const items = body.items as Array<{ id: string; sortOrder: number }> | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items 배열이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.competency.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
