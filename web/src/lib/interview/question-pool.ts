/**
 * 역량별 문항 풀을 IRT 엔진에 넘기기 전에 두 가지를 적용한다.
 *
 * 1) 반복 출제 방지 — 이 사용자가 이미 답한 문항은 기본적으로 제외한다. 단, 예전에
 *    잘 못 답했던 문항(점수 낮음)은 몇 세션 지난 뒤 다시 나올 수 있게 한다(복습 효과).
 *    이렇게 하면 매번 같은 질문만 반복되는 문제를 막으면서도, 취약했던 문항은 완전히
 *    사라지지 않고 다시 확인할 기회를 준다.
 * 2) 자소서 요약·직무·JD 연관도 우선순위 — 같은 난이도(level) 안에 후보가 여럿이면
 *    자소서 요약·직무·(JD 매핑으로 뽑힌) 중점 역량 키워드와 더 관련 있어 보이는 문항을
 *    남기고 나머지를 정리한다. IRT 엔진의 통계적 적응 로직(2PL 정보량 기반 선택) 자체는
 *    건드리지 않는다 — 난이도별로 후보를 좁혀서 "이왕이면 더 관련 있는 문항"이 남게만
 *    한다. 난이도 폭 자체는 그대로 유지해 적응형 검사가 깨지지 않게 한다.
 */

import { prisma } from "@/lib/prisma";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import { jobRoleLabel } from "@/lib/labels";

export interface PoolQuestion {
  id: string;
  externalId: string;
  level: number;
  difficulty: number;
  discrimination: number;
  template: string;
  competency: { code: string };
}

const MIN_SESSIONS_BEFORE_REPEAT = 3;
const POOR_SCORE_THRESHOLD = 0.5;
/** 같은 난이도(level) 안에서 연관도로 추릴 때 최소 이만큼은 남겨서 IRT가 고를 여지를 준다 */
const MIN_CANDIDATES_PER_LEVEL = 2;

export async function filterAndRankQuestionPool(params: {
  userId: string;
  competency: string;
  questions: PoolQuestion[];
  resumeSummary?: ResumeSummary | null;
  jobRole?: string;
  /** JD/인재상 매핑에서 뽑힌 중점 평가 역량 라벨(TargetCompany.interviewStyle.focus) */
  interviewStyleFocus?: string[];
}): Promise<PoolQuestion[]> {
  const { userId, competency, questions } = params;

  if (questions.length === 0) return questions;

  const eligible = await excludeRecentlyAskedQuestions(userId, competency, questions);
  const pool = eligible.length >= 2 ? eligible : questions;

  return rankByRelevance(pool, {
    resumeSummary: params.resumeSummary,
    jobRole: params.jobRole,
    interviewStyleFocus: params.interviewStyleFocus,
  });
}

async function excludeRecentlyAskedQuestions(
  userId: string,
  competency: string,
  questions: PoolQuestion[]
): Promise<PoolQuestion[]> {
  const [history, pastSessionCount] = await Promise.all([
    prisma.responseRecord.findMany({
      where: { session: { userId }, competency },
      select: {
        questionId: true,
        rubricScore: true,
        session: { select: { sessionNumber: true } },
      },
      orderBy: { session: { sessionNumber: "desc" } },
    }),
    prisma.interviewSession.count({ where: { userId } }),
  ]);

  // questionId별 "가장 최근 시도"만 남긴다(history는 session.sessionNumber 내림차순 정렬됨)
  const lastAttempt = new Map<string, { score: number; sessionNumber: number }>();
  for (const r of history) {
    if (!lastAttempt.has(r.questionId)) {
      lastAttempt.set(r.questionId, {
        score: r.rubricScore,
        sessionNumber: r.session.sessionNumber,
      });
    }
  }

  const nextSessionNumber = pastSessionCount + 1;

  return questions.filter((q) => {
    const prev = lastAttempt.get(q.id);
    if (!prev) return true; // 한 번도 안 물어본 문항
    const sessionsSince = nextSessionNumber - prev.sessionNumber;
    return prev.score < POOR_SCORE_THRESHOLD && sessionsSince >= MIN_SESSIONS_BEFORE_REPEAT;
  });
}

function buildRelevanceCorpus(params: {
  resumeSummary?: ResumeSummary | null;
  jobRole?: string;
  interviewStyleFocus?: string[];
}): string[] {
  const parts: string[] = [];
  if (params.resumeSummary) {
    parts.push(...params.resumeSummary.skills, ...params.resumeSummary.keywords);
  }
  if (params.jobRole) parts.push(jobRoleLabel(params.jobRole));
  if (params.interviewStyleFocus) parts.push(...params.interviewStyleFocus);

  return [
    ...new Set(
      parts
        .flatMap((p) => p.split(/[\s,·/|]+/))
        .map((t) => t.trim())
        .filter((t) => t.length >= 2)
    ),
  ];
}

function rankByRelevance(
  questions: PoolQuestion[],
  ctx: {
    resumeSummary?: ResumeSummary | null;
    jobRole?: string;
    interviewStyleFocus?: string[];
  }
): PoolQuestion[] {
  const corpus = buildRelevanceCorpus(ctx);
  if (corpus.length === 0) return questions; // 연관도 신호가 없으면 그대로(난이도 다양성 유지)

  const score = (q: PoolQuestion) =>
    corpus.reduce((acc, tok) => acc + (q.template.includes(tok) ? 1 : 0), 0);

  const byLevel = new Map<number, PoolQuestion[]>();
  for (const q of questions) {
    const arr = byLevel.get(q.level) ?? [];
    arr.push(q);
    byLevel.set(q.level, arr);
  }

  const result: PoolQuestion[] = [];
  for (const group of byLevel.values()) {
    if (group.length <= MIN_CANDIDATES_PER_LEVEL) {
      result.push(...group);
      continue;
    }
    const ranked = [...group].sort((a, b) => score(b) - score(a));
    // 연관도 신호가 전혀 없는(0점) 문항까지 억지로 자르진 않는다 — 상위 연관 문항 +
    // 최소 후보 수만큼만 남기되, 동점(0점 포함)이 많으면 자연스럽게 더 남을 수 있음
    const topScore = score(ranked[0]);
    if (topScore === 0) {
      result.push(...group);
      continue;
    }
    result.push(...ranked.slice(0, Math.max(MIN_CANDIDATES_PER_LEVEL, ranked.filter((q) => score(q) > 0).length)));
  }

  return result;
}
