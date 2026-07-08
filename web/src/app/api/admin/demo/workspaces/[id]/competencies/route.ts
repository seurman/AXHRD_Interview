import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireDemoManagerApi } from "@/lib/admin/auth";
import {
  addCatalogCompetenciesToDemo,
  type DemoCatalogSource,
} from "@/lib/demo/catalog";

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

  // Business Objects식: 메타데이터 팔레트에서 끌어온 항목
  if (body.fromCatalog || Array.isArray(body.selections)) {
    const raw = Array.isArray(body.selections)
      ? body.selections
      : body.code
        ? [{ source: body.source ?? "ncs", code: body.code }]
        : [];
    const selections = raw
      .map((s: { source?: string; code?: string }) => ({
        source: (s.source === "global" ? "global" : "ncs") as DemoCatalogSource,
        code: typeof s.code === "string" ? s.code.trim().toUpperCase() : "",
      }))
      .filter((s: { code: string }) => CODE_RE.test(s.code));

    if (selections.length === 0) {
      return NextResponse.json({ error: "추가할 역량을 선택해 주세요." }, { status: 400 });
    }

    try {
      const result = await addCatalogCompetenciesToDemo(workspaceId, selections);
      if (result.added.length === 0) {
        return NextResponse.json(
          {
            error:
              result.skipped.length > 0
                ? `이미 키트에 있거나 카탈로그에 없는 역량입니다: ${result.skipped.join(", ")}`
                : "추가된 역량이 없습니다.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(result);
    } catch (e) {
      console.error("[demo competencies fromCatalog]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "추가 실패" },
        { status: 500 },
      );
    }
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const nameKo = typeof body.nameKo === "string" ? body.nameKo.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "역량 코드는 대문자·숫자·밑줄만 사용할 수 있습니다." },
      { status: 400 },
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
      }),
    ),
  );
  return NextResponse.json({ ok: true });
}
