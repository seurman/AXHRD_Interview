import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** L1–L5 → rough IRT difficulty so CAT still has a slope */
function difficultyForLevel(level: number): number {
  const map: Record<number, number> = {
    1: -1.4,
    2: -0.6,
    3: 0,
    4: 0.7,
    5: 1.4,
  };
  return map[level] ?? 0;
}

/**
 * DemoWorkspace 역량·문항을 운영 Competency/Question에 upsert해 IRT 세션이
 * NCS 없이도 Global 코드 그대로 돌 수 있게 한다.
 * (운영 뱅크를 망가뜨리지 않도록 isActive 역량·문항만 보장, 기존 NCS는 유지)
 */
export async function materializeDemoKitToInterviewBank(workspaceId: string): Promise<{
  codes: string[];
  questionCount: number;
}> {
  const workspace = await prisma.demoWorkspace.findUnique({
    where: { id: workspaceId },
    include: {
      competencies: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      questions: { where: { isActive: true }, orderBy: [{ level: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!workspace) throw new Error("데모를 찾을 수 없습니다.");

  const codes: string[] = [];
  let questionCount = 0;

  await prisma.$transaction(async (tx) => {
    let sortBase = 100;
    for (const dc of workspace.competencies) {
      const existing = await tx.competency.findUnique({ where: { code: dc.code } });
      if (existing) {
        await tx.competency.update({
          where: { id: existing.id },
          data: {
            nameKo: dc.nameKo,
            description: dc.description ?? existing.description,
            isActive: true,
            rubricByLevel: (dc.rubricByLevel ?? existing.rubricByLevel ?? {}) as Prisma.InputJsonValue,
          },
        });
      } else {
        await tx.competency.create({
          data: {
            code: dc.code,
            nameKo: dc.nameKo,
            description: dc.description,
            sortOrder: sortBase++,
            isActive: true,
            rubricByLevel: (dc.rubricByLevel ?? {}) as Prisma.InputJsonValue,
          },
        });
      }
      codes.push(dc.code);
    }

    const comps = await tx.competency.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const idByCode = new Map(comps.map((c) => [c.code, c.id]));

    for (const dq of workspace.questions) {
      const demoComp = workspace.competencies.find((c) => c.id === dq.competencyId);
      if (!demoComp) continue;
      const competencyId = idByCode.get(demoComp.code);
      if (!competencyId) continue;

      // Prefer DEMO- external ids for isolation; fall back to raw if already unique
      const preferredId = dq.externalId.startsWith("DEMO-")
        ? dq.externalId
        : `DEMO-${dq.externalId}`;

      const level = Math.min(5, Math.max(1, dq.level || 3));
      const existingQ =
        (await tx.question.findUnique({ where: { externalId: preferredId } })) ??
        (await tx.question.findUnique({ where: { externalId: dq.externalId } }));

      if (existingQ) {
        await tx.question.update({
          where: { id: existingQ.id },
          data: {
            competencyId,
            level,
            template: dq.template,
            isActive: true,
            sortOrder: dq.sortOrder,
            rubricCriteria: (dq.rubricCriteria ?? []) as Prisma.InputJsonValue,
            difficulty: difficultyForLevel(level),
          },
        });
      } else {
        await tx.question.create({
          data: {
            externalId: preferredId,
            competencyId,
            level,
            difficulty: difficultyForLevel(level),
            discrimination: 1,
            template: dq.template,
            sortOrder: dq.sortOrder,
            isActive: true,
            rubricCriteria: (dq.rubricCriteria ?? []) as Prisma.InputJsonValue,
          },
        });
      }
      questionCount += 1;
    }
  });

  return { codes, questionCount };
}
