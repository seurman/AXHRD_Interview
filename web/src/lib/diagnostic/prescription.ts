import type { DriverImportanceSummary, LpaResult } from "@/lib/diagnostic/arc-scoring";

export type PrescriptionItem = {
  id: string;
  /** 낮을수록 급함(1이 최우선) */
  priority: number;
  title: string;
  rationale: string;
  action: string;
  source: "driver" | "team_driver" | "opportunity" | "oaiPattern" | "reliability" | "lpa";
};

/** 드라이버 코드 → 처방 제목·액션. 통합설문지 260626 — 9개 OHI 드라이버 영역 */
const DRIVER_ACTIONS: Record<string, { title: string; action: string }> = {
  SL: { title: "경영진 리더십 신뢰회복", action: "스킵레벨 미팅 정례화 + 익명 질의응답 채널 개설" },
  SV: { title: "1차 관리자 코칭 역량 강화", action: "관리자 대상 1:1 가이드라인 교육, 정기 코칭 스킬 워크숍" },
  PS: { title: "심리적 안전 구축", action: "실수 공유 회고(post-mortem) 프로세스 도입 — 비난 없는 문화 캠페인" },
  EM: { title: "의사결정 권한 위임", action: "결재 단계 축소, 팀 단위 자율 예산·일정 권한 시범 부여" },
  PM: { title: "성과-보상 연결 명확화", action: "평가 기준 공개 워크숍 + 보상 체계 투명성 개선" },
  LG: { title: "성장 기회 확대", action: "사내 멘토링 프로그램 + 역량개발 예산 신설" },
  CI: { title: "포용 문화 유지·강화", action: "현재 강점 — 우수 사례를 다른 팀에 전파하는 내부 벤치마킹 세션" },
  WE: { title: "업무환경 개선", action: "워크로드 실태 점검 + 근무 유연성(하이브리드) 옵션 검토" },
  C: { title: "정보 공유 체계 개선", action: "부서간 정기 싱크 미팅 신설 + 사내 위키·공지 채널 정비" },
};

/**
 * 결정론적 처방 규칙 엔진 — 계산된 통계 결과(IPA·HLM-lite·ICC·LPA·ORI/OAI 판정)를 조합해
 * 우선순위가 매겨진 처방 목록을 만든다. LLM을 쓰지 않는다 — 엔터프라이즈 HR 리포트에서
 * 재현 가능하고 감사 가능한(auditable) 결과가 더 중요하다고 판단해 규칙 기반으로 설계.
 */
export function buildPrescriptions(input: {
  driverImportance?: DriverImportanceSummary;
  teamLevelDriverImportance?: DriverImportanceSummary;
  opportunity?: { band: string; prescription: string } | null;
  oaiPattern?: { pattern: string; message: string } | null;
  teamReliability?: { icc: number | null; interpretation: string | null } | null;
  lpa?: LpaResult;
}): PrescriptionItem[] {
  const items: PrescriptionItem[] = [];
  let priority = 1;

  if (input.driverImportance && !input.driverImportance.insufficientData) {
    const focus = [...input.driverImportance.entries]
      .filter((e) => e.priority === "FOCUS")
      .sort((a, b) => (b.beta ?? 0) - (a.beta ?? 0));
    for (const e of focus) {
      const meta = DRIVER_ACTIONS[e.code];
      if (!meta) continue;
      items.push({
        id: `driver-${e.code}`,
        priority: priority++,
        title: meta.title,
        rationale: `구성원 개인 수준에서 활력·헌신·몰두(SE)에 미치는 영향력이 크고(β=${e.beta?.toFixed(2)}), 현재 수준은 낮습니다.`,
        action: meta.action,
        source: "driver",
      });
    }
  }

  if (input.teamLevelDriverImportance && !input.teamLevelDriverImportance.insufficientData) {
    const focus = input.teamLevelDriverImportance.entries.filter((e) => e.priority === "FOCUS");
    for (const e of focus) {
      const meta = DRIVER_ACTIONS[e.code];
      if (!meta) continue;
      items.push({
        id: `team-driver-${e.code}`,
        priority: priority++,
        title: `${meta.title} (팀 단위)`,
        rationale: `팀간 SE 차이를 설명하는 영향력이 크고(β=${e.beta?.toFixed(2)}), 팀 평균 수준이 낮습니다 — 조직 전체가 아니라 특정 팀에 집중된 문제일 가능성이 있습니다.`,
        action: meta.action,
        source: "team_driver",
      });
    }
  }

  if (input.opportunity) {
    items.push({
      id: "opportunity",
      priority: priority++,
      title: `AX 기회 — ${input.opportunity.band}`,
      rationale: "AI 활용 의지(AXA)와 두려움(AXG)의 격차를 기반으로 한 처방입니다.",
      action: input.opportunity.prescription,
      source: "opportunity",
    });
  }

  if (input.oaiPattern) {
    items.push({
      id: "oai-pattern",
      priority: priority++,
      title: `조직 패턴 — ${input.oaiPattern.pattern}`,
      rationale: "4축(OHI/ORI/OVI/OAI) 조합에서 나타나는 패턴 진단입니다.",
      action: input.oaiPattern.message,
      source: "oaiPattern",
    });
  }

  if (input.teamReliability?.icc != null && input.teamReliability.icc >= 0.15) {
    items.push({
      id: "reliability",
      priority: priority++,
      title: "팀별 맞춤 개입 필요",
      rationale: `ICC=${input.teamReliability.icc.toFixed(2)} — 팀마다 편차가 커서 조직 평균 하나로만 판단하면 오진 위험이 있습니다.`,
      action: "팀별 리포트를 따로 확인하고, 편차가 큰 팀부터 개별 워크숍을 우선 진행하세요.",
      source: "reliability",
    });
  }

  if (input.lpa && !input.lpa.insufficientData) {
    const risky = input.lpa.profiles.filter(
      (p) => p.label === "번아웃위험형" || p.label === "이탈예고형",
    );
    const riskyShare = risky.reduce((s, p) => s + p.proportion, 0);
    if (riskyShare >= 0.25) {
      items.push({
        id: "lpa-risk",
        priority: priority++,
        title: "이탈·번아웃 위험군 비중 높음",
        rationale: `구성원 유형(LPA) 분석 결과 번아웃위험형·이탈예고형 합산 비중이 ${Math.round(
          riskyShare * 100,
        )}%입니다.`,
        action: "고위험군 대상 1:1 스테이 인터뷰(잔류 면담)를 우선 실시하고 워크로드·보상을 재점검하세요.",
        source: "lpa",
      });
    }
  }

  return items;
}
