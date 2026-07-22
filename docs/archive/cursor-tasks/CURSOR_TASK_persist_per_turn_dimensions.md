# Cursor 작업 스펙 — 매턴 AnswerDimensions 저장 + 역량 리포트에서 재사용

## 배경 / 실제로 확인된 문제

답변마다 Gemini가 `correctAndEvaluateAnswer()`(`src/lib/gemini/evaluate.ts`)를 통해 4축 점수
`AnswerDimensions`(`starStructure`/`questionIntent`/`logic`/`delivery`, 각 0.0~1.0,
`src/lib/interview/answer-dimensions.ts`)를 매턴 계산한다. 이 값(`rubric.dimensions`)은 현재:

- `ResponseRecord`에 저장되지 않는다 — **Prisma 스키마에 컬럼 자체가 없다.**
- 답변 직후 화면(`buildAnswerKeyPointFeedback`)에 잠깐 쓰이고 응답이 끝나면 사라진다.
- 역량 하나가 끝나면(`finalizeCompetencySession`, `src/app/api/interview/respond/route.ts`)
  `generateCompetencyFeedback()`(`src/lib/claude/competency-feedback.ts`, DeepSeek 호출)가
  **완전히 별도로, 원문 답변만 다시 보고** 0~100 스케일 `dimensions`를 처음부터 다시 추정해서
  `CompetencyFeedback.dimensions`에 저장한다.

즉 같은 정보를 두 번(Gemini 매턴 + DeepSeek 세션 종료 시) 돈 내고 계산하면서, 더 정밀한
매턴 신호(질문 하나하나에 대한 개별 평가)는 그냥 버리고 있다. 이번 작업은 매턴 값을
저장해서 재사용하는 것으로 끝난다 — **새 LLM 호출을 추가하지 않는다.**

## 목표

1. `ResponseRecord`에 `dimensions` 저장.
2. 역량 완료 리포트(`CompetencyFeedback.dimensions`)는 DeepSeek이 새로 추정한 값 대신,
   **그 역량에서 실제로 쌓인 매턴 `dimensions`의 평균**을 우선 사용하도록 변경.
3. DeepSeek 호출 자체나 prompt는 건드리지 않는다(다른 필드 — summary/strengths/highlights
   등 — 는 여전히 DeepSeek이 만든다). dimensions 숫자만 실측값으로 덮어씌운다.

## 변경 파일

### 1. `prisma/schema.prisma` — `ResponseRecord`에 컬럼 추가

`transcript`/`correctedTranscript` 근처에 추가:

```prisma
model ResponseRecord {
  ...
  transcript  String           @db.Text
  correctedTranscript String?  @db.Text
  dimensions  Json?            // AnswerDimensions 스냅샷(0.0~1.0) — correctAndEvaluateAnswer 결과 그대로
  audioUrl    String?
  ...
}
```

작업 후 로컬에서 마이그레이션 실행(이 필드는 nullable이라 기존 row는 전부 `null`로 채워짐,
데이터 손실 없음):

```
npx prisma migrate dev --name add_response_record_dimensions
```

### 2. `src/app/api/interview/respond/route.ts` — 저장 시점 2곳에 `dimensions` 추가

이미 계산돼 있는 `rubric.dimensions`를 그대로 넘기기만 하면 된다.

**(a) 일반 답변 저장** (`prisma.responseRecord.create`, 현재 약 423번째 줄, `Promise.all([...])` 안):

```ts
prisma.responseRecord.create({
  data: {
    sessionId,
    questionId,
    competency: question.competency.code,
    level: question.level,
    transcript: finalTranscript,
    correctedTranscript: finalCorrectedTranscript,
    dimensions: rubric.dimensions as unknown as Prisma.InputJsonValue,   // ← 추가
    rubricScore: rubric.score,
    durationSec: finalDurationSec,
    ...
  },
}),
```

주의: 이 블록은 꼬리질문(follow-up) 분기와 일반 분기가 합쳐진 지점이라 `rubric`이
`combined`(꼬리질문 있었으면 원답변+꼬리질문 종합 평가) 결과를 가리키는 변수로 리네임돼
있을 수 있다 — 실제 변수명은 해당 시점 직전 코드(약 220~260번째 줄, `combined` 변수)를
반드시 확인하고 그 변수의 `.dimensions`를 쓸 것. 파일 안에서 `rubric.score`가 이미
`rubricScore:` 필드에 쓰이고 있으니 그 옆에 있는 변수를 그대로 따라가면 된다.

**(b) 보너스 질문 답변 저장** (`prisma.responseRecord.create`, 현재 약 682번째 줄):

```ts
await prisma.responseRecord.create({
  data: {
    sessionId: session.id,
    questionId: null,
    isBonusQuestion: true,
    ...
    dimensions: rubric.dimensions as unknown as Prisma.InputJsonValue,   // ← 추가
    rubricScore: rubric.score,
    durationSec: finalDurationSec,
  },
});
```

`Prisma` 타입은 파일 상단에 이미 `import type { Prisma } from "@prisma/client";`로
들어와 있음(다른 Json 필드 캐스팅에 이미 쓰이는 패턴 그대로 따라가면 됨).

### 3. `src/lib/interview/report-response.ts` — 매핑 함수에 dimensions 통과시키기

```ts
import {
  normalizeAnswerDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";

export type ReportResponseRow = {
  question: { template: string } | null;
  isBonusQuestion?: boolean;
  bonusQuestionText?: string | null;
  competency: string;
  transcript: string;
  correctedTranscript: string | null;
  dimensions?: unknown;              // ← 추가 (Prisma Json 필드, null 가능)
  rubricScore: number;
  followUpQuestion: string | null;
  followUpTranscript: string | null;
  followUpCorrectedTranscript: string | null;
};

export type FeedbackResponsePayload = {
  question: string;
  answer: string;
  score: number;
  dimensions?: AnswerDimensions | null;   // ← 추가
  followUpQuestion?: string;
  followUpAnswer?: string;
  hadFollowUp?: boolean;
};

export function mapResponseForReport(r: ReportResponseRow): SessionReportResponsePayload {
  const hadFollowUp = !!(r.followUpQuestion && r.followUpTranscript);
  const questionText = r.isBonusQuestion
    ? (r.bonusQuestionText ?? "")
    : (r.question?.template ?? "");
  return {
    question: questionText,
    answer: r.correctedTranscript ?? r.transcript,
    score: r.rubricScore,
    dimensions: normalizeAnswerDimensions(r.dimensions),   // ← 추가
    competency: r.competency,
    ...(hadFollowUp
      ? {
          hadFollowUp: true,
          followUpQuestion: r.followUpQuestion!,
          followUpAnswer: r.followUpCorrectedTranscript ?? r.followUpTranscript!,
        }
      : {}),
  };
}
```

`mapResponsesForCompetencyFeedback`은 수정할 필요 없음 — `mapResponseForReport`가 반환하는
객체를 그대로 spread하므로 `dimensions`가 자동으로 따라간다.

이 타입 변경으로 `mapResponseForReport`를 호출하는 다른 곳(`finalizeFullSession`의
`regularResponses.map((r) => mapResponseForReport(r))`, `src/app/api/interview/respond/route.ts`
약 936번째 줄)도 영향 없이 그대로 컴파일된다 — `dimensions`는 옵셔널 필드로 추가되는 것이라
기존 호출부는 손댈 필요 없음.

### 4. `src/app/api/interview/respond/route.ts` — `finalizeCompetencySession`에서 실측 평균으로 덮어쓰기

`generateCompetencyFeedback` 호출과 `competencyFeedback.create` 사이(현재 약 850~873번째 줄)에
평균 계산을 추가하고, DeepSeek이 만든 `feedbackData.dimensions` 대신 우선 사용:

```ts
import {
  averageDimensions,
  normalizeCompetencyDimensions,
  normalizeAnswerDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";

// ... finalizeCompetencySession 내부, generateCompetencyFeedback 호출 이후:

const perTurnDimensions = regularResponses
  .map((r) => normalizeAnswerDimensions(r.dimensions))
  .filter((d): d is AnswerDimensions => d !== null);

const measuredDimensions = perTurnDimensions.length > 0
  ? normalizeCompetencyDimensions(averageDimensions(perTurnDimensions)!)
  : null;

await prisma.competencyFeedback.create({
  data: {
    progressId: progress.id,
    sessionId: params.sessionId,
    summary: feedbackData.summary,
    strengths: feedbackData.strengths,
    improvements: feedbackData.improvements,
    dimensions: measuredDimensions ?? feedbackData.dimensions,   // ← 실측 평균 우선, 없으면 DeepSeek 추정값 폴백
    suggestions: feedbackData.suggestions,
    highlights: feedbackData.highlights,
    rewriteExample: feedbackData.rewriteExample,
    personaAlignmentNote: feedbackData.personaAlignmentNote,
  },
});
```

`measuredDimensions`가 `null`이 되는 경우(이 마이그레이션 이전에 만들어진 세션이 재개되거나,
`dimensions` 컬럼이 비어 있는 극단적 케이스)에는 기존처럼 DeepSeek 추정값을 그대로 쓰므로
회귀 없음.

## 건드리지 않는 것 (범위 밖)

- `src/lib/claude/competency-feedback.ts`의 DeepSeek 프롬프트/JSON 계약 — 그대로 둔다.
  DeepSeek은 여전히 자기 나름의 `dimensions`를 만들어 응답하지만, 위 4번에서 실측값으로
  덮어쓰므로 프롬프트를 안 고쳐도 결과는 정확해진다. (프롬프트에서 dimensions 요청 필드를
  빼서 토큰을 아끼는 건 리스크 대비 이득이 작아 이번 작업에서는 하지 않는다.)
- `src/lib/claude/report.ts`(`generateSessionReport`, 전체 세션 리포트) — grep 결과 이 파일은
  `dimensions`를 전혀 다루지 않는다. 이번 작업과 무관, 손대지 않는다.
- 개인 대시보드(`src/app/dashboard/page.tsx`)에 매턴 dimensions 추이를 노출하는 것은 별도
  작업(2순위)으로 남겨둔다 — 이번 스펙은 저장·재사용까지만.

## 인수 조건 (Acceptance criteria)

- [ ] `npx prisma migrate dev`가 에러 없이 적용되고, `ResponseRecord` 테이블에 `dimensions`
      컬럼이 생긴다.
- [ ] 모의면접을 한 세션 실제로 진행하면, 각 답변 저장 직후 DB의 `ResponseRecord.dimensions`가
      `null`이 아니라 `{starStructure, questionIntent, logic, delivery}` 값으로 채워진다.
- [ ] 해당 역량 세션이 끝나면 `CompetencyFeedback.dimensions`가 그 역량에서 쌓인
      `ResponseRecord.dimensions`들의 평균(0~100 스케일)과 일치한다 — DeepSeek이 새로 지어낸
      값이 아님을 확인.
- [ ] 이 마이그레이션 이전에 이미 진행 중이던(과거) 세션을 마저 진행해도 에러 없이
      완료되고, `dimensions`가 비어 있으면 기존처럼 DeepSeek 추정값으로 폴백한다.
- [ ] `npx tsc --noEmit`, `npm run build` 모두 통과.
- [ ] 보너스 질문(JD 기반) 답변도 `dimensions`가 저장된다(단, 보너스는 IRT/역량 완료
      집계에 안 들어가므로 `finalizeCompetencySession`의 평균 계산 대상은 아님 — 그대로 둘 것,
      `regularResponses`는 이미 `!r.isBonusQuestion` 필터가 적용돼 있음).

## 참고 — 이번 스펙에서 제외한 항목

애초 후보였던 "`pasteDetected`/`tabSwitchCount`(부정행위 시그널) 활용"은 확인해보니 이미
구현돼 있음(`src/lib/org/cohort.ts`의 `integritySignalSessions` → `/org/dashboard` 렌더링,
개인 리포트의 `SessionIntegrityNotice`, `/admin/sessions` 목록·상세) — 추가 작업 불필요.
