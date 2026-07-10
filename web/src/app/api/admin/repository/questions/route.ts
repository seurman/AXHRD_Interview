import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

function nextExternalId(competencyCode: string, existing: string[]): string {
  const prefix = `Q-${competencyCode.slice(0, 8)}-`;
  let n = existing.length + 1;
  let candidate = `${prefix}${String(n).padStart(3, "0")}`;
  while (existing.includes(candidate)) {
    n += 1;
    candidate = `${prefix}${String(n).padStart(3, "0")}`;
  }
  return candidate;
}

export async function GET(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const competencyId = new URL(req.url).searchParams.get("competencyId");
  if (!competencyId) {
    return NextResponse.json({ error: "competencyId가 필요합니다." }, { status: 400 });
  }

  const questions = await prisma.question.findMany({
    where: {
      competencyId,
      ...PLATFORM_OWNER_FILTER,
      isActive: true,
    },
    include: {
      rubricMappings: {
        include: {
          rubricSet: { select: { id: true, rubricName: true } },
        },
      },
    },
    orderBy: [{ level: "asc" }, { externalId: "asc" }],
  });

  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const competencyId = typeof body.competencyId === "string" ? body.competencyId : "";
  const questionText = typeof body.questionText === "string" ? body.questionText.trim() : "";
  const level = Number(body.level ?? 3);
  const difficulty = Number(body.difficulty ?? 0);

  if (!competencyId || !questionText) {
    return NextResponse.json(
      { error: "competencyId와 questionText가 필요합니다." },
      { status: 400 },
    );
  }

  const competency = await prisma.competency.findUnique({ where: { id: competencyId } });
  if (!competency) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const siblings = await prisma.question.findMany({
    where: { competencyId },
    select: { externalId: true },
  });
  const externalId = nextExternalId(
    competency.code,
    siblings.map((s) => s.externalId),
  );

  const question = await prisma.question.create({
    data: {
      externalId,
      competencyId,
      template: questionText,
      level: Math.min(5, Math.max(1, Math.round(level))),
      difficulty: Number.isFinite(difficulty) ? difficulty : 0,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
