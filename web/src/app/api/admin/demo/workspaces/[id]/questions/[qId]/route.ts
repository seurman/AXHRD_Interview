import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";

type Ctx = { params: Promise<{ id: string; qId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId, qId } = await params;
  const body = await req.json().catch(() => ({}));

  const data: {
    template?: string;
    isActive?: boolean;
    rubricCriteria?: string[];
    level?: number;
  } = {};

  if (typeof body.template === "string") data.template = body.template.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (Array.isArray(body.rubricCriteria)) {
    data.rubricCriteria = body.rubricCriteria.filter((s: unknown) => typeof s === "string");
  }
  if (Number.isInteger(body.level) && body.level >= 1 && body.level <= 5) {
    data.level = body.level;
  }

  try {
    const updated = await prisma.demoQuestion.update({
      where: { id: qId, workspaceId },
      data,
    });
    return NextResponse.json({ question: updated });
  } catch {
    return NextResponse.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id: workspaceId, qId } = await params;
  try {
    await prisma.demoQuestion.delete({ where: { id: qId, workspaceId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
  }
}
