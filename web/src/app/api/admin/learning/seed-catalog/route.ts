import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { prismaDirect } from "@/lib/prisma-direct";
import { buildLessonCatalog } from "@/lib/learning/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 운영 DB에 역량 학습 패스 레슨 카탈로그 upsert (슈퍼어드민)
 * POST /api/admin/learning/seed-catalog
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  if (process.env.VERCEL && !process.env.DIRECT_URL?.trim()) {
    return NextResponse.json(
      {
        error:
          "Vercel에 DIRECT_URL(Supabase Session pooler, 5432) 환경변수가 없습니다.",
      },
      { status: 503 },
    );
  }

  try {
    const catalog = buildLessonCatalog();
    for (const lesson of catalog) {
      await prismaDirect.competencyLesson.upsert({
        where: {
          competency_slug: {
            competency: lesson.competency,
            slug: lesson.slug,
          },
        },
        create: {
          competency: lesson.competency,
          track: lesson.track,
          stage: lesson.stage,
          kind: lesson.kind,
          slug: lesson.slug,
          titleKo: lesson.titleKo,
          bodyMd: lesson.bodyMd,
          quizJson: lesson.quizJson ?? undefined,
          sortOrder: lesson.sortOrder,
          published: true,
        },
        update: {
          titleKo: lesson.titleKo,
          bodyMd: lesson.bodyMd,
          quizJson: lesson.quizJson ?? undefined,
          stage: lesson.stage,
          kind: lesson.kind,
          track: lesson.track,
          sortOrder: lesson.sortOrder,
          published: true,
        },
      });
    }

    const total = await prismaDirect.competencyLesson.count();
    return NextResponse.json({
      ok: true,
      upserted: catalog.length,
      total,
      message: `학습 패스 레슨 ${catalog.length}개를 운영 DB에 반영했습니다.`,
    });
  } catch (e) {
    console.error("[admin/learning/seed-catalog]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "시드 실패" },
      { status: 500 },
    );
  } finally {
    await prismaDirect.$disconnect();
  }
}
