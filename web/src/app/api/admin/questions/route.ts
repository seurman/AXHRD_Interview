import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditActor, isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { logAdminAudit, snapshotQuestion } from "@/lib/admin/audit";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";

const COMP_PREFIX: Record<string, string> = {
  COMMUNICATION: "COMM",
  PROBLEM_SOLVING: "PS",
  JOB_FIT: "JF",
  ORG_FIT: "OF",
  LEADERSHIP: "LD",
  GROWTH: "GR",
};

async function nextExternalId(competencyCode: string, level: number) {
  const prefix = COMP_PREFIX[competencyCode] ?? competencyCode.slice(0, 4).toUpperCase();
  const base = `${prefix}-L${level}-`;
  const existing = await prisma.question.findMany({
    where: { externalId: { startsWith: base } },
    select: { externalId: true },
  });
  let max = 0;
  for (const q of existing) {
    const m = q.externalId.match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${base}${String(max + 1).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const competencyId = typeof body.competencyId === "string" ? body.competencyId : "";
  const level = Number(body.level);
  const template = typeof body.template === "string" ? body.template.trim() : "";

  if (!competencyId || !template) {
    return NextResponse.json({ error: "역량과 질문 텍스트가 필요합니다." }, { status: 400 });
  }
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return NextResponse.json({ error: "난이도 레벨은 1~5입니다." }, { status: 400 });
  }

  const competency = await prisma.competency.findUnique({ where: { id: competencyId } });
  if (!competency) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const maxOrder = await prisma.question.aggregate({
    where: { competencyId, level },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const externalId =
    typeof body.externalId === "string" && body.externalId.trim()
      ? body.externalId.trim()
      : await nextExternalId(competency.code, level);

  const rubricCriteria = Array.isArray(body.rubricCriteria)
    ? body.rubricCriteria.filter((c: unknown) => typeof c === "string" && c.trim())
    : [];
  const followUpHints = Array.isArray(body.followUpHints)
    ? body.followUpHints.filter((h: unknown) => typeof h === "string" && h.trim())
    : [];

  try {
    const created = await prisma.question.create({
      data: {
        externalId,
        competencyId,
        level,
        template,
        difficulty: Number(body.difficulty) || 0,
        discrimination: Number(body.discrimination) || 1,
        sortOrder,
        isActive: true,
        rubricCriteria,
        followUpHints,
      },
    });
    await logAdminAudit({
      actor: auditActor(auth),
      action: "CREATE",
      entityType: "question",
      entityId: created.id,
      summary: `문항 생성: ${created.externalId}`,
      beforeState: null,
      afterState: snapshotQuestion(created),
    });
    return NextResponse.json({
      question: {
        ...created,
        followUpHints: parseFollowUpHints(created.followUpHints),
        rubricCriteria: parseRubricCriteria(created.rubricCriteria),
      },
    });
  } catch {
    return NextResponse.json({ error: "externalId가 중복됩니다." }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const moves = body.moves as
    | Array<{ id: string; competencyId: string; level: number; sortOrder: number }>
    | undefined;

  if (!Array.isArray(moves) || moves.length === 0) {
    return NextResponse.json({ error: "moves 배열이 필요합니다." }, { status: 400 });
  }

  await prisma.$transaction(
    moves.map((m) =>
      prisma.question.update({
        where: { id: m.id },
        data: {
          competencyId: m.competencyId,
          level: m.level,
          sortOrder: m.sortOrder,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
