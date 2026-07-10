import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import { uniqueSlug } from "@/lib/diagnostic/slug";

type Ctx = { params: Promise<{ id: string }> };

async function getWaveForOrg(waveId: string, organizationId: string) {
  return prisma.diagnosticWave.findFirst({
    where: { id: waveId, organizationId },
    include: {
      teams: { orderBy: { name: "asc" } },
      instrument: true,
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const access = await resolveDiagnosticAccess(user, null);
  if (!access.allowed) {
    return NextResponse.json(
      { error: DIAGNOSTIC_ACCESS_ERRORS[access.reason], code: access.reason },
      { status: 403 },
    );
  }

  const wave = await getWaveForOrg(id, access.organizationId);
  if (!wave) return NextResponse.json({ error: "웨이브를 찾을 수 없습니다." }, { status: 404 });

  const baseUrl = new URL(req.url).origin;
  return NextResponse.json({
    wave: {
      id: wave.id,
      slug: wave.slug,
      waveNumber: wave.waveNumber,
      label: wave.label,
      status: wave.status,
      opensAt: wave.opensAt?.toISOString() ?? null,
      closesAt: wave.closesAt?.toISOString() ?? null,
      responseCount: wave._count.responses,
      minGroupSize: wave.instrument.minGroupSize,
      teams: wave.teams.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        slug: t.slug,
        link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
      })),
    },
  });
}

type PatchBody = { status?: "DRAFT" | "OPEN" | "CLOSED"; label?: string };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  const access = await resolveDiagnosticAccess(user, null);
  if (!access.allowed) {
    return NextResponse.json(
      { error: DIAGNOSTIC_ACCESS_ERRORS[access.reason], code: access.reason },
      { status: 403 },
    );
  }

  const wave = await getWaveForOrg(id, access.organizationId);
  if (!wave) return NextResponse.json({ error: "웨이브를 찾을 수 없습니다." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const data: { status?: "DRAFT" | "OPEN" | "CLOSED"; label?: string | null } = {};
  if (body.status === "DRAFT" || body.status === "OPEN" || body.status === "CLOSED") {
    data.status = body.status;
  }
  if (typeof body.label === "string") data.label = body.label.trim() || null;

  const updated = await prisma.diagnosticWave.update({
    where: { id },
    data,
    select: { id: true, status: true, label: true },
  });
  return NextResponse.json({ ok: true, wave: updated });
}
