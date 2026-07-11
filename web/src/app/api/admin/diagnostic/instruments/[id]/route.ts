import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const instrument = await prisma.diagnosticInstrument.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          items: { orderBy: { order: "asc" } },
          subscales: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
      reportProfiles: { where: { isInstrumentDefault: true }, take: 1 },
    },
  });

  if (!instrument) {
    return NextResponse.json({ error: "진단도구를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    instrument: {
      id: instrument.id,
      code: instrument.code,
      nameKo: instrument.nameKo,
      version: instrument.version,
      estimatedMinutes: instrument.estimatedMinutes,
      minGroupSize: instrument.minGroupSize,
      defaultReportProfile: instrument.reportProfiles[0] ?? null,
      sections: instrument.sections.map((sec) => ({
        id: sec.id,
        code: sec.code,
        nameKo: sec.nameKo,
        order: sec.order,
        directItems: sec.items
          .filter((i) => !i.subscaleId)
          .map((i) => ({
            id: i.id,
            itemCode: i.itemCode,
            textKo: i.textKo,
            scaleType: i.scaleType,
            hasImportanceAxis: i.hasImportanceAxis,
            isReversed: i.isReversed,
            isDemographic: i.isDemographic,
            order: i.order,
          })),
        subscales: sec.subscales.map((sub) => ({
          id: sub.id,
          code: sub.code,
          nameKo: sub.nameKo,
          weight: sub.weight,
          isDriver: sub.isDriver,
          order: sub.order,
          items: sub.items.map((i) => ({
            id: i.id,
            itemCode: i.itemCode,
            textKo: i.textKo,
            scaleType: i.scaleType,
            hasImportanceAxis: i.hasImportanceAxis,
            isReversed: i.isReversed,
            isDemographic: i.isDemographic,
            order: i.order,
          })),
        })),
      })),
    },
  });
}

type PatchBody = {
  nameKo?: string;
  estimatedMinutes?: number | null;
  minGroupSize?: number;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const data: PatchBody = {};
  if (typeof body.nameKo === "string" && body.nameKo.trim()) data.nameKo = body.nameKo.trim();
  if (body.estimatedMinutes !== undefined) data.estimatedMinutes = body.estimatedMinutes;
  if (typeof body.minGroupSize === "number" && body.minGroupSize >= 2) {
    data.minGroupSize = body.minGroupSize;
  }

  const updated = await prisma.diagnosticInstrument.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, instrument: updated });
}
