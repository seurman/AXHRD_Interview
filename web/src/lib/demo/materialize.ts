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
 * DemoWorkspace 역량·문항 → 운영 Competency/Question upsert.
 * Supabase transaction pooler에서 interactive $transaction이 끊기는 경우가 있어
 * 순차 upsert로 처리한다.
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
  let sortBase = 100;

  for (const dc of workspace.competencies) {
    const existing = await prisma.competency.findUnique({ where: { code: dc.code } });
    if (existing) {
      await prisma.competency.update({
        where: { id: existing.id },
        data: {
          nameKo: dc.nameKo,
          description: dc.description ?? existing.description,
          isActive: true,
          rubricByLevel: (dc.rubricByLevel ?? existing.rubricByLevel ?? {}) as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.competency.create({
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

  // Global 사전에서 L1–L5 문항이 더 있으면(시드 확장 후) 데모 키트 2문항만 있어도 면접 풀을 채운다
  const globalBank = await prisma.globalCompetency.findMany({
    where: { code: { in: codes } },
    include: {
      questions: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      rubricLevels: { orderBy: { level: "asc" } },
    },
  });
  const globalByCode = new Map(globalBank.map((g) => [g.code, g]));

  for (const code of codes) {
    const g = globalByCode.get(code);
    if (!g || g.questions.length === 0) continue;
    const rubricByLevel: Record<string, string[]> = {};
    for (const lv of g.rubricLevels) {
      rubricByLevel[String(lv.level)] = lv.descriptionKo
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    await prisma.competency.update({
      where: { code },
      data: {
        rubricByLevel: rubricByLevel as Prisma.InputJsonValue,
      },
    });
  }

  const comps = await prisma.competency.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, rubricByLevel: true },
  });
  const idByCode = new Map(comps.map((c) => [c.code, c.id]));

  type PoolQ = {
    code: string;
    externalId: string;
    level: number;
    template: string;
    sortOrder: number;
    rubricCriteria: string[];
  };
  const pool: PoolQ[] = [];

  for (const dq of workspace.questions) {
    const demoComp = workspace.competencies.find((c) => c.id === dq.competencyId);
    if (!demoComp) continue;
    const level = Math.min(5, Math.max(1, dq.level || 3));
    pool.push({
      code: demoComp.code,
      externalId: dq.externalId.startsWith("DEMO-") ? dq.externalId : `DEMO-${dq.externalId}`,
      level,
      template: dq.template,
      sortOrder: dq.sortOrder,
      rubricCriteria: Array.isArray(dq.rubricCriteria)
        ? (dq.rubricCriteria as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
    });
  }

  for (const g of globalBank) {
    const demoQsForCode = pool.filter((p) => p.code === g.code).length;
    if (demoQsForCode >= 10) continue; // already rich kit
    for (const q of g.questions) {
      const m = /(?:^|-)L([1-5])(?:-|$)/i.exec(q.externalId);
      const level = m ? Number(m[1]) : 3;
      const ext = q.externalId.startsWith("DEMO-") ? q.externalId : `DEMO-${q.externalId}`;
      if (pool.some((p) => p.externalId === ext || p.template === q.questionText)) continue;
      const rubric =
        g.rubricLevels
          .find((lv) => lv.level === level)
          ?.descriptionKo.split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      pool.push({
        code: g.code,
        externalId: ext,
        level,
        template: q.questionText,
        sortOrder: q.sortOrder,
        rubricCriteria: rubric,
      });
    }
  }

  for (const dq of pool) {
    const competencyId = idByCode.get(dq.code);
    if (!competencyId) continue;

    const existingQ = await prisma.question.findUnique({ where: { externalId: dq.externalId } });
    const data = {
      competencyId,
      level: dq.level,
      template: dq.template,
      isActive: true as const,
      sortOrder: dq.sortOrder,
      rubricCriteria: dq.rubricCriteria as Prisma.InputJsonValue,
      difficulty: difficultyForLevel(dq.level),
      discrimination: 1,
    };

    if (existingQ) {
      await prisma.question.update({ where: { id: existingQ.id }, data });
    } else {
      await prisma.question.create({
        data: { externalId: dq.externalId, ...data },
      });
    }
    questionCount += 1;
  }

  return { codes, questionCount };
}
