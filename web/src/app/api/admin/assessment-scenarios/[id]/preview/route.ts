import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
} from "@/lib/assessment/load-scenario-context";
import { validateScenarioForPublish } from "@/lib/assessment/scenario-publish";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 응시자 관점 미리보기 — 채점 힌트·페르소나 내부 지침은 분리해 반환.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  const scenario = await prisma.assessmentScenario.findUnique({
    where: { id },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!scenario || scenario.organizationId) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  const issues = validateScenarioForPublish(scenario);

  return NextResponse.json({
    preview: {
      id: scenario.id,
      code: scenario.code,
      kind: scenario.kind,
      status: scenario.status,
      version: scenario.version,
      titleKo: scenario.titleKo,
      reportKindLabel: scenario.reportKindLabel,
      roleContext: scenario.roleContext,
      taskBrief: scenario.taskBrief,
      durationMinutes: scenario.durationMinutes,
      maxTurns: scenario.maxTurns,
      candidateFacing: {
        personaName: scenario.personaName,
        personaRole: scenario.personaRole,
        openingLine: scenario.openingLine,
        competencies: scenario.competencies.map((c) => ({
          code: c.competencyCode,
          nameKo: c.nameKo,
          definition: c.definition,
        })),
        inBasketItems:
          scenario.kind === "IN_BASKET"
            ? scenario.inBasketItems.map((item) => ({
                id: item.id,
                sortOrder: item.sortOrder,
                fromLabel: item.fromLabel,
                subject: item.subject,
                body: item.body,
              }))
            : [],
      },
      adminOnly: {
        personaProfile: scenario.personaProfile,
        recommendedSequence: scenario.recommendedSequence,
        competencies: scenario.competencies.map((c) => ({
          code: c.competencyCode,
          nameKo: c.nameKo,
          competencyId: c.competencyId,
          rubricSetId: c.rubricSetId,
          rubricName: c.rubricSet?.rubricName ?? null,
          indicatorCount: c.subskills.reduce((n, s) => n + s.indicators.length, 0),
        })),
        inBasketMeta:
          scenario.kind === "IN_BASKET"
            ? scenario.inBasketItems.map((item) => ({
                id: item.id,
                urgency: item.urgency,
                importance: item.importance,
                isDistractor: item.isDistractor,
                targetCompetencyCode: item.targetCompetencyCode,
              }))
            : [],
      },
    },
    publishReady: issues.length === 0,
    issues,
  });
}
