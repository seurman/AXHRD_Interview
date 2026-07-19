/**
 * Gemini 모델 티어 라우팅.
 *
 * 2026 프로덕션 관행 (Zylos / Gemini Lab / enterprise routing):
 * - Lite(예산)   ~60–70%: 분류·파싱·고빈도·저위험
 * - Standard(중) ~20–30%: 구조화 요약·JD·중간 추론
 * - Pro(고)      ~5–15% 요청 수, 그러나 면접 제품에서는
 *               *자소서 기반 질문·피드백·첨삭*이 체감 품질의 핵심이라
 *               해당 유저 플로우만 Pro를 고정 (호출 수는 적어도 영향이 큼)
 *
 * 유사 HR/ATS 라우팅 예:
 * - 문항 생성·피드백 = frontier/Pro
 * - 매칭·분류·파싱 = Lite
 * - 요약·대화형 중간 = Standard
 *
 * 예상 세션당 비율(대략):
 * - Lite: interpret 휴리스틱 외 테마·STT 교정·OCR 보조, 답변 채점(evaluate_answer, N회 — 최고빈도라 비용 우선)
 * - Standard: 자소서 enrich, JD 매핑
 * - Pro: 첨삭 1회 + 문항 개인화 N회 + claim 검증/트리플 피드백/세션 리포트
 */

export type GeminiModelTier = "lite" | "standard" | "pro";

/** 작업별 권장 티어 — 호출부에서 넘긴다. */
export const GEMINI_TASK_TIER = {
  /** 자소서 첨삭 서술 */
  resume_review: "pro",
  /** 자소서·claim 기반 면접 문항 개인화 */
  personalize_question: "pro",
  /** claim 검증 문항 */
  claim_question: "pro",
  /** STAR/루브릭 채점·짧은 피드백 — 세션당 최대 18회 호출되는 최고빈도 콜.
   *  채점 기준이 정형화돼 있어 Lite로도 품질 유지 가능 — 비용 절감 우선 (2026-07-15) */
  evaluate_answer: "lite",
  /** 세 렌즈 피드백 */
  triple_feedback: "pro",
  /** 자소서↔답변 claim 검증 */
  claim_verification: "pro",
  /** 세션 종료 리포트 (구 DeepSeek) */
  session_report: "pro",
  /** 역량별 개별 피드백 (구 DeepSeek) */
  competency_feedback: "pro",
  /** 증거형 평가 리포트 (하위역량·+/- 행동·평정 근거) */
  evidence_report: "pro",
  /** 역량평가 역할연기 — 상대역 페르소나 대화 턴 (채점 아님, 캐릭터 연기 전용) */
  role_play_persona: "standard",
  /** 업로드 과제 문서 → 역할연기/서류함 구조화 초안 (JSON 안정성·타임아웃 우선) */
  assessment_scenario_draft: "standard",
  /** 자소서 LLM enrich */
  resume_enrich: "standard",
  /** JD → 스타일/키워드 */
  jd_map: "standard",
  /** JD 보너스 문항 */
  jd_bonus_question: "standard",
  /** STT 교정 */
  transcript_correct: "lite",
  /** 진단 테마 클러스터링 */
  theme_mining: "lite",
} as const satisfies Record<string, GeminiModelTier>;

export type GeminiTask = keyof typeof GEMINI_TASK_TIER;

function uniq(models: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of models) {
    const t = m?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 티어별 모델 체인 (환경변수로 덮어쓰기 가능). */
export function modelChainForTier(tier: GeminiModelTier): string[] {
  switch (tier) {
    case "pro":
      return uniq([
        process.env.GEMINI_PRO_MODEL,
        process.env.GEMINI_RESUME_REVIEW_MODEL,
        "gemini-pro-latest",
        "gemini-3.1-pro-preview",
        "gemini-2.5-pro",
        // Pro 전부 실패 시 standard로 내려감
        process.env.GEMINI_STANDARD_MODEL,
        "gemini-flash-latest",
        "gemini-3.5-flash",
        process.env.GEMINI_LITE_MODEL,
        "gemini-flash-lite-latest",
      ]);
    case "standard":
      return uniq([
        process.env.GEMINI_STANDARD_MODEL,
        "gemini-flash-latest",
        "gemini-3.5-flash",
        process.env.GEMINI_LITE_MODEL,
        "gemini-flash-lite-latest",
      ]);
    case "lite":
    default:
      return uniq([
        process.env.GEMINI_LITE_MODEL,
        process.env.GEMINI_TEXT_MODEL,
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ]);
  }
}

export function defaultTimeoutForTier(tier: GeminiModelTier): number {
  if (tier === "pro") return 55_000;
  if (tier === "standard") return 20_000;
  return 8_000;
}

export function defaultMaxTokensForTier(tier: GeminiModelTier): number {
  if (tier === "pro") return 4096;
  if (tier === "standard") return 1024;
  return 512;
}

/** 관측용: 이 세션에서 Pro를 쓰는 작업 목록(문서·대시보드용). */
export function listProTasks(): GeminiTask[] {
  return (Object.keys(GEMINI_TASK_TIER) as GeminiTask[]).filter(
    (k) => GEMINI_TASK_TIER[k] === "pro"
  );
}
