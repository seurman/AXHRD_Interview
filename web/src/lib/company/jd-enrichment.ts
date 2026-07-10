import type { CompetencyCode } from "@/types";
import type { JDMapResult } from "@/lib/company/jd-mapper";
import {
  pickGraphRecommendation,
  scoreJdWithMeaningGraph,
  type MeaningGraphCompetencyScore,
} from "@/lib/meaning/jd-competency-match";

export type JdRecommendationSource = "llm" | "meaning_graph" | "blended";

export type EnrichedJdMapResult = JDMapResult & {
  meaningGraphScores: MeaningGraphCompetencyScore[];
  recommendationSource: JdRecommendationSource | null;
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
  };
}

export function graphScoresForCompetency(
  scores: MeaningGraphCompetencyScore[],
  code: CompetencyCode,
): MeaningGraphCompetencyScore | undefined {
  return scores.find((s) => s.code === code);
}
