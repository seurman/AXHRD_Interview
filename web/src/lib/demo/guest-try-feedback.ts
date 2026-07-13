import { evaluateAnswer, mockEvaluate } from "@/lib/gemini/evaluate";
import {
  buildAnswerKeyPointFeedback,
  detectStarCoverage,
  starRewriteTemplate,
  type StarCoverage,
} from "@/lib/interview/feedback-helpers";
import {
  findWeakestDimension,
  type AnswerDimensionKey,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { competencyLabel, dimensionLabel } from "@/lib/labels";

export type GuestTryFeedback = {
  scorePct: number;
  /** 1~5 — 레거시 호환 */
  score: number;
  headline: string;
  summary: string;
  coaching: string;
  quote: string;
  keyPoints: string[];
  evidence: { quote: string; supports: string }[];
  dimensions: AnswerDimensions;
  weakestDimension: AnswerDimensionKey;
  star: StarCoverage;
  rewriteHint: string;
  unlockItems: string[];
  questionEcho: string;
};

const UNLOCK_ITEMS = [
  "자소서·공고에서 뽑은 맞춤 질문",
  "음성 답변 + AI 꼬리질문",
  "6축 레이더 & 역량 점수 누적",
  "세션 종료 코칭 리포트",
] as const;

function headlineForScore(scorePct: number, weakest: AnswerDimensionKey): string {
  const weakLabel = dimensionLabel(weakest);
  if (scorePct >= 72) {
    return `핵심은 전달됐어요 — 가입 후 음성 면접에서 「${weakLabel}」까지 더 깊게 파고들 수 있어요.`;
  }
  if (scorePct >= 48) {
    return `뼈대는 보여요 — 「${weakLabel}」만 채우면 체감 점수가 확 올라갑니다.`;
  }
  return `아직 요약 수준이에요 — 구체 사례·수치가 붙으면 면접관이 기억하는 답변이 됩니다.`;
}

/** 비로그인 1문항 체험 — Gemini 있으면 실채점, 없으면 mockEvaluate(6축) */
export async function buildGuestTryFeedback(
  answer: string,
  questionText: string,
  competencyCode = "COMMUNICATION",
): Promise<GuestTryFeedback> {
  const trimmed = answer.trim();
  const rubric = process.env.GEMINI_API_KEY
    ? await evaluateAnswer({
        question: questionText,
        answer: trimmed,
        competency: competencyCode,
      })
    : mockEvaluate(trimmed);

  const keyPoint = buildAnswerKeyPointFeedback({
    answer: trimmed,
    briefFeedback: rubric.briefFeedback,
    dimensions: rubric.dimensions,
    score: rubric.score,
  });

  const scorePct = Math.round(rubric.score * 100);
  const weakest = findWeakestDimension(rubric.dimensions);
  const coverage = detectStarCoverage(trimmed);
  const label = competencyLabel(competencyCode);

  return {
    scorePct,
    score: Math.min(5, Math.max(1, Math.round(rubric.score * 5))),
    headline: headlineForScore(scorePct, weakest),
    summary: keyPoint.summary,
    coaching: rubric.briefFeedback,
    quote: keyPoint.quote,
    keyPoints: keyPoint.keyPoints,
    evidence: keyPoint.evidence,
    dimensions: rubric.dimensions,
    weakestDimension: weakest,
    star: coverage,
    rewriteHint: starRewriteTemplate(label),
    unlockItems: [...UNLOCK_ITEMS],
    questionEcho: questionText.slice(0, 200),
  };
}
