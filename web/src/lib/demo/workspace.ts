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
  // URL·Vercel 라우팅 안정성: ASCII만 사용 (한글 slug는 미리보기 404 유발)
  const ascii = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ascii || `demo-${Date.now().toString(36)}`;
}

function decodeSlugCandidates(slug: string): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  push(slug);
  try {
    push(decodeURIComponent(slug));
  } catch {
    /* ignore */
  }
  try {
    push(decodeURIComponent(decodeURIComponent(slug)));
  } catch {
    /* ignore */
  }
  for (const s of [...out]) {
    push(s.normalize("NFC"));
    push(s.normalize("NFD"));
  }
  return out;
}

/** 기존 한글 slug를 ASCII로 고쳐 공개 URL이 404 나지 않게 한다 */
export async function ensureDemoWorkspacePublicSlug(workspaceId: string): Promise<string> {
  const ws = await prisma.demoWorkspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });
  if (!ws) throw new Error("데모를 찾을 수 없습니다.");

  const needsFix = /[^a-z0-9-]/i.test(ws.slug) || !ws.slug;
  if (!needsFix) return ws.slug;

  let next = slugifyDemoName(ws.name);
  const clash = await prisma.demoWorkspace.findFirst({
    where: { slug: next, NOT: { id: workspaceId } },
    select: { id: true },
  });
  if (clash) next = `${next}-${Date.now().toString(36).slice(-4)}`;

  await prisma.demoWorkspace.update({
    where: { id: workspaceId },
    data: { slug: next },
  });
  return next;
}

export async function loadDemoWorkspaceSnapshot(workspaceId: string) {
  // ensure ASCII slug lazily so preview links keep working
  try {
    await ensureDemoWorkspacePublicSlug(workspaceId);
  } catch {
    /* ignore */
  }

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
  const candidates = decodeSlugCandidates(slug);
  for (const candidate of candidates) {
    const ws = await prisma.demoWorkspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (ws) return loadDemoWorkspaceSnapshot(ws.id);
  }

  // 한글 이름 → 깨진 ASCII 슬러그로 남은 workspace: 이름 부분 일치 시도
  const decoded = candidates.find((c) => /[가-힣]/.test(c));
  if (decoded) {
    const spaced = decoded.replace(/-/g, " ").trim();
    const compact = decoded.replace(/-/g, "").trim();
    const guess = await prisma.demoWorkspace.findFirst({
      where: {
        OR: [
          { name: { contains: spaced } },
          ...(compact && compact !== spaced ? [{ name: { contains: compact } }] : []),
        ],
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (guess) return loadDemoWorkspaceSnapshot(guess.id);
  }

  return null;
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
