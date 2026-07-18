import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { resolveAssessmentShareAccess } from "@/lib/org/assessment-share";
import { AssessmentShareManager } from "@/components/org/AssessmentShareManager";

export const dynamic = "force-dynamic";

export default async function OrgAssessmentSettingsPage() {
  const user = await requirePageUser("/org/settings/assessment");
  const access = await resolveAssessmentShareAccess(user);
  if (!access.allowed) notFound();

  const [scenarios, shares] = await Promise.all([
    prisma.assessmentScenario.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId: access.organizationId }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        kind: true,
        titleKo: true,
        roleContext: true,
        durationMinutes: true,
        competencies: {
          orderBy: { sortOrder: "asc" },
          select: { nameKo: true },
        },
      },
    }),
    prisma.orgAssessmentShare.findMany({
      where: { organizationId: access.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        scenario: { select: { titleKo: true, kind: true } },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            user: { select: { name: true, email: true } },
            report: { select: { overallScore: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          {access.organizationName}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          역량평가 과제 배포
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          서류함·역할연기 과제를 지원자에게 링크로 배포하고, 증거형 행동평가
          리포트를 채용 판단의 참고 자료로 활용합니다. 링크로 응시한 지원자의
          결과는 이 화면에서 확인할 수 있습니다.
        </p>
      </div>

      <AssessmentShareManager
        scenarios={scenarios.map((s) => ({
          id: s.id,
          kind: s.kind,
          titleKo: s.titleKo,
          roleContext: s.roleContext,
          durationMinutes: s.durationMinutes,
          competencyNames: s.competencies.map((c) => c.nameKo),
        }))}
        initialShares={shares.map((s) => ({
          id: s.id,
          slug: s.slug,
          label: s.label,
          isActive: s.isActive,
          expiresAt: s.expiresAt?.toISOString() ?? null,
          scenarioTitle: s.scenario.titleKo,
          scenarioKind: s.scenario.kind,
          attempts: s.attempts.map((a) => ({
            id: a.id,
            status: a.status,
            submittedAt: a.submittedAt?.toISOString() ?? null,
            userName: a.user.name,
            userEmail: a.user.email,
            overallScore: a.report?.overallScore ?? null,
          })),
        }))}
      />
    </div>
  );
}
