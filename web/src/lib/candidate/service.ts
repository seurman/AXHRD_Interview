import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";
import type { CompetencyCode } from "@/types";
import {
  ensureOntologySchema,
  syncCandidate,
  syncInterviewPlan,
  syncCompetencyProgress,
} from "@/lib/neo4j/ontology";

export async function upsertCandidate(params: {
  email: string;
  name: string;
  phone?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      phone: params.phone,
      profile: { create: {} },
    },
    update: {
      name,
      phone: params.phone,
    },
    include: { profile: true },
  });

  await ensureOntologySchema();
  await syncCandidate({ id: user.id, email: user.email, name: user.name });

  return user;
}

export async function getOrCreateActivePlan(params: {
  userId: string;
  targetCompanyId?: string;
  resumeId?: string;
  jobRole: string;
  planId?: string;
}) {
  if (params.planId) {
    const existing = await prisma.interviewPlan.findFirst({
      where: { id: params.planId, userId: params.userId },
      include: { competencyProgress: true },
    });
    if (existing) return existing;
  }

  const active = await prisma.interviewPlan.findFirst({
    where: { userId: params.userId, status: "IN_PROGRESS" },
    include: { competencyProgress: true },
    orderBy: { updatedAt: "desc" },
  });

  if (active) {
    await prisma.interviewPlan.update({
      where: { id: active.id },
      data: {
        targetCompanyId: params.targetCompanyId ?? active.targetCompanyId,
        resumeId: params.resumeId ?? active.resumeId,
        jobRole: params.jobRole as never,
      },
    });
    return active;
  }

  const plan = await prisma.interviewPlan.create({
    data: {
      userId: params.userId,
      targetCompanyId: params.targetCompanyId,
      resumeId: params.resumeId,
      jobRole: params.jobRole as never,
      competencyProgress: {
        create: COMPETENCY_CODES.map((code) => ({
          userId: params.userId,
          competency: code,
          status: "NOT_STARTED",
        })),
      },
    },
    include: { competencyProgress: true },
  });

  return plan;
}

export function nextRecommendedCompetency(
  progress: Array<{ competency: string; status: string }>
): CompetencyCode | null {
  const order = [...COMPETENCY_CODES];
  const inProgress = progress.find((p) => p.status === "IN_PROGRESS");
  if (inProgress) return inProgress.competency as CompetencyCode;

  for (const code of order) {
    const row = progress.find((p) => p.competency === code);
    if (!row || row.status === "NOT_STARTED") return code;
  }
  return null;
}

export async function markPlanCompleteIfNeeded(planId: string) {
  const remaining = await prisma.competencyProgress.count({
    where: {
      planId,
      status: { not: "COMPLETED" },
    },
  });

  if (remaining === 0) {
    await prisma.interviewPlan.update({
      where: { id: planId },
      data: { status: "COMPLETED" },
    });
  }
}

export { syncInterviewPlan, syncCompetencyProgress };
