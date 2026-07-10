/**
 * 답변 텍스트 기반 피드백 보조 함수.
 * LLM(DeepSeek) 키가 없어도 실제 답변에서 인용문·STAR 커버리지를 뽑아
 * mock 피드백의 품질을 높인다. 오디오·표정 등 비언어적 신호는 다루지 않는다
 * (docs/COMMERCIAL.md 특허 회피 원칙 — 텍스트 루브릭만 사용).
 */

import {
  findWeakestDimension,
  type AnswerDimensionKey,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";

const STAR_KEYWORDS = {
  situation: /상황|배경|당시|입사|근무하던|맡고\s?있던|진행하던/,
  task: /과제|목표|문제|요구사항|해결해야|맡은\s?일|미션/,
  action: /제가|직접|저는|수행했|진행했|시도했|도입했|설계했|개발했|기획했|담당했/,
  result: /결과|성과|개선|달성|증가|감소|%|퍼센트|배\s?증가|덕분에|줄였|늘렸/,
};

export interface StarCoverage {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export function detectStarCoverage(answer: string): StarCoverage {
  return {
    situation: STAR_KEYWORDS.situation.test(answer),
    task: STAR_KEYWORDS.task.test(answer),
    action: STAR_KEYWORDS.action.test(answer),
    result: STAR_KEYWORDS.result.test(answer),
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10);
}

/** 답변 중 가장 대표성 있는 한 문장을 인용문으로 추출한다(수치·행동 서술 우선). */
export function extractQuote(answer: string, maxLen = 90): string {
  const sentences = splitSentences(answer);
  if (sentences.length === 0) {
    return answer.length > maxLen ? `${answer.slice(0, maxLen - 1)}…` : answer;
  }

  const withMetric = sentences.find((s) => /\d+%?|\d+명|\d+억|\d+건|\d+배/.test(s));
  const withAction = sentences.find((s) => STAR_KEYWORDS.action.test(s));
  const pick = withMetric ?? withAction ?? sentences[Math.floor(sentences.length / 2)];

  return pick.length > maxLen ? `${pick.slice(0, maxLen - 1)}…` : pick;
}

/** STAR 커버리지를 바탕으로 한 줄 코칭 노트를 만든다. 답변마다 실제로 다른 문구가 나오도록
 *  누락된 요소의 조합에 따라 분기한다(모두 같은 문구가 반복 노출되는 문제 방지). */
export function starCoachingNote(coverage: StarCoverage): string {
  const missing: string[] = [];
  if (!coverage.situation) missing.push("상황");
  if (!coverage.task) missing.push("과제");
  if (!coverage.action) missing.push("행동");
  if (!coverage.result) missing.push("결과(수치)");

  if (missing.length === 0) {
    return "상황·과제·행동·결과가 고르게 드러난 답변입니다.";
  }

  if (missing.length === 4) {
    return "구체적인 경험 서술이 보이지 않아요. 실제 사례 하나를 골라 상황부터 순서대로 풀어보세요.";
  }

  if (missing.length === 1) {
    return `${missing[0]} 설명만 보강하면 완성도 높은 답변이 됩니다.`;
  }

  const present: string[] = [];
  if (coverage.situation) present.push("상황");
  if (coverage.task) present.push("과제");
  if (coverage.action) present.push("행동");
  if (coverage.result) present.push("결과");

  if (present.length > 0) {
    return `${present.join("·")} 설명은 좋았어요. ${missing.join("·")} 부분을 더하면 훨씬 설득력이 생겨요.`;
  }

  return `${missing.join("·")} 순서로 구조를 채워보면 훨씬 설득력 있는 답변이 됩니다.`;
}

const STAR_LABELS: Record<keyof StarCoverage, string> = {
  situation: "상황",
  task: "과제",
  action: "행동",
  result: "결과(수치)",
};

export interface FeedbackEvidenceItem {
  quote: string;
  supports: string;
}

/** 점수·차원과 답변 인용을 짝지은 근거 목록 (추가 LLM 없음). */
export function buildEvidenceFromAnswer(params: {
  answer: string;
  dimensions?: AnswerDimensions;
  score?: number;
}): FeedbackEvidenceItem[] {
  const sentences = splitSentences(params.answer);
  const evidence: FeedbackEvidenceItem[] = [];
  const primary = extractQuote(params.answer, 100);
  if (primary.trim()) {
    const scorePct =
      typeof params.score === "number" ? Math.round(params.score * 100) : null;
    evidence.push({
      quote: primary,
      supports:
        scorePct != null
          ? `종합 ${scorePct}점의 주요 근거로 사용한 발화`
          : "평가에 사용한 대표 발화",
    });
  }

  if (params.dimensions) {
    const sorted = Object.entries(params.dimensions).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const weak = sorted[sorted.length - 1];

    const metricSentence = sentences.find((s) =>
      /\d+%?|\d+명|\d+억|\d+건|\d+배/.test(s)
    );
    if (best && best[1] >= 0.6 && metricSentence && metricSentence !== primary) {
      evidence.push({
        quote: metricSentence.length > 90 ? `${metricSentence.slice(0, 89)}…` : metricSentence,
        supports: `${dimensionLabel(best[0])} ${Math.round(best[1] * 100)}% — 구체 지표가 드러난 구간`,
      });
    }

    const actionSentence = sentences.find(
      (s) => STAR_KEYWORDS.action.test(s) && s !== primary && s !== metricSentence
    );
    if (weak && weak[1] < 0.55) {
      const fallback = actionSentence ?? sentences.find((s) => s !== primary) ?? primary;
      if (fallback && !evidence.some((e) => e.quote === fallback)) {
        evidence.push({
          quote: fallback.length > 90 ? `${fallback.slice(0, 89)}…` : fallback,
          supports: `${dimensionLabel(weak[0])} ${Math.round(weak[1] * 100)}% — 이 발화만으로는 보강이 필요함`,
        });
      }
    }
  }

  return evidence.slice(0, 3);
}

/** 답변 직후 UI에 보여줄 핵심 포인트·IRT 코멘트를 만든다(추가 LLM 호출 없음). */
export function buildAnswerKeyPointFeedback(params: {
  answer: string;
  briefFeedback: string;
  dimensions?: AnswerDimensions;
  chipType?: "pass" | "attempt" | "downgrade";
  level?: number;
  competency?: string;
  nextLevel?: number;
  isInterim?: boolean;
  score?: number;
}): {
  summary: string;
  keyPoints: string[];
  irtNote: string;
  quote: string;
  evidence: FeedbackEvidenceItem[];
  dimensions?: AnswerDimensions;
  weakestDimension?: AnswerDimensionKey;
} {
  const coverage = detectStarCoverage(params.answer);
  const keyPoints: string[] = [];

  for (const [key, label] of Object.entries(STAR_LABELS) as [keyof StarCoverage, string][]) {
    keyPoints.push(`${coverage[key] ? "✓" : "·"} ${label}: ${coverage[key] ? "드러남" : "보강 필요"}`);
  }

  if (params.dimensions) {
    const sorted = Object.entries(params.dimensions).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const weak = sorted[sorted.length - 1];
    if (best && best[1] >= 0.6) {
      keyPoints.push(`강점 — ${dimensionLabel(best[0])} (${Math.round(best[1] * 100)}%)`);
    }
    if (weak && weak[1] < 0.55) {
      keyPoints.push(`보완 — ${dimensionLabel(weak[0])} (${Math.round(weak[1] * 100)}%)`);
    }
  }

  const quote = extractQuote(params.answer);
  const evidence = buildEvidenceFromAnswer({
    answer: params.answer,
    dimensions: params.dimensions,
    score: params.score,
  });

  let irtNote = "";
  if (params.isInterim) {
    irtNote =
      "방금 말씀하신 부분을 한 번 더 구체화하는 꼬리질문이 이어집니다(세션당 1회). 답하시면 난이도 조정이 확정됩니다.";
  } else if (params.chipType && params.level != null) {
    const lv = params.level;
    const next = params.nextLevel;
    if (params.chipType === "pass") {
      irtNote =
        next && next > lv
          ? `L${lv} 통과(♩) — 실력 추정치(θ) 상승. 다음 문항은 L${next} 난이도로 출제됩니다.`
          : `L${lv} 통과(♩) — 실력 추정치(θ) 상승. 더 높은 난이도 문항이 선택됩니다.`;
    } else if (params.chipType === "attempt") {
      irtNote = `L${lv} 부분 통과(♪) — 현재 수준 유지. 비슷한 난이도로 보완·확인 문항이 이어집니다.`;
    } else {
      irtNote = `L${lv} 미달(♭) — 다음 문항은 더 쉬운 난이도로 조정되어 맞춤 연습이 이어집니다.`;
    }
  }

  return {
    summary: params.briefFeedback.trim() || starCoachingNote(coverage),
    keyPoints,
    irtNote,
    quote,
    evidence,
    ...(params.dimensions
      ? {
          dimensions: params.dimensions,
          weakestDimension: findWeakestDimension(params.dimensions),
        }
      : {}),
  };
}

/** 역량별 STAR 리라이트 예시 — LLM 없이도 바로 쓸 수 있는 문장 뼈대. */
export function starRewriteTemplate(competencyLabel: string): string {
  return `"(상황) 당시 ${competencyLabel}와 관련해 ~한 상황이었고, (과제) 제가 맡은 과제는 ~였습니다. (행동) 저는 ~을 직접 수행했고, (결과) 그 결과 ~% 개선/증가라는 성과를 냈습니다."`;
}

// ── 전달력(Delivery) 분석 — transcript + 녹음 시간만으로 계산되는 결정론적 지표.
// 표정·음성 톤 등 비언어적 신호는 쓰지 않는다(특허 회피 원칙 유지).

const FILLER_WORDS =
  /(?:^|\s)(어+|음+|그+|저기요?|이제|약간|뭐랄까|그니까|막|그래가지고|인제)(?=\s|$|[,.!?])/g;

export interface DeliveryStats {
  /** 분당 어절 수 평균. 녹음 시간 데이터가 없는 답변은 집계에서 제외됨 */
  avgWpm: number | null;
  fillerCount: number;
  /** 100어절당 필러워드 개수 */
  fillerPer100Words: number | null;
  sampledResponses: number;
  note: string;
}

/**
 * 답변 목록에서 말하기 속도·필러워드 사용을 집계한다.
 * durationSec이 없는 답변(구버전 데이터)은 속도 계산에서 자동 제외된다.
 */
export function computeDeliveryStats(
  responses: Array<{ answer: string; durationSec?: number | null }>
): DeliveryStats {
  let totalWords = 0;
  let totalSec = 0;
  let sampledResponses = 0;
  let fillerCount = 0;
  let wordsForFillerRatio = 0;

  for (const r of responses) {
    const text = r.answer?.trim();
    if (!text) continue;

    const words = text.split(/\s+/).filter(Boolean);
    wordsForFillerRatio += words.length;
    fillerCount += (text.match(FILLER_WORDS) ?? []).length;

    if (r.durationSec && r.durationSec > 0) {
      totalWords += words.length;
      totalSec += r.durationSec;
      sampledResponses += 1;
    }
  }

  const avgWpm = totalSec > 0 ? Math.round((totalWords / totalSec) * 60) : null;
  const fillerPer100Words =
    wordsForFillerRatio > 0 ? Math.round((fillerCount / wordsForFillerRatio) * 100) : null;

  const notes: string[] = [];
  if (avgWpm !== null) {
    if (avgWpm < 70) notes.push("답변 속도가 다소 느린 편이에요. 핵심부터 먼저 말해보세요.");
    else if (avgWpm > 160) notes.push("답변이 빠른 편이에요. 중요한 부분은 잠깐 쉬어가며 강조해보세요.");
    else notes.push("답변 속도는 적정한 편입니다.");
  }
  if (fillerPer100Words !== null) {
    if (fillerPer100Words >= 8) notes.push('"어", "음", "그" 같은 습관어가 잦은 편이에요. 답변 전 1~2초 생각을 정리해보세요.');
    else if (fillerPer100Words > 0) notes.push("습관어 사용은 적은 편입니다.");
  }
  if (notes.length === 0) {
    notes.push("녹음 시간 데이터가 부족해 전달력 분석은 다음 세션부터 제공됩니다.");
  }

  return {
    avgWpm,
    fillerCount,
    fillerPer100Words,
    sampledResponses,
    note: notes.join(" "),
  };
}
