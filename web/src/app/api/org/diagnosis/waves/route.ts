import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import { uniqueSlug, waveSlug } from "@/lib/diagnostic/slug";

function accessError(reason: string) {
  return NextResponse.json(
    { error: DIAGNOSTIC_ACCESS_ERRORS[reason as keyof typeof DIAGNOSTIC_ACCESS_ERRORS] ?? "권한이 없습니다.", code: reason },
    { status: 403 },
  );
}

async function resolveAccess(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const access = await resolveDiagnosticAccess(user, organizationId);
  if (!access.allowed) return { error: accessError(access.reason) };
  return { user, access };
}

function waveDto(
  wave: {
    id: string;
    slug: string;
    waveNumber: number;
    label: string | null;
    status: string;
    opensAt: Date | null;
    closesAt: Date | null;
    createdAt: Date;
    teams: Array<{ id: string; name: string; department: string | null; slug: string }>;
    _count?: { responses: number };
  },
  baseUrl: string,
) {
  return {
    id: wave.id,
    slug: wave.slug,
    waveNumber: wave.waveNumber,
    label: wave.label,
    status: wave.status,
    opensAt: wave.opensAt?.toISOString() ?? null,
    closesAt: wave.closesAt?.toISOString() ?? null,
    createdAt: wave.createdAt.toISOString(),
    responseCount: wave._count?.responses ?? 0,
    teams: wave.teams.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      slug: t.slug,
      link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
    })),
  };
}

export async function GET(req: Request) {
  const resolved = await resolveAccess(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const baseUrl = new URL(req.url).origin;
  const waves = await prisma.diagnosticWave.findMany({
    where: { organizationId: access.organizationId },
    include: {
      teams: { orderBy: { name: "asc" } },
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
    orderBy: { waveNumber: "desc" },
  });

  return NextResponse.json({
    organizationId: access.organizationId,
    organizationName: access.organizationName,
    waves: waves.map((w) => waveDto(w, baseUrl)),
  });
}

type PostBody = {
  label?: string;
  teams?: Array<{ name: string; department?: string }>;
  status?: "DRAFT" | "OPEN" | "CLOSED";
};

export async function POST(req: Request) {
  const resolved = await resolveAccess(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const teams = Array.isArray(body.teams) ? body.teams : [];
  if (teams.length === 0) {
    return NextResponse.json({ error: "팀 목록을 1개 이상 입력해 주세요." }, { status: 400 });
  }

  const instrument = await prisma.diagnosticInstrument.findUnique({
    where: { code: "ARC_INDEX" },
  });
  if (!instrument) {
    return NextResponse.json(
      { error: "ARC Index 문항뱅크가 시드되지 않았습니다. 운영팀에 문의하세요." },
      { status: 503 },
    );
  }

  const last = await prisma.diagnosticWave.findFirst({
    where: { organizationId: access.organizationId, instrumentId: instrument.id },
    orderBy: { waveNumber: "desc" },
    select: { waveNumber: true },
  });
  const waveNumber = (last?.waveNumber ?? 0) + 1;
  const slug = waveSlug(access.organizationId, waveNumber);

  const slugSet = new Set<string>();
  const teamRows = teams.map((t) => {
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!name) throw new Error("EMPTY_TEAM");
    return {
      name,
      department: typeof t.department === "string" ? t.department.trim() || null : null,
      slug: uniqueSlug(name, slugSet),
    };
  });

  try {
    const wave = await prisma.diagnosticWave.create({
      data: {
        instrumentId: instrument.id,
        organizationId: access.organizationId,
        waveNumber,
        slug,
        label: typeof body.label === "string" ? body.label.trim() || null : null,
        status: body.status === "OPEN" ? "OPEN" : "DRAFT",
        teams: { create: teamRows },
      },
      include: { teams: true, _count: { select: { responses: true } } },
    });

    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({ ok: true, wave: waveDto(wave, baseUrl) });
  } catch (e) {
    if (e instanceof Error && e.message === "EMPTY_TEAM") {
      return NextResponse.json({ error: "팀 이름을 입력해 주세요." }, { status: 400 });
    }
    throw e;
  }
}
