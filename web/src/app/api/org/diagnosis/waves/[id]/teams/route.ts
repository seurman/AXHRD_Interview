import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import { uniqueSlug } from "@/lib/diagnostic/slug";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  teams?: Array<{ name: string; department?: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
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

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id, organizationId: access.organizationId },
    include: { teams: { select: { slug: true } } },
  });
  if (!wave) return NextResponse.json({ error: "웨이브를 찾을 수 없습니다." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const incoming = Array.isArray(body.teams) ? body.teams : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "추가할 팀을 입력해 주세요." }, { status: 400 });
  }

  const slugSet = new Set(wave.teams.map((t) => t.slug));
  const created = [];
  for (const t of incoming) {
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!name) continue;
    const team = await prisma.diagnosticTeam.create({
      data: {
        waveId: id,
        name,
        department: typeof t.department === "string" ? t.department.trim() || null : null,
        slug: uniqueSlug(name, slugSet),
      },
    });
    created.push(team);
  }

  const baseUrl = new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    teams: created.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      slug: t.slug,
      link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
    })),
  });
}
