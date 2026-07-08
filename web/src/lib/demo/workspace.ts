import { prisma } from "@/lib/prisma";
import { parseRubricByLevel } from "@/lib/competency/rubric";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { Prisma } from "@prisma/client";

export type DemoCompetencyDto = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
  rubricByLevel: ReturnType<typeof parseRubricByLevel>;
};

export type DemoQuestionDto = {
  id: string;
  externalId: string;
  competencyId: string;
  competencyCode: string;
  level: number;
  template: string;
  sortOrder: number;
  isActive: boolean;
  rubricCriteria: string[];
};

export function slugifyDemoName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `demo-${Date.now().toString(36)}`;
}

export async function loadDemoWorkspaceSnapshot(workspaceId: string) {
  const workspace = await prisma.demoWorkspace.findUnique({
    where: { id: workspaceId },
    include: {
      competencies: { orderBy: { sortOrder: "asc" } },
      questions: { orderBy: [{ level: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!workspace) return null;

  const compById = new Map(workspace.competencies.map((c) => [c.id, c]));
  const questionCounts = new Map<string, number>();
  for (const q of workspace.questions) {
    questionCounts.set(q.competencyId, (questionCounts.get(q.competencyId) ?? 0) + 1);
  }

  const competencies: DemoCompetencyDto[] = workspace.competencies.map((c) => ({
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    description: c.description,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    questionCount: questionCounts.get(c.id) ?? 0,
    rubricByLevel: parseRubricByLevel(c.rubricByLevel),
  }));

  const questions: DemoQuestionDto[] = workspace.questions.map((q) => ({
    id: q.id,
    externalId: q.externalId,
    competencyId: q.competencyId,
    competencyCode: compById.get(q.competencyId)?.code ?? "",
    level: q.level,
    template: q.template,
    sortOrder: q.sortOrder,
    isActive: q.isActive,
    rubricCriteria: parseRubricCriteria(q.rubricCriteria),
  }));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      updatedAt: workspace.updatedAt,
    },
    competencies,
    questions,
  };
}

export async function loadDemoWorkspaceBySlug(slug: string) {
  const ws = await prisma.demoWorkspace.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!ws) return null;
  return loadDemoWorkspaceSnapshot(ws.id);
}

/** 운영 문항 뱅크 → 데모 워크스페이스로 일괄 복사 (createMany로 타임아웃 완화) */
export async function cloneProductionToDemoWorkspace(workspaceId: string) {
  const { loadContentBankSnapshot } = await import("@/lib/competency/content-bank-data");
  const snap = await loadContentBankSnapshot();

  await prisma.$transaction(async (tx) => {
    await tx.demoQuestion.deleteMany({ where: { workspaceId } });
    await tx.demoCompetency.deleteMany({ where: { workspaceId } });

    if (snap.competencies.length === 0) return;

    await tx.demoCompetency.createMany({
      data: snap.competencies.map((c) => ({
        workspaceId,
        code: c.code,
        nameKo: c.nameKo,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        rubricByLevel: (c.rubricByLevel ?? {}) as Prisma.InputJsonValue,
      })),
    });

    const createdComps = await tx.demoCompetency.findMany({
      where: { workspaceId },
      select: { id: true, code: true },
    });
    const codeToId = new Map(createdComps.map((c) => [c.code, c.id]));

    const questionRows = snap.questions
      .map((q) => {
        const competencyId = codeToId.get(q.competencyCode);
        if (!competencyId) return null;
        return {
          workspaceId,
          competencyId,
          externalId: q.externalId,
          level: q.level,
          template: q.template,
          sortOrder: q.sortOrder,
          isActive: q.isActive,
          rubricCriteria: q.rubricCriteria as Prisma.InputJsonValue,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const CHUNK = 100;
    for (let i = 0; i < questionRows.length; i += CHUNK) {
      await tx.demoQuestion.createMany({ data: questionRows.slice(i, i + CHUNK) });
    }
  });
}
