import { prisma } from "@/lib/prisma";
import { parseEvidenceAssessmentReport } from "@/lib/assessment/evidence-report";
import type { EvidenceAssessmentReport } from "@/types/evidence-assessment";
import type { EvidenceAssessmentDomain, Prisma } from "@prisma/client";

/**
 * 세션 리포트에 증거형 리포트를 저장(SSOT: SessionReport.evidenceJson).
 * summaryJson 레거시 리포트는 건드리지 않는다. 검증 실패 시 저장하지 않고 false.
 */
export async function saveSessionEvidence(
  sessionId: string,
  report: EvidenceAssessmentReport,
): Promise<boolean> {
  const valid = parseEvidenceAssessmentReport(report);
  if (!valid) {
    console.error("[evidence persist] invalid report, skip session", sessionId);
    return false;
  }
  await prisma.sessionReport.upsert({
    where: { sessionId },
    create: {
      sessionId,
      summaryHtml: "",
      summaryJson: {} as Prisma.InputJsonValue,
      evidenceJson: valid as unknown as Prisma.InputJsonValue,
      schemaVersion: valid.schemaVersion,
    },
    update: {
      evidenceJson: valid as unknown as Prisma.InputJsonValue,
      schemaVersion: valid.schemaVersion,
    },
  });
  return true;
}

export type UpsertBehavioralAssessmentReportInput = {
  domain: EvidenceAssessmentDomain;
  sourceType: string;
  sourceId: string;
  report: EvidenceAssessmentReport;
  attemptId?: string;
};

export async function upsertBehavioralAssessmentReport(
  input: UpsertBehavioralAssessmentReportInput,
): Promise<boolean> {
  const { domain, sourceType, sourceId, report, attemptId } = input;
  const valid = parseEvidenceAssessmentReport(report);
  if (!valid) {
    console.error("[evidence persist] invalid report, skip", sourceType, sourceId);
    return false;
  }

  await prisma.behavioralAssessmentReport.upsert({
    where: { sourceType_sourceId: { sourceType, sourceId } },
    create: {
      domain,
      sourceType,
      sourceId,
      schemaVersion: valid.schemaVersion,
      overallScore: valid.overallScore,
      title: valid.title,
      roleContext: valid.roleContext ?? null,
      reportJson: valid as unknown as Prisma.InputJsonValue,
      attemptId: attemptId ?? null,
    },
    update: {
      domain,
      schemaVersion: valid.schemaVersion,
      overallScore: valid.overallScore,
      title: valid.title,
      roleContext: valid.roleContext ?? null,
      reportJson: valid as unknown as Prisma.InputJsonValue,
      ...(attemptId !== undefined ? { attemptId } : {}),
      generatedAt: new Date(),
    },
  });
  return true;
}
