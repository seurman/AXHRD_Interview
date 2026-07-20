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

export type ScenarioCompetencyTreeInput = {
  competencyCode: string;
  nameKo: string;
  definition: string;
  /** 명시 시 코드 매칭보다 우선 */
  competencyId?: string | null;
  rubricSetId?: string | null;
  subskills: ScenarioDraft["competencies"][number]["subskills"];
};

export async function replaceScenarioCompetencyTree(
  scenarioId: string,
  competencies: ScenarioCompetencyTreeInput[],
): Promise<void> {
  const map = await resolveCompetencyMap(competencies.map((c) => c.competencyCode));
  const explicitIds = competencies
    .map((c) => c.competencyId)
    .filter((id): id is string => Boolean(id));
  const byId =
    explicitIds.length > 0
      ? await prisma.competency.findMany({
          where: { id: { in: explicitIds } },
          include: {
            rubricSets: {
              where: { organizationId: null },
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
              take: 1,
            },
          },
        })
      : [];
  const bankById = new Map(byId.map((b) => [b.id, b]));

  await prisma.$transaction(async (tx) => {
    await tx.assessmentScenarioCompetency.deleteMany({ where: { scenarioId } });
    for (const [index, competency] of competencies.entries()) {
      const bank =
        (competency.competencyId
          ? bankById.get(competency.competencyId)
          : undefined) ??
        map.get(competency.competencyCode.toUpperCase()) ??
        null;
      const rubricSetId =
        competency.rubricSetId !== undefined
          ? competency.rubricSetId
          : (bank?.rubricSets[0]?.id ?? null);
      const created = await tx.assessmentScenarioCompetency.create({
        data: {
          scenarioId,
          competencyId: bank?.id ?? competency.competencyId ?? null,
          rubricSetId,
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
  competencies?: ScenarioCompetencyTreeInput[];
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
    const current = await prisma.assessmentScenario.findUnique({
      where: { id: scenarioId },
      include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
    });
    const comps: ScenarioCompetencyTreeInput[] = [];
    const linkedCodes = new Set<string>();

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
      linkedCodes.add(bank.code.toUpperCase());
      comps.push({
        competencyCode: bank.code,
        nameKo: bank.nameKo,
        definition: bank.description ?? bank.nameKo,
        competencyId: bank.id,
        rubricSetId:
          link.rubricSetId !== undefined
            ? link.rubricSetId
            : (bank.rubricSets[0]?.id ?? null),
        subskills: link.subskills ?? [],
      });
    }

    // 미연결 AI 초안 역량은 링크 페이로드에 없어도 유지
    for (const c of current?.competencies ?? []) {
      if (c.competencyId) continue;
      if (linkedCodes.has(c.competencyCode.toUpperCase())) continue;
      comps.push({
        competencyCode: c.competencyCode,
        nameKo: c.nameKo,
        definition: c.definition,
        competencyId: null,
        rubricSetId: c.rubricSetId,
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
      });
    }

    await replaceScenarioCompetencyTree(scenarioId, comps);
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

function normalizeCompetencyName(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/**
 * 게시 전 자동 보정: 플랫폼 역량/기본 루브릭 연결만 수행.
 * 행동지표·페르소나·서류함 본문은 관리자가 작성해야 하며 여기서 날조하지 않는다.
 */
export async function prepareScenarioForPublish(scenarioId: string): Promise<{
  scenario: ScenarioWithFramework;
  repairs: string[];
}> {
  const repairs: string[] = [];
  let scenario = await prisma.assessmentScenario.findUnique({
    where: { id: scenarioId },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!scenario) throw new Error("과제를 찾을 수 없습니다.");

  const bank = await prisma.competency.findMany({
    where: {
      organizationId: null,
      ownerScope: "PLATFORM",
      isActive: true,
      lifecycleStatus: "ACTIVE",
    },
    include: {
      rubricSets: {
        where: { organizationId: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: { details: { orderBy: { scoreLevel: "asc" } } },
      },
    },
  });

  const byCode = new Map(bank.map((c) => [c.code.toUpperCase(), c]));
  const byName = new Map(bank.map((c) => [normalizeCompetencyName(c.nameKo), c]));

  for (const c of scenario.competencies) {
    let matched = c.competencyId
      ? bank.find((b) => b.id === c.competencyId) ?? null
      : null;
    if (!matched) {
      matched =
        byCode.get(c.competencyCode.toUpperCase()) ??
        byName.get(normalizeCompetencyName(c.nameKo)) ??
        null;
      if (!matched) {
        const needle = normalizeCompetencyName(c.nameKo || c.competencyCode);
        matched =
          bank.find((b) => {
            const n = normalizeCompetencyName(b.nameKo);
            return n.includes(needle) || needle.includes(n);
          }) ?? null;
      }
    }

    if (matched && (!c.competencyId || c.competencyId !== matched.id)) {
      const rubric =
        matched.rubricSets.find((r) =>
          [1, 2, 3, 4, 5].every((lvl) =>
            r.details.some((d) => d.scoreLevel === lvl),
          ),
        ) ??
        matched.rubricSets.find((r) => r.details.length >= 5) ??
        matched.rubricSets[0] ??
        null;
      await prisma.assessmentScenarioCompetency.update({
        where: { id: c.id },
        data: {
          competencyId: matched.id,
          competencyCode: matched.code,
          nameKo: matched.nameKo,
          definition: matched.description ?? c.definition,
          rubricSetId: c.rubricSetId ?? rubric?.id ?? null,
        },
      });
      repairs.push(`${c.nameKo} → ${matched.code} 역량 연결`);
    } else if (matched && !c.rubricSetId) {
      const rubric =
        matched.rubricSets.find((r) =>
          [1, 2, 3, 4, 5].every((lvl) =>
            r.details.some((d) => d.scoreLevel === lvl),
          ),
        ) ??
        matched.rubricSets.find((r) => r.details.length >= 5) ??
        matched.rubricSets[0] ??
        null;
      if (rubric) {
        await prisma.assessmentScenarioCompetency.update({
          where: { id: c.id },
          data: { rubricSetId: rubric.id },
        });
        repairs.push(`${matched.nameKo}: 기본 루브릭 연결`);
      }
    }
  }

  scenario = await prisma.assessmentScenario.findUniqueOrThrow({
    where: { id: scenarioId },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  return { scenario, repairs };
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
