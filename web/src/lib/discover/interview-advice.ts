import { competencyLabel } from "@/lib/labels";
import {
  buildStrengthBridge,
  competencyForVia,
  jobInterviewTip,
} from "@/lib/discover/strength-competency-map";
import type { DiscoverInterviewAdvice, DiscoverStrengthItem } from "@/types/discover";
import type { JobRole } from "@prisma/client";

const INTERVIEW_TIPS: Record<string, string> = {
  COMMUNICATION: "답변 서두에 '누구에게, 무엇을, 왜 전달했는지'를 한 문장으로 밝히세요",
  PROBLEM_SOLVING: "문제의 원인 → 본인이 시도한 방법 2가지 → 결과 순으로 말하세요",
  JOB_FIT: "직무와 직접 연결된 기술·도구·성과를 경험 사례에 끼워 넣으세요",
  ORG_FIT: "팀·조직과 협력한 장면에서 본인의 역할 분담을 명확히 하세요",
  LEADERSHIP: "결정을 내린 이유와 팀을 설득·동기부여한 방법을 구체적으로 말하세요",
  GROWTH: "실패나 부족함을 인정한 뒤, 그다음에 무엇을 바꿨는지 보여주세요",
};

export function buildInterviewAdvice(
  strengths: DiscoverStrengthItem[],
  jobRole: JobRole
): DiscoverInterviewAdvice[] {
  const jobTip = jobInterviewTip(jobRole);

  return strengths.slice(0, 5).map((s) => {
    const competencyCode = competencyForVia(s.viaCode);
    const competencyLabelKo = competencyLabel(competencyCode);
    const tip = INTERVIEW_TIPS[competencyCode] ?? INTERVIEW_TIPS.GROWTH;

    return {
      viaCode: s.viaCode,
      viaLabelKo: s.viaLabelKo,
      competencyCode,
      competencyLabelKo,
      bridge: buildStrengthBridge(s.viaLabelKo, competencyCode),
      interviewTip: `${tip}. ${jobTip}`,
      starPrompt: `상황: (이 강점이 필요했던 ${competencyLabelKo} 관련 상황) → 과제: (맡은 목표) → 행동: ('${s.viaLabelKo}'을 발휘한 구체적 행동) → 결과: (수치·피드백)`,
      quote: s.quote,
    };
  });
}
