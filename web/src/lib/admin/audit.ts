import type { AdminAuditAction, PlatformRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditActor = { id: string; email: string; platformRole: PlatformRole };

export async function logAdminAudit(params: {
  actor: AuditActor;
  action: AdminAuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  beforeState?: unknown;
  afterState?: unknown;
}) {
  return prisma.adminAuditLog.create({
    data: {
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      actorRole: params.actor.platformRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      beforeState: params.beforeState as Prisma.InputJsonValue | undefined,
      afterState: params.afterState as Prisma.InputJsonValue | undefined,
    },
  });
}

function snapshotCompetency(c: {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  rubricByLevel: unknown;
}) {
  return {
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    description: c.description,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    rubricByLevel: c.rubricByLevel,
  };
}

function snapshotQuestion(q: {
  id: string;
  externalId: string;
  competencyId: string;
  level: number;
  template: string;
  difficulty: number;
  discrimination: number;
  followUpHints: unknown;
  rubricCriteria: unknown;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: q.id,
    externalId: q.externalId,
    competencyId: q.competencyId,
    level: q.level,
    template: q.template,
    difficulty: q.difficulty,
    discrimination: q.discrimination,
    followUpHints: q.followUpHints,
    rubricCriteria: q.rubricCriteria,
    sortOrder: q.sortOrder,
    isActive: q.isActive,
  };
}

export { snapshotCompetency, snapshotQuestion };

export async function rollbackAdminAudit(logId: string, superadminId: string) {
  const log = await prisma.adminAuditLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("감사 로그를 찾을 수 없습니다.");
  if (log.rolledBackAt) throw new Error("이미 롤백된 변경입니다.");

  const before = log.beforeState as Record<string, unknown> | null;

  switch (log.entityType) {
    case "competency": {
      if (!log.entityId) break;
      if (log.action === "CREATE") {
        const responseCount = await prisma.responseRecord.count({
          where: { question: { competencyId: log.entityId } },
        });
        if (responseCount > 0) {
          await prisma.competency.update({
            where: { id: log.entityId },
            data: { isActive: false },
          });
        } else {
          await prisma.competency.delete({ where: { id: log.entityId } });
        }
      } else if (before) {
        await prisma.competency.update({
          where: { id: log.entityId },
          data: {
            nameKo: before.nameKo as string,
            description: (before.description as string | null) ?? null,
            sortOrder: before.sortOrder as number,
            isActive: before.isActive as boolean,
            rubricByLevel: before.rubricByLevel as Prisma.InputJsonValue,
          },
        });
      }
      break;
    }
    case "question": {
      if (!log.entityId) break;
      if (log.action === "CREATE") {
        const responseCount = await prisma.responseRecord.count({
          where: { questionId: log.entityId },
        });
        if (responseCount > 0) {
          await prisma.question.update({
            where: { id: log.entityId },
            data: { isActive: false },
          });
        } else {
          await prisma.question.delete({ where: { id: log.entityId } });
        }
      } else if (before) {
        await prisma.question.update({
          where: { id: log.entityId },
          data: {
            template: before.template as string,
            level: before.level as number,
            difficulty: before.difficulty as number,
            discrimination: before.discrimination as number,
            competencyId: before.competencyId as string,
            followUpHints: before.followUpHints as Prisma.InputJsonValue,
            rubricCriteria: before.rubricCriteria as Prisma.InputJsonValue,
            sortOrder: before.sortOrder as number,
            isActive: before.isActive as boolean,
          },
        });
      }
      break;
    }
    case "rubric_import": {
      const items = (before?.items ?? []) as Array<{
        competencyId: string;
        rubricByLevel: unknown;
      }>;
      for (const item of items) {
        await prisma.competency.update({
          where: { id: item.competencyId },
          data: { rubricByLevel: item.rubricByLevel as Prisma.InputJsonValue },
        });
      }
      break;
    }
    case "user": {
      if (!log.entityId || !before) break;
      await prisma.user.update({
        where: { id: log.entityId },
        data: {
          platformRole: before.platformRole as PlatformRole,
          orgRole: before.orgRole as "STUDENT" | "STAFF" | "ADMIN",
          organizationId: (before.organizationId as string | null) ?? null,
        },
      });
      break;
    }
    case "question_rubric_bulk": {
      const items = (before?.items ?? []) as Array<{
        id: string;
        rubricCriteria: unknown;
      }>;
      for (const item of items) {
        await prisma.question.update({
          where: { id: item.id },
          data: { rubricCriteria: item.rubricCriteria as Prisma.InputJsonValue },
        });
      }
      break;
    }
    case "organization": {
      if (!log.entityId || !before) break;
      await prisma.organization.update({
        where: { id: log.entityId },
        data: {
          status: before.status as "PENDING" | "APPROVED" | "REJECTED",
          approvedAt: before.approvedAt ? new Date(before.approvedAt as string) : null,
          rejectedAt: before.rejectedAt ? new Date(before.rejectedAt as string) : null,
        },
      });
      break;
    }
    default:
      throw new Error(`롤백 미지원 entityType: ${log.entityType}`);
  }

  return prisma.adminAuditLog.update({
    where: { id: logId },
    data: { rolledBackAt: new Date(), rolledBackBy: superadminId },
  });
}
