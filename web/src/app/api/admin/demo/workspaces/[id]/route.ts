import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";
import {
  cloneProductionToDemoWorkspace,
  loadDemoWorkspaceSnapshot,
} from "@/lib/demo/workspace";
import { ensureWorkspacePresenterKey } from "@/lib/demo/presenter";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const snap = await loadDemoWorkspaceSnapshot(id);
  if (!snap) {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }
  const presenterKey = await ensureWorkspacePresenterKey(id);
  return NextResponse.json({
    ...snap,
    presenterKey,
    presenterUrl: `/demo/${encodeURIComponent(snap.workspace.slug)}?pk=${encodeURIComponent(presenterKey)}`,
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const description =
    body.description === null
      ? null
      : typeof body.description === "string"
        ? body.description.trim() || null
        : undefined;

  try {
    const updated = await prisma.demoWorkspace.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });
    return NextResponse.json({ workspace: updated });
  } catch {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  try {
    await prisma.demoWorkspace.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireDemoManagerApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action === "cloneFromProduction") {
    const exists = await prisma.demoWorkspace.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
    }
    try {
      await cloneProductionToDemoWorkspace(id);
      const snap = await loadDemoWorkspaceSnapshot(id);
      return NextResponse.json(snap);
    } catch (e) {
      console.error("[demo/workspaces cloneFromProduction]", e);
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `운영 문항 복사 실패: ${msg.slice(0, 200)}` },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ error: "지원하지 않는 action입니다." }, { status: 400 });
}
