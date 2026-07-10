# 자소서 첨삭 + 공고 대사 + 보완방안 — 커서용 스크립트

## 방향 요약 (합의된 내용)

`/interview/setup` 흐름에 "자소서 첨삭 받기"를 끼워 넣는다(별도 독립 서비스가 아니라
모의면접 전 단계). 공고(JD)가 있으면 공고 요구사항과 자소서를 대사해서 매칭표를
보여주고, 공고가 없으면 이미 있는 산업군/직무 프리셋(`industry-presets.ts`,
`persona-archetype.ts`)을 기준으로 삼는다. 첨삭에서 짚은 부족 역량은 이어지는
모의면접 문항 선정에도 이어지게 해서(부족한 부분을 실제 면접으로 검증) 순수 첨삭
서비스들과 차별화한다.

## 기존 재료 재사용 (새로 안 만들어도 되는 것들)

- `Resume.parsedTags`(`lib/interview/resume-summary.ts`의 `summarizeResume`) —
  `skills`/`experiences`/`keywords` 이미 저장돼 있음. 그대로 입력으로 사용.
- `lib/company/fetch-jd-url.ts`(`resolveJdText`) — 공고 URL → 본문. 그대로 재사용.
- `lib/company/jd-mapper.ts`(`deriveInterviewStyleFromJD`) — JD 원문 분석 LLM 호출이
  이미 있음. **새 LLM 호출을 추가하지 말고 이 함수의 출력 스키마만 확장**해서
  `requiredSkills`/`requiredKeywords`를 같이 뽑는다(아래 3-1 참고).
- `lib/company/industry-presets.ts`, `lib/interview/persona-archetype.ts`
  (`focusCompetencies`) — 공고 없을 때 폴백 기준으로 그대로 사용.
- `lib/gemini/client.ts`의 `generateGeminiText` — 새 리포트 생성 호출도 기존 클라이언트
  재사용(새 벤더 추가 없음).

## 1. 스키마

```prisma
model TargetCompany {
  // ...기존 필드 유지...
  /** JD 원문에서 뽑은 요구 스킬/키워드 — deriveInterviewStyleFromJD 호출 1회에 얹어서 같이 받음(추가 LLM 호출 아님) */
  jdRequirements Json?   // { skills: string[], keywords: string[] }

  resumeReviews  ResumeReview[]
}

model Resume {
  // ...기존 필드 유지...
  reviews ResumeReview[]
}

/** 자소서 첨삭 리포트 — 공고 대사(있으면) 또는 산업군/직무 프리셋(없으면) 기준 */
model ResumeReview {
  id                String        @id @default(cuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  resumeId          String
  resume            Resume        @relation(fields: [resumeId], references: [id], onDelete: Cascade)
  targetCompanyId   String?
  targetCompany     TargetCompany? @relation(fields: [targetCompanyId], references: [id], onDelete: SetNull)
  /** "jd" | "industry_preset" — 매칭 기준이 실제 공고였는지 폴백이었는지 */
  matchSource       String
  overallSummary    String        @db.Text
  /** [{ quote, issue, suggestion }] — 문단/문장 단위 첨삭 */
  paragraphFeedback Json
  /** { matchScore, matched: string[], missing: string[] } */
  jdMatch           Json
  /** [{ gapLabel, suggestion }] — 부족한 항목별 보완 제안 */
  improvementPlan   Json
  /** improvementPlan의 갭을 NCS 6역량 코드로 매핑 — 다음 모의면접 추천 역량에 사용 */
  suggestedCompetencies Json  @default("[]")
  createdAt         DateTime      @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([resumeId])
}
```
User 모델에 `resumeReviews ResumeReview[]` 관계 추가.

## 2. 매칭 로직 — 코드로 먼저, LLM은 마지막 1회만

비용 최소화 원칙: 정확 키워드 매칭은 코드로, "왜 부족한지 + 어떻게 보완할지"
서술만 LLM 1회로 생성한다(첨삭 버튼을 눌렀을 때만 호출 — 세션 시작마다 자동 호출
금지).

`lib/interview/resume-review.ts` (신규):

```ts
export function matchKeywords(
  resumeKeywords: string[],
  requiredKeywords: string[]
): { matchScore: number; matched: string[]; missing: string[] } {
  // 정규화(공백/대소문자/특수문자 제거) 후 부분일치까지 허용하는 매칭.
  // requiredKeywords가 비어있으면 matchScore는 null 취급(호출부에서 분기).
}
```

`generateResumeReviewNarrative(params)` — Gemini 1회 호출:
- 입력: resumeSummary(`ResumeSummary`), jdRequirements(있으면) 또는 industry+jobRole
  프리셋 기대 역량(없으면), matchKeywords 결과.
- 출력 JSON: `{ overallSummary, paragraphFeedback: [{quote, issue, suggestion}],
  improvementPlan: [{gapLabel, suggestion}], suggestedCompetencies: string[] }`
- 시스템 프롬프트 원칙(`resume-summary.ts`의 프롬프트 인젝션 방어 패턴 그대로 재사용):
  - 자소서 원문에 없는 경험을 지어내라고 하지 말 것 — 없으면 "이런 경험이 있다면
    추가하세요" 또는 "경험이 없다면 면접에서 관련 역량을 다른 사례로 보완하는 전략"을
    제안하는 톤으로.
  - `paragraphFeedback`의 `quote`는 반드시 원문에 실제로 있는 문장/구절만 인용.
  - 개인정보(연락처 등) 언급 금지.

## 3. API

### 3-1. `lib/company/jd-mapper.ts` 확장 (기존 함수 수정)
`JD_MAP_SYSTEM` 프롬프트와 `JDMapResult` 타입에 `requirements: { skills: string[],
keywords: string[] }` 추가 — **같은 호출에 얹는다, 새 호출 만들지 말 것**. 반환값을
`startInterviewSession()`이 `targetCompany.jdRequirements`에 저장하도록 연결.

### 3-2. `POST /api/resume/review`
```
body: { resumeId?: string, resumeText?: string, targetCompanyId?: string,
        industry?: string, jobRole?: string }
```
- `resumeId` 없이 `resumeText`만 오면 그 자리에서 `summarizeResume` 호출(자소서를
  아직 저장 안 한 상태에서도 첨삭만 미리 볼 수 있게).
- `targetCompanyId`가 있고 `jdRequirements`가 있으면 그걸 기준으로, 없으면
  `industry`/`jobRole`로 `industry-presets.ts` + `persona-archetype.ts`
  `focusCompetencies`를 기대 역량으로 사용(`matchSource: "industry_preset"`).
- `matchKeywords` → `generateResumeReviewNarrative` → `ResumeReview` 생성 → 반환.
- rate-limit(기존 `checkRateLimit` 패턴 재사용, 예: `resume:review:${user.id}`, 분당 5회).

### 3-3. `GET /api/resume/review/[id]`
본인 소유 리포트만 조회(`assertResourceOwner` 재사용).

## 4. UI

### 4-1. `/interview/setup`(`SetupForm.tsx`)
자소서 섹션 아래에 "자소서 첨삭 받기" 보조 버튼 추가(주 CTA "면접 시작하기"는
그대로 — 첨삭은 선택 사항, 건너뛰고 바로 면접 시작 가능해야 함). 클릭 시
`/api/resume/review` 호출 → `/resume-review/[id]`로 이동.

### 4-2. `app/resume-review/[id]/page.tsx` (신규)
기존 `card-luxe`/`Reveal` 컴포넌트·톤 재사용, 4단 구성:
1. 총평 카드 (`overallSummary`)
2. 문단별 첨삭 리스트 — 원문 인용(`quote`) + 지적(`issue`) + 재작성 제안(`suggestion`)
3. 공고 매칭표 — `matchSource`가 `"jd"`면 "공고 기준", `"industry_preset"`이면
   "○○ 산업군 · ○○ 직무 일반 기준" 배지로 구분 표시. 매칭률 %, matched/missing
   태그 리스트.
4. 보완 방안 — `improvementPlan` 리스트.
- 하단 CTA: "이 역량으로 면접 시작하기" → `suggestedCompetencies[0]`을
  `/interview/setup?competency=...`에 쿼리로 넘겨 바로 이어지게.

### 4-3. 내비게이션
지난번 정리한 메뉴 그룹("면접 준비 ▾") 안에 "자소서 첨삭" 항목 추가.
`lib/platform/nav-registry.ts`의 `PRODUCT_HREFS`에 항목 추가.

## 원칙

- 새 LLM 벤더 추가 금지 — 기존 Gemini 클라이언트만 사용.
- 자소서 첨삭은 세션 시작마다 자동 호출되면 안 됨 — 사용자가 버튼을 눌렀을 때만.
- JD 요구사항 추출은 `deriveInterviewStyleFromJD`의 기존 호출에 얹을 것(별도 호출
  추가 금지).
- 키워드 매칭 자체(matchScore 계산)는 LLM 없이 코드로 — LLM은 서술형 피드백
  생성에만 사용.
- 자소서에 없는 경험을 지어내는 문장을 만들지 않도록 프롬프트에 명시(기존
  `resume-summary.ts` 방어 패턴 재사용).
- 스키마 변경이 있으므로 `npx prisma migrate dev` + `npm run build` 확인.
- 작업 끝나면 `docs/STATUS.md`에 근거·스키마·API·UI·마이그레이션 파일명·로컬 검증
  결과를 기존 문서 스타일대로 정리할 것.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_resume_review_prompt.md)에 정리된 "자소서 첨삭 + 공고 대사 +
보완방안" 기능을 구현해줘. 방향은 이미 확정됐고, 문서에 스키마·매칭 로직·API·UI·
원칙이 다 정리돼 있으니 그대로 따라줘.

핵심 원칙만 다시 강조하면:
1. 새 LLM 호출은 최소화 — JD 요구사항 추출은 기존 deriveInterviewStyleFromJD
   호출에 얹고, 키워드 매칭은 코드로, 서술형 첨삭 생성만 새 LLM 호출 1개(사용자가
   버튼 눌렀을 때만).
2. 자소서에 없는 내용을 지어내지 않도록 프롬프트에 명시.
3. 첨삭은 선택 사항 — 안 받아도 바로 면접 시작 가능해야 함.
4. 첨삭 결과의 suggestedCompetencies를 다음 면접 추천 역량으로 이어지게 연결.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고, 끝나면
docs/STATUS.md에 정리해줘.
```
