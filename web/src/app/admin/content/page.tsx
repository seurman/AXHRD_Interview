import Link from "next/link";
import { requirePlatformAdmin, hasSuperadminAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";
import { ContentBankEditor } from "@/components/admin/ContentBankEditor";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requirePlatformAdmin("/admin/content");

  const [competencies, questions] = await Promise.all([
    prisma.competency.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { questions: true } } },
    }),
    prisma.question.findMany({
      orderBy: [
        { competencyId: "asc" },
        { level: "asc" },
        { sortOrder: "asc" },
        { externalId: "asc" },
      ],
      include: { competency: { select: { code: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">문항 뱅크 · 역량 · 루브릭</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          HireVue Builder처럼 역량을 정의하고, 레벨별 문항을 드래그로 배치·이동하며,
          문항별 채점 루브릭을 미리 설정합니다. ADMIN은 삭제 대신 비활성화만 가능하며,
          모든 변경은 SUPERADMIN 감사 로그에 기록됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {hasSuperadminAccess(user) && (
            <>
              <Link href="/admin/users" className="text-accent hover:underline">
                ADMIN 권한 부여 →
              </Link>
              <Link href="/admin/audit" className="text-accent hover:underline">
                감사 로그 · 롤백 →
              </Link>
              <Link href="/admin/organizations" className="text-accent hover:underline">
                기관 승인 관리 →
              </Link>
            </>
          )}
        </div>
      </div>

      <ContentBankEditor
        initialCompetencies={competencies.map((c) => ({
          id: c.id,
          code: c.code,
          nameKo: c.nameKo,
          description: c.description,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          rubricByLevel: c.rubricByLevel,
          questionCount: c._count.questions,
        }))}
        initialQuestions={questions.map((q) => ({
          id: q.id,
          externalId: q.externalId,
          competencyId: q.competencyId,
          competencyCode: q.competency.code,
          level: q.level,
          template: q.template,
          difficulty: q.difficulty,
          discrimination: q.discrimination,
          followUpHints: parseFollowUpHints(q.followUpHints),
          rubricCriteria: parseRubricCriteria(q.rubricCriteria),
          isActive: q.isActive,
          sortOrder: q.sortOrder,
        }))}
        canManagePermissions={hasSuperadminAccess(user)}
      />
    </div>
  );
}
