# Cursor 작업 스펙 — 자소서 진위 검증 질문 (BEI 방식)

## 배경

"AI가 자소서를 몇 % 썼는지 판정"하는 기능은 하지 않기로 결정했다 — 상용 AI 탐지기(GPTZero,
Originality.ai 등)도 오탐률이 높고, 특히 첨삭을 많이 받는 한국 자소서 특성상 오탐 리스크가
크며, 확정적인 숫자(%)로 지원자를 판정하는 건 법적·평판 리스크가 크다. 실제 채용 현장에서
쓰는 진짜 기준은 "AI가 썼나"가 아니라 **"본인이 그 내용을 설명할 수 있나"**다.

이번 작업은 자소서에 적힌 구체적인 경험 주장 하나를 골라, 그 자리에서 BEI(행동사건면접)
방식으로 더 깊이 캐묻는 질문을 던지고, 답변이 자소서 원문보다 **더 구체적인 새 정보**(숫자·
이름·의사결정 등)를 제시하는지를 기준으로 "검증됨/부분검증/설명부족"을 판정한다. 점수(%)가
아니라 라벨 + 근거 문장으로만 보여준다.

## 기존 인프라 재사용 — JD 보너스 질문과 완전히 동일한 패턴을 그대로 따라간다

이미 있는 "JD 요구사항 기반 보너스 질문" 기능(`src/lib/interview/jd-bonus-question.ts`,
`InterviewSession.jdBonusEnabled`, `respond/route.ts`의 `tryOfferBonusQuestion`/
`handleBonusRespond`/`BONUS_QUESTION_ID`)이 구조적으로 이번 기능과 거의 동일하다 —
**IRT 은행에 없는 즉석 질문을, 세션 종료 시점에 한 번 끼워 넣고, 점수에는 반영하지 않는
패턴**. 이번 작업은 이 패턴을 "JD 요구사항" 대신 "자소서 experiences 문장"을 소스로 써서
그대로 복제하는 것이다. 새로운 아키텍처를 설계하지 말고 아래 대응표를 따라 그대로 미러링할 것.

| 기존 (JD 보너스) | 이번 작업 (자소서 검증) |
|---|---|
| `InterviewSession.jdBonusEnabled` | `InterviewSession.resumeClaimEnabled` (신규) |
| `TargetCompany.jdRequirements`(skills/keywords) | `Resume.parsedTags.experiences`(이미 있음, `src/lib/interview/resume-summary.ts`) |
| `src/lib/interview/jd-bonus-question.ts`의 `generateJdBonusQuestion()` | `src/lib/interview/resume-claim-question.ts`(신규)의 `generateResumeClaimQuestion()` |
| `BONUS_QUESTION_ID`(`session-limits.ts`) | `CLAIM_QUESTION_ID`(신규 상수, 같은 파일) |
| `stored.pendingBonusQuestion`/`bonusQuestionOffered` | `stored.pendingClaimQuestion`/`claimQuestionOffered`(둘 다 `irtState` Json 안 — DB 마이그레이션 불필요, `irt-state.ts`의 `StoredIrtState` 타입에만 필드 추가) |
| `tryOfferBonusQuestion()`(`respond/route.ts` 약 622~656번째 줄) | `tryOfferClaimQuestion()`(신규, 같은 파일에 나란히) |
| `handleBonusRespond()`(약 658~778번째 줄) | `handleClaimVerificationRespond()`(신규) |
| `ResponseRecord.isBonusQuestion`/`bonusQuestionText`/`bonusGroundedRequirement`/`bonusBriefFeedback` | `ResponseRecord.isClaimVerification`/`claimVerificationClaim`/`claimVerificationLabel`/`claimVerificationReasoning`(신규 컬럼) |

## 변경 파일

### 1. `prisma/schema.prisma` — 두 곳 수정 (마이그레이션 필요)

`InterviewSession` 모델에 `jdBonusEnabled` 옆에 추가:

```prisma
resumeClaimEnabled Boolean @default(false)
```

`ResponseRecord` 모델에 기존 보너스 필드들 옆에 추가:

```prisma
/** 자소서 진위 검증 질문이었는지 */
isClaimVerification      Boolean @default(false)
/** 검증 대상이 된 자소서 원문 문장(resume-summary.ts의 experiences 중 하나) */
claimVerificationClaim   String? @db.Text
/** "검증됨" | "부분검증" | "설명부족" — 절대 숫자/퍼센트 아님 */
claimVerificationLabel   String?
/** 판정 근거 1~2문장 (LLM 생성) */
claimVerificationReasoning String? @db.Text
```

`npx prisma migrate dev --name add_resume_claim_verification` 실행.

### 2. `src/lib/interview/session-limits.ts`

`BONUS_QUESTION_ID` 옆에:

```ts
/** 자소서 진위 검증 보너스 질문 — 은행에 없는 즉석 질문(IRT 미포함) */
export const CLAIM_QUESTION_ID = "__bonus_resume_claim__";
```

### 3. `src/lib/interview/resume-claim-question.ts` (신규)

`jd-bonus-question.ts`를 그대로 복제해서 소스만 바꾼다:

```ts
import { generateGeminiText } from "@/lib/gemini/client";

const CLAIM_SYSTEM = `당신은 한국 기업 면접관입니다.
지원자 자소서에 적힌 경험 문장 중 하나를 골라, 그 안의 구체적 주장(수치·역할·성과)을
더 깊이 캐묻는 BEI(행동사건면접) 방식 질문 한 문장을 만듭니다.

절대 규칙:
- 제공된 경험 문장 목록에 **실제로 있는** 내용만 인용하세요. 없는 내용을 지어내지 마세요.
- "정말이냐/거짓말 아니냐" 같은 추궁 톤이 아니라, 실무 면접관이 디테일을 확인할 때 쓰는
  중립적이고 존중하는 톤으로 쓰세요("~에 대해 조금 더 구체적으로 말씀해 주시겠어요" 류).
- 질문 한 문장 안에 인용한 경험 문장의 핵심 구절을 「」로 그대로 넣으세요.
- 본인이 직접 한 행동·의사결정·수치를 끌어내는 질문이어야 합니다(단순 재진술 요구 금지).
- 존댓말, 100자 이내 권장.
- JSON만: {"question":"...","groundedClaim":"인용한 경험 문장 원문 그대로"}`;

export async function generateResumeClaimQuestion(params: {
  experiences: string[];
  competency: string;
}): Promise<{ question: string; groundedClaim: string } | null> {
  const candidates = params.experiences.filter((e) => typeof e === "string" && e.trim().length >= 8);
  if (candidates.length === 0) return null;

  // 이미 수치(METRIC_PATTERN류)나 구체적 서술이 있는 문장을 우선 — 검증할 "구체적 주장"이
  // 있어야 이 기능이 의미가 있다. resume-summary.ts의 heuristicSummary에 있는
  // METRIC_PATTERN 정규식을 재사용해서 우선순위를 매길 것(수치 포함 문장 우선, 없으면 첫 문장).

  // ... (jd-bonus-question.ts의 generateJdBonusQuestion과 동일한 구조로 Gemini 호출,
  //      grounding 검증 로직도 동일하게: groundedClaim이 candidates 중 하나와 충분히
  //      겹치는지 확인 후 아니면 null 반환)
}
```

**중요**: `jd-bonus-question.ts`의 grounding 검증 함수(`isGroundedInJdTerms` 상당)도 그대로
가져와서 `groundedClaim`이 실제 `experiences` 배열의 문장과 충분히 겹치는지 검증할 것 —
안 그러면 환각으로 없는 경험을 지어내 질문할 위험이 있다.

### 4. `src/lib/interview/claim-verification.ts` (신규)

이게 이번 작업의 핵심 — 채점이 아니라 "판정"이다. `correctAndEvaluateAnswer`(STAR/rubricScore
채점)와는 완전히 다른 함수로 분리할 것 — 이 답변은 IRT theta에 절대 반영되지 않는다(보너스
질문과 동일한 취급).

```ts
export type ClaimVerificationLabel = "검증됨" | "부분검증" | "설명부족";

export interface ClaimVerificationResult {
  label: ClaimVerificationLabel;
  reasoning: string;       // 1~2문장, 왜 이 라벨인지
  newDetails: string[];    // 원문 claim에는 없던, 답변에서 새로 나온 구체적 정보(선택)
}

const VERIFICATION_SYSTEM = `당신은 채용 면접 코치입니다. 아래 세 가지를 받습니다:
1. 자소서 원문 문장(주장)
2. 그 주장을 더 캐묻기 위해 던진 질문
3. 지원자의 답변

당신의 역할은 "AI가 썼는지 판정"하는 게 아니라, **답변이 주장을 얼마나 구체적으로
뒷받침하는지**만 평가하는 것입니다.

판정 기준:
- "검증됨": 답변에 원문 주장에는 없던 구체적 정보(수치·구체적 행동·의사결정 과정·인물/역할)가
  자연스럽게 추가되고, 주장과 논리적으로 모순되지 않음.
- "부분검증": 어느 정도 구체화는 되었으나 새로운 핵심 정보가 부족하거나 다소 일반적인
  수준에 머무름.
- "설명부족": 질문에 대한 답이 원문 재진술 수준이거나, 구체적 근거 없이 넘어가거나,
  주장과 모순되는 내용이 있음.

절대 "AI가 썼다/거짓말이다" 같은 단정적 표현을 쓰지 마세요 — 이 도구는 진위 판정이 아니라
설명 구체성만 평가합니다. reasoning은 지원자에게 그대로 보여줄 수 있는 존중하는 톤으로
1~2문장 작성하세요.

JSON만: {"label":"검증됨|부분검증|설명부족","reasoning":"...","newDetails":["..."]}`;

export async function evaluateClaimVerification(params: {
  claim: string;
  question: string;
  answer: string;
}): Promise<ClaimVerificationResult> {
  // Gemini 호출 — correctAndEvaluateAnswer와 동일한 방식(generateGeminiText 또는
  // 같은 클라이언트 함수 재사용), API 키 없을 때 폴백은 답변 길이/구체성 휴리스틱으로
  // "부분검증" 기본값 반환(mockCompetencyFeedback류 폴백 패턴 참고).
}
```

### 5. `src/lib/interview/start-session.ts`

`jdBonusEnabled` 처리 로직(약 54~55, 117~119, 364~366번째 줄) 옆에 동일한 패턴으로 추가:

```ts
/** 자소서 진위 검증 보너스 질문 — 자소서 experiences가 있을 때만, 기본 OFF */
resumeClaimEnabled?: boolean;

// ... body에서 구조분해 추가 ...

resumeClaimEnabled: resumeClaimEnabled === true && (parsedResumeSummary?.experiences?.length ?? 0) > 0,
```

`parsedResumeSummary`는 이미 이 파일에서 이력서 파싱 결과를 다루는 부분이 있을 것 —
`parseResumeSummary(resume.parsedTags)` 호출부(`build-question.ts`에 있는 함수, 이미
다른 곳에서 쓰임)를 찾아 재사용할 것.

### 6. `src/app/interview/setup/SetupForm.tsx`

`jdBonusEnabled` 체크박스(약 976~978번째 줄, state는 108번째 줄) 옆에 동일한 패턴으로
"자소서 검증 질문 받기" 체크박스 추가. **자소서가 업로드된 경우에만 노출**(JD 체크박스가
JD 텍스트/URL 있을 때만 노출되는 것과 동일한 조건부 렌더링 패턴). 라벨 문구는 사용자에게
불안감을 주지 않게: "제 경험을 더 구체적으로 확인하는 질문 받기(선택)" 정도의 톤 권장 —
"검증"이라는 단어를 사용자 대면 UI에는 노출하지 않는 걸 권장(내부 코드/관리자 화면에서만
"검증" 용어 사용, 응시자에게는 "조금 더 자세히 물어보는 질문" 정도로 순화).

### 7. `src/app/api/interview/respond/route.ts` — 핵심 로직

**(a)** `questionId === BONUS_QUESTION_ID` 분기(약 147번째 줄) 옆에:

```ts
if (questionId === CLAIM_QUESTION_ID) {
  return handleClaimVerificationRespond({ session, stored, transcript, durationSec, userId });
}
```

**(b)** `tryOfferBonusQuestion()` 호출부(약 524~530번째 줄, `irtResult.should_terminate`
블록 안)에 나란히 `tryOfferClaimQuestion()` 호출 추가. **두 보너스 질문(JD/자소서 검증)이
동시에 켜져 있을 때 순서**: 먼저 JD 보너스를 시도하고, 그게 없거나 이미 제공됐으면 자소서
검증을 시도하는 식으로 **한 세션 종료 시점엔 최대 1개만** 끼워 넣는 걸 권장(둘 다 넣으면
세션이 길어져 이탈 위험 — 다만 이건 Cursor 재량, 두 개 다 순차로 넣어도 로직상 문제는 없음).

**(c)** `tryOfferBonusQuestion()`(622~656번째 줄) 바로 아래에 `tryOfferClaimQuestion()`을
동일 구조로 추가:

```ts
async function tryOfferClaimQuestion(params: {
  session: SessionWithRelations;
  stored: StoredIrtState;
  focusCompetency: string;
  competencyStates: Record<string, CompetencyState>;
}): Promise<InterviewQuestion | null> {
  if (!params.session.resumeClaimEnabled || params.stored.claimQuestionOffered) return null;

  const resumeSummary = parseResumeSummary(params.session.resume?.parsedTags);
  if (!resumeSummary || resumeSummary.experiences.length === 0) return null;

  const claim =
    params.stored.pendingClaimQuestion ??
    (await generateResumeClaimQuestion({
      experiences: resumeSummary.experiences,
      competency: params.focusCompetency,
    }));

  if (!claim) return null;

  const nextState: StoredIrtState = {
    ...params.stored,
    competencies: params.competencyStates,
    pendingClaimQuestion: claim,
    nextItemId: CLAIM_QUESTION_ID,
    claimQuestionOffered: true,
  };

  await prisma.interviewSession.update({
    where: { id: params.session.id },
    data: { irtState: serializeIrtState(nextState) },
  });

  return buildClaimInterviewQuestion(claim, params.focusCompetency);
}

function buildClaimInterviewQuestion(
  claim: { question: string; groundedClaim: string },
  competency: string
): InterviewQuestion {
  return {
    id: CLAIM_QUESTION_ID,
    externalId: CLAIM_QUESTION_ID,
    competency,
    level: 0,
    text: claim.question,
    personalizedText: claim.question,
    rationale: `자소서에 적힌 내용을 조금 더 구체적으로 확인하는 참고용 질문입니다. 점수에는 반영되지 않습니다.`,
    isBonusQuestion: true, // 기존 InterviewQuestion 타입의 필드를 재사용해도 무방 — IRT 미반영 표시 목적은 동일
    resumePersonalized: true,
  };
}
```

**(d)** `handleBonusRespond()`(658~778번째 줄)를 참고해 `handleClaimVerificationRespond()`
작성. 가장 큰 차이: `correctAndEvaluateAnswer()`(rubric 채점) 대신 `evaluateClaimVerification()`
호출. `responseRecord.create`에 `rubricScore`는 중립값(예: 보너스와 동일하게 IRT에 안 쓰이니
0.5 고정 또는 기존 보너스 필드 관례 확인 후 동일하게 처리) + 새 필드들 채움:

```ts
await prisma.responseRecord.create({
  data: {
    sessionId: session.id,
    questionId: null,
    isClaimVerification: true,
    claimVerificationClaim: pending.groundedClaim,
    claimVerificationLabel: result.label,
    claimVerificationReasoning: result.reasoning,
    competency: focusCompetency,
    level: 0,
    transcript,
    correctedTranscript: correctedAnswer !== transcript ? correctedAnswer : null,
    rubricScore: 0.5, // IRT 미반영 — handleBonusRespond의 기존 관례 확인 후 동일하게 맞출 것
    durationSec: finalDurationSec,
  },
});
```

응답 JSON의 `answerFeedback`에는 `rubricScore`나 점수 대신 `{ label: result.label, reasoning:
result.reasoning }`를 내려줄 것 — 프론트에서 이걸 점수 UI가 아니라 별도 카드로 렌더링해야
하므로 클라이언트 쪽도 확인 필요(`InterviewSession.tsx`가 `answerFeedback` 구조를 어떻게
렌더링하는지 먼저 읽고, 기존 점수 배지 UI 재사용 금지 — 라벨 전용 카드 새로 만들 것).

### 8. `src/app/interview/[sessionId]/report/page.tsx`

`isClaimVerification: true`인 `ResponseRecord`를 조회해 리포트에 "자소서 확인" 섹션 추가.
표시 내용: 검증 질문 · 라벨(색상: 검증됨=녹색 계열, 부분검증=중립, 설명부족=amber — 절대
red/경고색 금지, 이건 "탈락 사유"가 아니라 "참고용 코칭"이라는 톤을 유지해야 함) · reasoning
1~2문장. **퍼센트나 점수 숫자는 어디에도 노출하지 않는다.**

## 절대 하지 말아야 할 것 (반복 강조)

- "AI 작성 비율 OO%" 같은 숫자/퍼센트 표시 — 어디에도 넣지 않는다.
- "거짓말", "표절", "AI가 썼음" 같은 단정적 문구 — LLM 프롬프트에도, UI 문구에도 금지.
- 이 질문의 결과가 IRT theta·역량 점수·합격/불합격 판정에 반영되는 것처럼 보이는 UI —
  기존 보너스 질문과 동일하게 "참고용, 점수 미반영"임을 항상 문구로 명시.

## 인수 조건

- [ ] `resumeClaimEnabled` 체크(자소서 업로드된 세션)로 시작한 세션이, 마지막 문항 종료
      시점에 자소서 경험 문장을 인용한 질문을 한 번만 받는다.
- [ ] 답변 제출 후 IRT theta/competency 점수가 이 답변으로 인해 변하지 않는다(보너스
      질문과 동일하게 IRT 계산에서 제외됨을 확인).
- [ ] 리포트 페이지에 "검증됨/부분검증/설명부족" 라벨 + 근거 문장이 보이고, 숫자/퍼센트는
      어디에도 없다.
- [ ] `resumeClaimEnabled`가 꺼져 있거나 자소서가 없는 세션은 기존과 동일하게 동작(회귀 없음).
- [ ] JD 보너스와 자소서 검증이 동시에 켜져 있어도 세션이 죽지 않고, 최소 하나는 정상 제공됨.
- [ ] `npx prisma migrate dev`, `npx tsc --noEmit`, `npm run build` 통과.
