import {
  detectStarCoverage,
  extractQuote,
  starCoachingNote,
} from "@/lib/interview/feedback-helpers";

/** 비로그인 데모 1문항 체험 — LLM 없이 STAR 휴리스틱만 사용 */
export function buildGuestTryFeedback(answer: string, questionText: string) {
  const trimmed = answer.trim();
  const coverage = detectStarCoverage(trimmed);
  const covered = Object.values(coverage).filter(Boolean).length;
  const score = Math.min(5, Math.max(1, Math.round((covered / 4) * 4 + (trimmed.length > 80 ? 1 : 0))));

  return {
    score,
    quote: extractQuote(trimmed),
    coaching: starCoachingNote(coverage),
    star: coverage,
    summary:
      covered >= 3
        ? "구조가 잡힌 답변입니다. 로그인 후 자소서 맞춤 질문·IRT 적응형 면접을 이어가 보세요."
        : "한 문항만으로도 피드백 흐름을 맛볼 수 있습니다. 전체 면접에서는 꼬리질문과 역량별 채점이 이어집니다.",
    questionEcho: questionText.slice(0, 200),
  };
}
