import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";

const CODE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId } = await params;
  const ws = await prisma.demoWorkspace.findUnique({ where: { id: workspaceId } });
  if (!ws) {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const nameKo = typeof body.nameKo === "string" ? body.nameKo.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "역량 코드는 대문자·숫자·밑줄만 사용할 수 있습니다." },
      { status: 400 }
    );
  }
  if (!nameKo) {
    return NextResponse.json({ error: "한글 역량명을 입력해 주세요." }, { status: 400 });
  }

  const maxOrder = await prisma.demoCompetency.aggregate({
    where: { workspaceId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const created = await prisma.demoCompetency.create({
      data: { workspaceId, code, nameKo, description, sortOrder, isActive: true },
    });
    return NextResponse.json({ competency: created });
  } catch {
    return NextResponse.json({ error: "이미 존재하는 역량 코드입니다." }, { status: 409 });
  }
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
      prisma.demoCompetency.updateMany({
        where: { id: item.id, workspaceId },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
