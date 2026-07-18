/**
 * 플랫폼 관리자용 평가 과제 CRUD / 초안 저장 / 역량 트리 동기화.
 */
import { prisma } from "@/lib/prisma";
import type { ScenarioDraft } from "@/lib/assessment/generate-scenario-draft";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
  type ScenarioWithFramework,
} from "@/lib/assessment/load-scenario-context";
import type { AssessmentScenarioKind, Prisma } from "@prisma/client";

function slugifyCode(title: string, kind: AssessmentScenarioKind): string {
  const base = title
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const prefix = kind === "IN_BASKET" ? "IB" : "RP";
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}_${base || "TASK"}_${stamp}`;
}

async function uniqueScenarioCode(
  title: string,
  kind: AssessmentScenarioKind,
): Promise<string> {
  for (let i = 0; i < 5; i += 1) {
    const code = slugifyCode(title, kind);
    const exists = await prisma.assessmentScenario.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return `${kind === "IN_BASKET" ? "IB" : "RP"}_${Date.now()}`;
}

async function resolveCompetencyMap(codes: string[]) {
  const unique = [...new Set(codes.map((c) => c.toUpperCase()))];
  const rows = await prisma.competency.findMany({
    where: {
      organizationId: null,
      ownerScope: "PLATFORM",
      code: { in: unique },
    },
    include: {
      rubricSets: {
        where: { organizationId: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });
  return new Map(rows.map((r) => [r.code.toUpperCase(), r]));
}

export async function replaceScenarioCompetencyTree(
  scenarioId: string,
  competencies: ScenarioDraft["competencies"],
): Promise<void> {
  const map = await resolveCompetencyMap(competencies.map((c) => c.competencyCode));

  await prisma.$transaction(async (tx) => {
    await tx.assessmentScenarioCompetency.deleteMany({ where: { scenarioId } });
    for (const [index, competency] of competencies.entries()) {
      const bank = map.get(competency.competencyCode.toUpperCase());
      const created = await tx.assessmentScenarioCompetency.create({
        data: {
          scenarioId,
          competencyId: bank?.id ?? null,
          rubricSetId: bank?.rubricSets[0]?.id ?? null,
          competencyCode: bank?.code ?? competency.competencyCode.toUpperCase(),
          nameKo: bank?.nameKo ?? competency.nameKo,
          definition: bank?.description ?? competency.definition,
          sortOrder: index,
        },
      });
      for (const [si, sub] of competency.subskills.entries()) {
        const subRow = await tx.assessmentScenarioSubskill.create({
          data: {
            scenarioCompetencyId: created.id,
            code: sub.code,
            nameKo: sub.nameKo,
            definition: sub.definition,
            sortOrder: si,
          },
        });
        for (const [ii, ind] of sub.indicators.entries()) {
          await tx.assessmentScenarioIndicator.create({
            data: {
              subskillId: subRow.id,
              code: ind.code,
              polarity: ind.polarity,
              textKo: ind.textKo,
              sortOrder: ii,
            },
          });
        }
      }
    }
  });
}

export async function replaceInBasketItems(
  scenarioId: string,
  items: Extract<ScenarioDraft, { kind: "IN_BASKET" }>["items"],
): Promise<void> {
  const codes = items
    .map((i) => i.targetCompetencyCode)
    .filter((c): c is string => Boolean(c));
  const map = await resolveCompetencyMap(codes);

  await prisma.$transaction(async (tx) => {
    await tx.assessmentInBasketItem.deleteMany({ where: { scenarioId } });
    for (const [index, item] of items.entries()) {
      const bank = item.targetCompetencyCode
        ? map.get(item.targetCompetencyCode.toUpperCase())
        : null;
      await tx.assessmentInBasketItem.create({
        data: {
          scenarioId,
          sortOrder: index,
          fromLabel: item.fromLabel,
          subject: item.subject,
          body: item.body,
          urgency: item.urgency,
          importance: item.importance,
          isDistractor: item.isDistractor,
          targetCompetencyCode: bank?.code ?? item.targetCompetencyCode,
          targetCompetencyId: bank?.id ?? null,
        },
      });
    }
  });
}

export async function createScenarioFromDraft(params: {
  draft: ScenarioDraft;
  sourceId: string | null;
  createdByUserId?: string | null;
}): Promise<ScenarioWithFramework> {
  const { draft, sourceId } = params;
  const code = await uniqueScenarioCode(draft.titleKo, draft.kind);

  const scenario = await prisma.assessmentScenario.create({
    data: {
      code,
      kind: draft.kind,
      status: "DRAFT",
      version: 1,
      isActive: false,
      titleKo: draft.titleKo,
      reportKindLabel: draft.reportKindLabel,
      roleContext: draft.roleContext || null,
      taskBrief: draft.taskBrief,
      durationMinutes: draft.durationMinutes,
      recommendedSequence: draft.recommendedSequence,
      sourceId,
      ...(draft.kind === "ROLE_PLAY"
        ? {
            personaName: draft.personaName,
            personaRole: draft.personaRole || null,
            personaProfile: draft.personaProfile || null,
            openingLine: draft.openingLine || null,
            maxTurns: draft.maxTurns,
          }
        : {}),
    },
  });

  await replaceScenarioCompetencyTree(scenario.id, draft.competencies);
  if (draft.kind === "IN_BASKET") {
    await replaceInBasketItems(scenario.id, draft.items);
  }

  const loaded = await prisma.assessmentScenario.findUniqueOrThrow({
    where: { id: scenario.id },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  return loaded;
}

export type AdminScenarioUpdateInput = {
  titleKo?: string;
  roleContext?: string | null;
  taskBrief?: string;
  reportKindLabel?: string;
  durationMinutes?: number;
  recommendedSequence?: string | null;
  maxTurns?: number;
  personaName?: string | null;
  personaRole?: string | null;
  personaProfile?: string | null;
  openingLine?: string | null;
  sortOrder?: number;
  competencies?: ScenarioDraft["competencies"];
  items?: Extract<ScenarioDraft, { kind: "IN_BASKET" }>["items"];
  competencyLinks?: Array<{
    competencyId: string;
    rubricSetId?: string | null;
    sortOrder?: number;
    subskills?: ScenarioDraft["competencies"][number]["subskills"];
  }>;
};

export async function updateScenarioAdmin(
  scenarioId: string,
  input: AdminScenarioUpdateInput,
): Promise<ScenarioWithFramework> {
  const existing = await prisma.assessmentScenario.findUnique({
    where: { id: scenarioId },
  });
  if (!existing) throw new Error("과제를 찾을 수 없습니다.");
  if (existing.status === "ARCHIVED") {
    throw new Error("보관된 과제는 수정할 수 없습니다.");
  }

  const data: Prisma.AssessmentScenarioUpdateInput = {};
  if (typeof input.titleKo === "string") data.titleKo = input.titleKo.trim();
  if (input.roleContext !== undefined) data.roleContext = input.roleContext;
  if (typeof input.taskBrief === "string") data.taskBrief = input.taskBrief;
  if (typeof input.reportKindLabel === "string") {
    data.reportKindLabel = input.reportKindLabel;
  }
  if (typeof input.durationMinutes === "number") {
    data.durationMinutes = input.durationMinutes;
  }
  if (input.recommendedSequence !== undefined) {
    data.recommendedSequence = input.recommendedSequence;
  }
  if (typeof input.maxTurns === "number") data.maxTurns = input.maxTurns;
  if (input.personaName !== undefined) data.personaName = input.personaName;
  if (input.personaRole !== undefined) data.personaRole = input.personaRole;
  if (input.personaProfile !== undefined) data.personaProfile = input.personaProfile;
  if (input.openingLine !== undefined) data.openingLine = input.openingLine;
  if (typeof input.sortOrder === "number") data.sortOrder = input.sortOrder;

  // 게시된 과제를 수정하면 버전 증가 + DRAFT로 되돌리지 않음(편집 허용, 재게시 시 버전++)
  if (existing.status === "PUBLISHED" && Object.keys(data).length > 0) {
    data.version = { increment: 1 };
  }

  if (Object.keys(data).length > 0) {
    await prisma.assessmentScenario.update({ where: { id: scenarioId }, data });
  }

  if (input.competencyLinks) {
    const comps: ScenarioDraft["competencies"] = [];
    for (const link of input.competencyLinks) {
      const bank = await prisma.competency.findUnique({
        where: { id: link.competencyId },
        include: {
          rubricSets: {
            where: { organizationId: null },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      });
      if (!bank) continue;
      comps.push({
        competencyCode: bank.code,
        nameKo: bank.nameKo,
        definition: bank.description ?? bank.nameKo,
        subskills: link.subskills ?? [],
      });
    }
    await replaceScenarioCompetencyTree(scenarioId, comps);

    // rubricSetId 명시 지정
    for (const link of input.competencyLinks) {
      if (!link.rubricSetId) continue;
      const bank = await prisma.competency.findUnique({
        where: { id: link.competencyId },
        select: { code: true },
      });
      if (!bank) continue;
      await prisma.assessmentScenarioCompetency.updateMany({
        where: { scenarioId, competencyCode: bank.code },
        data: { competencyId: link.competencyId, rubricSetId: link.rubricSetId },
      });
    }
  } else if (input.competencies) {
    await replaceScenarioCompetencyTree(scenarioId, input.competencies);
  }

  if (input.items && existing.kind === "IN_BASKET") {
    await replaceInBasketItems(scenarioId, input.items);
  }

  return prisma.assessmentScenario.findUniqueOrThrow({
    where: { id: scenarioId },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
}

export async function duplicateScenario(scenarioId: string): Promise<ScenarioWithFramework> {
  const source = await prisma.assessmentScenario.findUnique({
    where: { id: scenarioId },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!source) throw new Error("과제를 찾을 수 없습니다.");

  const code = await uniqueScenarioCode(`${source.titleKo}_COPY`, source.kind);
  const created = await prisma.assessmentScenario.create({
    data: {
      code,
      kind: source.kind,
      status: "DRAFT",
      version: 1,
      isActive: false,
      titleKo: `${source.titleKo} (복사본)`,
      reportKindLabel: source.reportKindLabel,
      roleContext: source.roleContext,
      taskBrief: source.taskBrief,
      durationMinutes: source.durationMinutes,
      recommendedSequence: source.recommendedSequence,
      sourceId: source.sourceId,
      personaName: source.personaName,
      personaRole: source.personaRole,
      personaProfile: source.personaProfile,
      openingLine: source.openingLine,
      maxTurns: source.maxTurns,
      sortOrder: source.sortOrder,
    },
  });

  await replaceScenarioCompetencyTree(
    created.id,
    source.competencies.map((c) => ({
      competencyCode: c.competencyCode,
      nameKo: c.nameKo,
      definition: c.definition,
      subskills: c.subskills.map((s) => ({
        code: s.code,
        nameKo: s.nameKo,
        definition: s.definition,
        indicators: s.indicators.map((i) => ({
          code: i.code,
          polarity: i.polarity as "POSITIVE" | "NEGATIVE_OR_MISSING",
          textKo: i.textKo,
        })),
      })),
    })),
  );

  // preserve FK / rubricSetId
  for (const c of source.competencies) {
    await prisma.assessmentScenarioCompetency.updateMany({
      where: { scenarioId: created.id, competencyCode: c.competencyCode },
      data: {
        competencyId: c.competencyId,
        rubricSetId: c.rubricSetId,
      },
    });
  }

  if (source.kind === "IN_BASKET") {
    await replaceInBasketItems(
      created.id,
      source.inBasketItems.map((item) => ({
        fromLabel: item.fromLabel,
        subject: item.subject,
        body: item.body,
        urgency: (item.urgency as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM",
        importance: (item.importance as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM",
        isDistractor: item.isDistractor,
        targetCompetencyCode: item.targetCompetencyCode,
      })),
    );
  }

  return prisma.assessmentScenario.findUniqueOrThrow({
    where: { id: created.id },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
}

export function toAdminScenarioDto(scenario: ScenarioWithFramework) {
  return {
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
    recommendedSequence: scenario.recommendedSequence,
    isActive: scenario.isActive,
    sortOrder: scenario.sortOrder,
    sourceId: scenario.sourceId,
    publishedAt: scenario.publishedAt,
    personaName: scenario.personaName,
    personaRole: scenario.personaRole,
    personaProfile: scenario.personaProfile,
    openingLine: scenario.openingLine,
    maxTurns: scenario.maxTurns,
    competencies: scenario.competencies.map((c) => ({
      id: c.id,
      competencyId: c.competencyId,
      rubricSetId: c.rubricSetId,
      competencyCode: c.competencyCode,
      nameKo: c.nameKo,
      definition: c.definition,
      sortOrder: c.sortOrder,
      bank: c.competency
        ? {
            id: c.competency.id,
            code: c.competency.code,
            nameKo: c.competency.nameKo,
            description: c.competency.description,
          }
        : null,
      rubricSet: c.rubricSet
        ? {
            id: c.rubricSet.id,
            rubricName: c.rubricSet.rubricName,
            details: c.rubricSet.details.map((d) => ({
              scoreLevel: d.scoreLevel,
              levelName: d.levelName,
              behavioralIndicator: d.behavioralIndicator,
            })),
          }
        : null,
      subskills: c.subskills.map((s) => ({
        id: s.id,
        code: s.code,
        nameKo: s.nameKo,
        definition: s.definition,
        sortOrder: s.sortOrder,
        indicators: s.indicators.map((i) => ({
          id: i.id,
          code: i.code,
          polarity: i.polarity,
          textKo: i.textKo,
          sortOrder: i.sortOrder,
        })),
      })),
    })),
    items: scenario.inBasketItems.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      fromLabel: item.fromLabel,
      subject: item.subject,
      body: item.body,
      urgency: item.urgency,
      importance: item.importance,
      isDistractor: item.isDistractor,
      targetCompetencyCode: item.targetCompetencyCode,
      targetCompetencyId: item.targetCompetencyId,
    })),
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}
