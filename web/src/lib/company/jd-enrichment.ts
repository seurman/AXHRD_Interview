import type { CompetencyCode } from "@/types";
import type { JDMapResult } from "@/lib/company/jd-mapper";
import {
  pickGraphRecommendation,
  scoreJdWithMeaningGraph,
  type MeaningGraphCompetencyScore,
} from "@/lib/meaning/jd-competency-match";
import { buildRecommendedCompetencySet } from "@/lib/meaning/suggest-competency-set";

export type JdRecommendationSource = "llm" | "meaning_graph" | "blended";

export type EnrichedJdMapResult = JDMapResult & {
  meaningGraphScores: MeaningGraphCompetencyScore[];
  recommendationSource: JdRecommendationSource | null;
  /** 공고·그래프 기반 역량 세트(최대 4개) — 차수 면접 추천용 */
  recommendedCompetencySet: CompetencyCode[];
};

export async function enrichJdAnalysisWithMeaningGraph(
  base: JDMapResult,
  params: {
    jdText: string;
    industryCode?: string | null;
    jobRoleCode?: string | null;
  },
): Promise<EnrichedJdMapResult> {
  const extraTerms = [
    ...base.interviewStyle.focus,
    ...base.requirements.skills,
    ...base.requirements.keywords,
  ];

  const meaningGraphScores = await scoreJdWithMeaningGraph({
    jdText: params.jdText,
    extraTerms,
    industryCode: params.industryCode,
    jobRoleCode: params.jobRoleCode,
  });

  const graphPick = pickGraphRecommendation(meaningGraphScores);
  let recommendedCompetency = base.recommendedCompetency;
  let competencyRationale = base.competencyRationale;
  let recommendationSource: JdRecommendationSource | null = null;

  if (base.recommendedCompetency && graphPick?.code === base.recommendedCompetency) {
    recommendationSource = "blended";
  } else if (base.recommendedCompetency) {
    recommendationSource = "llm";
  } else if (graphPick) {
    recommendedCompetency = graphPick.code;
    competencyRationale = graphPick.rationale;
    recommendationSource = "meaning_graph";
  } else if (meaningGraphScores[0]) {
    recommendationSource = "meaning_graph";
  }

  return {
    ...base,
    recommendedCompetency,
    competencyRationale,
    meaningGraphScores,
    recommendationSource,
    recommendedCompetencySet: buildRecommendedCompetencySet(
      meaningGraphScores,
      recommendedCompetency,
    ),
  };
}

export function graphScoresForCompetency(
  scores: MeaningGraphCompetencyScore[],
  code: CompetencyCode,
): MeaningGraphCompetencyScore | undefined {
  return scores.find((s) => s.code === code);
}
