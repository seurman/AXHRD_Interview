import { requireProductCapability } from "@/lib/platform/page-guards";
import { prisma } from "@/lib/prisma";
import { AssessmentCatalog } from "@/components/assessment/AssessmentCatalog";

export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const user = await requireProductCapability("product.assessment", "/assessment");

  const [scenarios, attempts] = await Promise.all([
    prisma.assessmentScenario.findMany({
      where: {
        isActive: true,
        status: "PUBLISHED",
        OR: [
          { organizationId: null },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        kind: true,
        titleKo: true,
        roleContext: true,
        durationMinutes: true,
        maxTurns: true,
        personaName: true,
        personaRole: true,
        competencies: {
          orderBy: { sortOrder: "asc" },
          select: { competencyCode: true, nameKo: true },
        },
        _count: { select: { inBasketItems: true } },
      },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        scenarioId: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        report: { select: { overallScore: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:space-y-8 sm:pb-16">
      <div>
        <p className="text-sm font-medium text-accent">역량평가 (Assessment Center)</p>
        <h1 className="mt-1 text-xl font-bold leading-snug text-foreground sm:text-2xl">
          서류함·역할연기 과제
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          전통적 역량평가(AC) 기법을 온라인으로 수행합니다. 결과는 관찰된 행동
          근거에 기반한 1–5 평정 리포트로 제공됩니다. 이 결과는 연습·진단
          목적이며, 기관이 명시적으로 안내한 경우에만 채용·승진 판단에
          참고됩니다.
        </p>
      </div>

      <AssessmentCatalog
        scenarios={scenarios.map((s) => ({
          id: s.id,
          code: s.code,
          kind: s.kind,
          titleKo: s.titleKo,
          roleContext: s.roleContext,
          durationMinutes: s.durationMinutes,
          maxTurns: s.maxTurns,
          personaName: s.personaName,
          personaRole: s.personaRole,
          itemCount: s._count.inBasketItems,
          competencies: s.competencies.map((c) => ({
            code: c.competencyCode,
            nameKo: c.nameKo,
          })),
        }))}
        attempts={attempts.map((a) => ({
          id: a.id,
          scenarioId: a.scenarioId,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          submittedAt: a.submittedAt?.toISOString() ?? null,
          overallScore: a.report?.overallScore ?? null,
        }))}
      />
    </div>
  );
}
