import { NextResponse } from "next/server";
import { auditActor, isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import {
  loadAllReviewCriteria,
  REVIEW_CATEGORIES,
  type ReviewCategory,
} from "@/lib/interview/resume-review-criteria";

export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const criteria = await loadAllReviewCriteria();
  return NextResponse.json({
    categories: REVIEW_CATEGORIES.map((c) => ({
      id: c,
      label:
        c === "FORMAT_LOGIC"
          ? "형식·논리"
          : c === "INDUSTRY_FIT"
            ? "산업·직무 역량"
            : "STAR·BEI",
    })),
    criteria,
  });
}

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

export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const body = (await req.json().catch(() => ({}))) as Body;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s+/g, "_") : "";
  const category = parseCategory(body.category);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const howToCheck = typeof body.howToCheck === "string" ? body.howToCheck.trim() : "";

  if (!code || code.length < 2) {
    return NextResponse.json({ error: "code가 필요합니다." }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json(
      { error: "category는 FORMAT_LOGIC | INDUSTRY_FIT | STAR_BEI 중 하나여야 합니다." },
      { status: 400 }
    );
  }
  if (!title || !description || !howToCheck) {
    return NextResponse.json(
      { error: "title, description, howToCheck가 필요합니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.resumeReviewCriterion.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `이미 존재하는 code입니다: ${code}` }, { status: 409 });
  }

  const row = await prisma.resumeReviewCriterion.create({
    data: {
      code,
      category,
      title,
      description,
      howToCheck,
      weight: typeof body.weight === "number" && body.weight > 0 ? body.weight : 1,
      sortOrder: typeof body.sortOrder === "number" ? Math.round(body.sortOrder) : 100,
      isActive: body.isActive !== false,
      sourceNote:
        typeof body.sourceNote === "string" && body.sourceNote.trim()
          ? body.sourceNote.trim()
          : null,
    },
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "CREATE",
    entityType: "resume_review_criterion",
    entityId: row.id,
    summary: `[자소서 첨삭 기준] 추가 ${row.code} (${row.title})`,
    afterState: row,
  });

  return NextResponse.json({ ok: true, criterion: row });
}
