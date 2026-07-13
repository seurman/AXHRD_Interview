import { prisma } from "@/lib/prisma";
import {
  averageDimensions,
  normalizeAnswerDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import type { SessionReportData } from "@/types";

export type CandidateCompareRow = {
  sessionId: string;
  name: string;
  completedAt: string | null;
  focusCompetency: string | null;
  avgScore: number | null;
  percentile: number | null;
  dimensions: AnswerDimensions | null;
  pasteDetected: boolean;
  tabSwitchCount: number;
};

export type CandidateComparisonPayload = {
  shareId: string;
  shareLabel: string;
  shareSlug: string;
  competencies: string[];
  rows: CandidateCompareRow[];
};

function thetaToPercentile(theta: number | null | undefined): number | null {
  if (theta == null || Number.isNaN(theta)) return null;
  return Math.round(50 + theta * 25);
}

function reportAvgScore(report: SessionReportData | undefined): number | null {
  if (!report?.sections?.length) return null;
  return Math.round(
    report.sections.reduce((s, sec) => s + (sec.score ?? 0), 0) /
      Math.max(report.sections.length, 1),
  );
}

/** 캠페인 내 완료 지원자 — 역량·6축·종합 점수 비교용 */
export async function getCandidateComparison(
  organizationId: string,
  shareId: string,
): Promise<CandidateComparisonPayload | null> {
  const share = await prisma.orgInterviewKitShare.findUnique({
    where: { id: shareId },
    select: {
      id: true,
      label: true,
      slug: true,
      organizationId: true,
      competencies: true,
    },
  });

  if (!share || share.organizationId !== organizationId) return null;

  const shareCompetencies = Array.isArray(share.competencies)
    ? share.competencies.filter((c): c is string => typeof c === "string")
    : [];

  const sessions = await prisma.interviewSession.findMany({
    where: { orgKitShareId: shareId, status: "COMPLETED" },
    orderBy: [{ completedAt: "desc" }],
    include: {
      user: { select: { name: true } },
      report: { select: { summaryJson: true } },
      responses: {
        where: { isBonusQuestion: false, isClaimVerification: false },
        select: { dimensions: true },
      },
    },
  });

  const rows: CandidateCompareRow[] = sessions.map((s) => {
    const normalized = s.responses
      .map((r) => normalizeAnswerDimensions(r.dimensions))
      .filter((d): d is AnswerDimensions => d !== null);
    const dimensions =
      normalized.length > 0 ? averageDimensions(normalized) : null;
    const report = s.report?.summaryJson as SessionReportData | undefined;

    return {
      sessionId: s.id,
      name: s.user.name,
      completedAt: s.completedAt?.toISOString() ?? null,
      focusCompetency: s.focusCompetency,
      avgScore: reportAvgScore(report),
      percentile: thetaToPercentile(s.overallTheta),
      dimensions,
      pasteDetected: s.pasteDetected,
      tabSwitchCount: s.tabSwitchCount,
    };
  });

  rows.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  const competenciesFromRows = [
    ...new Set(rows.map((r) => r.focusCompetency).filter(Boolean) as string[]),
  ];

  return {
    shareId: share.id,
    shareLabel: share.label,
    shareSlug: share.slug,
    competencies:
      shareCompetencies.length > 0 ? shareCompetencies : competenciesFromRows,
    rows,
  };
}
