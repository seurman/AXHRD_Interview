import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import { uniqueSlug } from "@/lib/diagnostic/slug";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = { names?: string[] };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const names = Array.isArray(body.names)
    ? body.names.map((n) => (typeof n === "string" ? n.trim() : "")).filter(Boolean)
    : [];
  if (names.length === 0) {
    return NextResponse.json({ error: "팀 이름을 입력해 주세요." }, { status: 400 });
  }

  const wave = await prisma.diagnosticWave.findUnique({
    where: { id },
    include: { teams: { select: { slug: true, name: true } } },
  });
  if (!wave) return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  const slugSet = new Set(wave.teams.map((t) => t.slug));
  const baseUrl = new URL(req.url).origin;

  const created = await prisma.$transaction(
    names.map((name) => {
      const slug = uniqueSlug(name, slugSet);
      return prisma.diagnosticTeam.create({
        data: { waveId: wave.id, name, slug },
      });
    }),
  );

  return NextResponse.json({
    ok: true,
    teams: created.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
    })),
  });
}
