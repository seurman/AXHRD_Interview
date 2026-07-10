import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditActor, isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { logAdminAudit, snapshotCompetency } from "@/lib/admin/audit";
import {
  addCatalogCompetenciesToBank,
} from "@/lib/competency/catalog-import";
import type { DemoCatalogSource } from "@/lib/demo/catalog";
import type { CompetencySource } from "@prisma/client";

const CODE_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));

  if (body.fromCatalog || Array.isArray(body.selections)) {
    const raw = Array.isArray(body.selections)
      ? body.selections
      : body.code
        ? [{ source: body.source ?? "global", code: body.code }]
        : [];
    const selections = raw
      .map((s: { source?: string; code?: string }) => ({
        source: (s.source === "ncs"
          ? "ncs"
          : s.source === "custom"
            ? "custom"
            : "global") as DemoCatalogSource,
        code: typeof s.code === "string" ? s.code.trim().toUpperCase() : "",
      }))
      .filter((s: { code: string }) => CODE_RE.test(s.code));

    if (selections.length === 0) {
      return NextResponse.json({ error: "추가할 역량을 선택해 주세요." }, { status: 400 });
    }

    try {
      const result = await addCatalogCompetenciesToBank(selections);
      if (result.added.length === 0) {
        return NextResponse.json(
          {
            error:
              result.skipped.length > 0
                ? `이미 뱅크에 있거나 카탈로그에 없는 역량입니다: ${result.skipped.join(", ")}`
                : "추가된 역량이 없습니다.",
          },
          { status: 409 },
        );
      }
      for (const comp of result.competencies) {
        await logAdminAudit({
          actor: auditActor(auth),
          action: "CREATE",
          entityType: "competency",
          entityId: comp.id,
          summary: `카탈로그에서 역량 추가: ${comp.code}`,
          beforeState: null,
          afterState: snapshotCompetency(
            await prisma.competency.findUniqueOrThrow({ where: { id: comp.id } }),
          ),
        });
      }
      return NextResponse.json(result);
    } catch (e) {
      console.error("[competencies fromCatalog]", e);
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
      { error: "역량 코드는 대문자·숫자·밑줄만 사용할 수 있습니다 (예: COMMUNICATION)." },
      { status: 400 }
    );
  }
  if (!nameKo) {
    return NextResponse.json({ error: "한글 역량명을 입력해 주세요." }, { status: 400 });
  }

  const clusterId = typeof body.clusterId === "string" ? body.clusterId : undefined;
  const sourceRaw = typeof body.source === "string" ? body.source.toUpperCase() : "CUSTOM";
  const source = (["NCS", "GLOBAL", "CUSTOM"].includes(sourceRaw)
    ? sourceRaw
    : "CUSTOM") as CompetencySource;
  const nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() || null : null;

  const maxOrder = await prisma.competency.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  try {
    const created = await prisma.competency.create({
      data: {
        code,
        nameKo,
        nameEn,
        description,
        clusterId: clusterId || null,
        source,
        sortOrder,
        lifecycleStatus: "DRAFT",
        isActive: false,
      },
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
