import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  textKo?: string;
  isReversed?: boolean;
  hasImportanceAxis?: boolean;
  order?: number;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const existing = await prisma.diagnosticItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
  }

  const data: {
    textKo?: string;
    isReversed?: boolean;
    hasImportanceAxis?: boolean;
    order?: number;
  } = {};

  if (typeof body.textKo === "string" && body.textKo.trim()) data.textKo = body.textKo.trim();
  if (typeof body.isReversed === "boolean") data.isReversed = body.isReversed;
  if (typeof body.hasImportanceAxis === "boolean") data.hasImportanceAxis = body.hasImportanceAxis;
  if (typeof body.order === "number" && Number.isFinite(body.order)) data.order = body.order;

  const updated = await prisma.diagnosticItem.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, item: updated });
}
