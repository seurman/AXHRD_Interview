import { NextResponse } from "next/server";
import { auditActor, isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { REVIEW_CATEGORIES, type ReviewCategory } from "@/lib/interview/resume-review-criteria";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  code?: string;
  category?: string;
  title?: string;
  description?: string;
  howToCheck?: string;
  weight?: number;
  sortOrder?: number;
  isActive?: boolean;
  sourceNote?: string | null;
};

function parseCategory(raw: unknown): ReviewCategory | null {
  if (typeof raw !== "string") return null;
  if ((REVIEW_CATEGORIES as readonly string[]).includes(raw)) return raw as ReviewCategory;
  return null;
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await context.params;
  const before = await prisma.resumeReviewCriterion.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "기준을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const data: {
    code?: string;
    category?: string;
    title?: string;
    description?: string;
    howToCheck?: string;
    weight?: number;
    sortOrder?: number;
    isActive?: boolean;
    sourceNote?: string | null;
  } = {};

  if (typeof body.code === "string" && body.code.trim()) {
    data.code = body.code.trim().toUpperCase().replace(/\s+/g, "_");
  }
  if (body.category !== undefined) {
    const cat = parseCategory(body.category);
    if (!cat) {
      return NextResponse.json({ error: "잘못된 category입니다." }, { status: 400 });
    }
    data.category = cat;
  }
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.howToCheck === "string") data.howToCheck = body.howToCheck.trim();
  if (typeof body.weight === "number" && body.weight > 0) data.weight = body.weight;
  if (typeof body.sortOrder === "number") data.sortOrder = Math.round(body.sortOrder);
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.sourceNote === null) data.sourceNote = null;
  else if (typeof body.sourceNote === "string") data.sourceNote = body.sourceNote.trim() || null;

  if (data.code && data.code !== before.code) {
    const clash = await prisma.resumeReviewCriterion.findUnique({ where: { code: data.code } });
    if (clash) {
      return NextResponse.json({ error: `이미 존재하는 code입니다: ${data.code}` }, { status: 409 });
    }
  }

  const after = await prisma.resumeReviewCriterion.update({
    where: { id },
    data,
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "resume_review_criterion",
    entityId: after.id,
    summary: `[자소서 첨삭 기준] 수정 ${after.code} (${after.title})`,
    beforeState: before,
    afterState: after,
  });

  return NextResponse.json({ ok: true, criterion: after });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await context.params;
  const before = await prisma.resumeReviewCriterion.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "기준을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.resumeReviewCriterion.delete({ where: { id } });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "DELETE",
    entityType: "resume_review_criterion",
    entityId: before.id,
    summary: `[자소서 첨삭 기준] 삭제 ${before.code} (${before.title})`,
    beforeState: before,
  });

  return NextResponse.json({ ok: true });
}
