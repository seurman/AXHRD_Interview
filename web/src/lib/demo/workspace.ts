import { prisma } from "@/lib/prisma";
import { parseRubricByLevel } from "@/lib/competency/rubric";
import { parseRubricCriteria } from "@/lib/competency/bank";

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

export async function cloneProductionToDemoWorkspace(workspaceId: string) {
  const { loadContentBankSnapshot } = await import("@/lib/competency/content-bank-data");
  const snap = await loadContentBankSnapshot();

  await prisma.$transaction(async (tx) => {
    await tx.demoCompetency.deleteMany({ where: { workspaceId } });
    await tx.demoQuestion.deleteMany({ where: { workspaceId } });

    const compIdMap = new Map<string, string>();
    for (const c of snap.competencies) {
      const created = await tx.demoCompetency.create({
        data: {
          workspaceId,
          code: c.code,
          nameKo: c.nameKo,
          description: c.description,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          rubricByLevel: (c.rubricByLevel ?? {}) as object,
        },
      });
      compIdMap.set(c.id, created.id);
    }

    for (const q of snap.questions) {
      const compId = compIdMap.get(q.competencyId);
      if (!compId) continue;
      await tx.demoQuestion.create({
        data: {
          workspaceId,
          competencyId: compId,
          externalId: q.externalId,
          level: q.level,
          template: q.template,
          sortOrder: q.sortOrder,
          isActive: q.isActive,
          rubricCriteria: q.rubricCriteria,
        },
      });
    }
  });
}
