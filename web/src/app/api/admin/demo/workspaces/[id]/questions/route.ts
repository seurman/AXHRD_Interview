import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId } = await params;
  const body = await req.json().catch(() => ({}));
  const competencyId = typeof body.competencyId === "string" ? body.competencyId : "";
  const level = Number(body.level);
  const template = typeof body.template === "string" ? body.template.trim() : "";

  if (!competencyId || !Number.isInteger(level) || level < 1 || level > 5) {
    return NextResponse.json({ error: "역량과 레벨(1–5)이 필요합니다." }, { status: 400 });
  }
  if (!template) {
    return NextResponse.json({ error: "질문 문구를 입력해 주세요." }, { status: 400 });
  }

  const comp = await prisma.demoCompetency.findFirst({
    where: { id: competencyId, workspaceId },
  });
  if (!comp) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const maxOrder = await prisma.demoQuestion.aggregate({
    where: { workspaceId, competencyId, level },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const externalId = `${comp.code}_L${level}_${sortOrder + 1}`;

  const created = await prisma.demoQuestion.create({
    data: {
      workspaceId,
      competencyId,
      externalId,
      level,
      template,
      sortOrder,
      isActive: true,
      rubricCriteria: [],
    },
  });
  return NextResponse.json({ question: created });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId } = await params;
  const body = await req.json().catch(() => ({}));
  const items = body.items as Array<{ id: string; sortOrder: number }> | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items 배열이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.demoQuestion.updateMany({
        where: { id: item.id, workspaceId },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
