import { competencyLabel, dimensionLabel } from "@/lib/labels";
import type { RoundBrief } from "@/lib/interview/competency-round";
import { ANSWER_DIMENSION_KEYS } from "@/lib/interview/answer-dimensions";

/** 홈·차수·리포트에 공통으로 쓰는 한 줄 코칭 문장 */
export function buildDashboardNarrative(input: {
  sessionCount: number;
  assessedCount: number;
  weakestCode?: string | null;
  growthDelta?: number | null;
  latestDimensions?: Record<string, number> | null;
  recentRound?: RoundBrief | null;
}): string {
  if (input.sessionCount === 0) {
    return "첫 모의면접을 완료하면 역량·6축 지표가 이 화면에 쌓입니다.";
  }

  const parts: string[] = [];

  const improvementsText =
    typeof input.recentRound?.improvementsText === "string"
      ? input.recentRound.improvementsText
      : null;
  if (improvementsText) {
    parts.push(improvementsText.split(/[.!]/)[0]?.trim() ?? "");
  } else if (input.weakestCode) {
    parts.push(
      `${competencyLabel(input.weakestCode)} 역량을 한 번 더 연습하면 전체 균형이 좋아집니다`,
    );
  }

  if (input.growthDelta != null && input.sessionCount >= 2) {
    const dir = input.growthDelta >= 0 ? "상승" : "조정";
    parts.push(`최근 ${input.sessionCount}회 면접에서 θ가 ${dir} 추세입니다`);
  }

  if (input.latestDimensions) {
    const weakestDim = [...ANSWER_DIMENSION_KEYS]
      .map((k) => ({ k, v: input.latestDimensions![k] ?? 0 }))
      .sort((a, b) => a.v - b.v)[0];
    if (weakestDim && weakestDim.v < 0.65) {
      parts.push(`답변에서는 「${dimensionLabel(weakestDim.k)}」을 더 구체화해 보세요`);
    }
  }

  const lead = parts.filter(Boolean)[0];
  if (lead) return lead.endsWith(".") ? lead : `${lead}.`;

  return `${input.assessedCount}개 역량을 측정했습니다. 다음 면접에서 수치·본인 기여를 한 문장 더 넣어 보세요.`;
}

export function buildRoundNarrative(brief: RoundBrief): string {
  const competencies = Array.isArray(brief.competencies) ? brief.competencies : [];
  const strengthBullets = Array.isArray(brief.strengthBullets) ? brief.strengthBullets : [];
  const improvementBullets = Array.isArray(brief.improvementBullets)
    ? brief.improvementBullets
    : [];
  const comps =
    competencies.map((c) => competencyLabel(c)).join(" · ") || "이번";
  const strengthsText =
    typeof brief.strengthsText === "string" ? brief.strengthsText : "강점 패턴을 더 쌓아 보세요";
  const improvementsText =
    typeof brief.improvementsText === "string"
      ? brief.improvementsText
      : "수치·본인 행동을 더 분명히 말해 보세요";
  const strength =
    strengthBullets[0]?.replace(/^\[[^\]]+\]\s*/, "") ?? strengthsText;
  const improve =
    improvementBullets[0]?.replace(/^\[[^\]]+\]\s*/, "") ?? improvementsText;
  return `${comps} 차수를 마쳤습니다. 강점은 「${truncate(strength, 48)}」, 다음엔 「${truncate(improve, 48)}」에 집중해 보세요.`;
}

export function buildSessionReportNarrative(input: {
  competency?: string | null;
  summary?: string | null;
  improvements?: string[];
  avgScore?: number | null;
}): string {
  if (input.summary?.trim()) {
    const first = input.summary.split(/[.!]/)[0]?.trim();
    if (first && first.length >= 12) return first.endsWith(".") ? first : `${first}.`;
  }
  const comp = input.competency ? competencyLabel(input.competency) : "이번";
  const tip = input.improvements?.[0];
  if (tip) {
    return `${comp} 면접을 마쳤습니다. 다음 답변에서는 ${tip.replace(/\.$/, "")}을 의식해 보세요.`;
  }
  if (input.avgScore != null && input.avgScore > 0) {
    return `${comp} 면접 종합 ${input.avgScore}점 — 강점을 유지하며 성과 수치를 한 문장 더 보강하면 좋습니다.`;
  }
  return `${comp} 면접 피드백을 확인하고, 자소서에 적은 경험을 STAR 구조로 다시 말해 보세요.`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}
