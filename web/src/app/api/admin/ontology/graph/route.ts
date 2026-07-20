import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { parseResumeSummary } from "@/lib/interview/build-question";
import { ensureResumeEvidence, evidenceGaps } from "@/lib/interview/resume-evidence";
import { loadCompetencyPerformance } from "@/lib/interview/resume-ontology";
import {
  fetchCandidateGraphFromNeo4j,
  fetchCohortWeakDemoStats,
  recommendNextCompetencies,
} from "@/lib/neo4j/graph-analytics";

/**
 * GET ?userId= — 후보 자소서 증거 그래프 + 추천 역량
 * GET ?cohort=1 — 참여 현황 약점 DEMONSTRATED 집계
 */
export async function GET(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("cohort") === "1") {
      const stats = await fetchCohortWeakDemoStats();
      return NextResponse.json({ cohort: stats });
    }

    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId 또는 cohort=1 이 필요합니다." }, { status: 400 });
    }

    const resumeId = url.searchParams.get("resumeId");
    const resume = await prisma.resume.findFirst({
      where: {
        userId,
        ...(resumeId ? { id: resumeId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = resume?.parsedTags
      ? ensureResumeEvidence(parseResumeSummary(resume.parsedTags) ?? {
          summary: "",
          skills: [],
          experiences: [],
          keywords: [],
          chunks: [],
        })
      : null;

    const [graph, performances] = await Promise.all([
      fetchCandidateGraphFromNeo4j({ userId, resumeId: resume?.id }),
      loadCompetencyPerformance(userId),
    ]);

    const recommendations = recommendNextCompetencies({
      performances,
      evidence: summary?.evidence,
      limit: 4,
    });

    return NextResponse.json({
      userId,
      resumeId: resume?.id ?? null,
      interpretMode: summary?.interpretMode ?? null,
      postgresClaims: summary?.evidence ?? [],
      gaps: evidenceGaps(summary?.evidence ?? []),
      neo4j: graph,
      performances,
      recommendations,
    });
  } catch (e) {
    console.error("[admin/ontology/graph]", e);
    return NextResponse.json({ error: "온톨로지 그래프 조회 실패" }, { status: 500 });
  }
}
