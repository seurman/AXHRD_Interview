# 꼬리질문 리포트 반영 + 트리플 피드백(MVP) — 커서용 스크립트

## 4가지 항목 처리 현황

- **A. 전달력(딜리버리) 코칭 — 이미 구현 완료.** `computeDeliveryStats()`
  (`lib/interview/feedback-helpers.ts`)가 필러워드 카운트 + 어절/분 속도를 이미
  계산해서 세션 리포트(`/interview/[sessionId]/report`)와 역량별 피드백
  (`/interview/plan/[planId]/competency/[code]/feedback`) 양쪽에 다 렌더링되고
  있음. 새로 만들 게 없어서 이번 스크립트에서 제외. 다듬을 점이 생기면(예:
  어절 대신 음절 기준 속도, 필러워드 목록 확장) 그건 별도로 작게 요청하면 됨.
- **B. 꼬리질문 리포트 반영 — 이번 스크립트에서 처리.**
- **C. 트리플 피드백 MVP — 이번 스크립트에서 처리.**
- **D. `/admin/saas/interview-kit` 링크 정리 — 이미 직접 고침.**
  `OrgSaasPermissionPanel.tsx`가 레거시 리다이렉트 라우트를 거치지 않고
  `/admin/organizations/[id]/interview-kit`로 바로 가도록 수정 완료. 참고로
  `org/saas/settings*`, `admin/saas/interview-kit`는 옛 북마크/외부링크
  안전망으로 남겨둔 의도된 리다이렉트 스텁이라 중복 구현이 아니었음 — 그대로
  둬도 됨.

---

## B. 꼬리질문(Follow-up) 반영

### 문제
`ResponseRecord`에 `followUpQuestion`/`followUpTranscript`/`followUpCorrectedTranscript`가
이미 저장되고, `ChipEvent.hadFollowUp`도 "리포트/투명성 표시용"이라는 주석까지
달려있는데, 정작 리포트 생성 단계에서 다 버려지고 있음:

- `web/src/lib/claude/report.ts`의 `generateSessionReport()` 입력 타입이
  `{ question, answer, score, competency }`뿐이라 꼬리질문 정보가 안 들어감.
- `web/src/app/api/interview/respond/route.ts`의 `finalizeFullSession()`,
  `finalizeCompetencySession()` 둘 다 세션 응답을 이 축소된 형태로 매핑하면서
  꼬리질문 필드를 여기서 누락시킴.

### 수정
1. `generateSessionReport()`/`generateCompetencyFeedback()` 입력 타입에
   `followUpQuestion?: string; followUpAnswer?: string; hadFollowUp?: boolean`
   추가. 시스템 프롬프트에 "꼬리질문이 있었던 문항은 원 답변과 꼬리질문 답변을
   함께 보고, 꼬리질문에 얼마나 잘 대응했는지도 코멘트에 반영하라" 한 줄 추가
   (새 LLM 호출 아님 — 기존 호출의 입력만 확장).
2. `finalizeFullSession()`/`finalizeCompetencySession()`에서 매핑할 때 이 필드들
   빠뜨리지 말고 그대로 전달.
3. 리포트 UI(`/interview/[sessionId]/report/page.tsx`) 세션 타임라인 섹션 —
   이미 `session.chipEvents`를 순회하면서 글리프(♩/♭/♪)를 그리고 있으니, 그
   루프에 `hadFollowUp`이 true인 칩에만 작은 마커(예: 우측 상단에 작은 점 또는
   "↩" 아이콘)를 추가. 새 섹션 만들 필요 없이 기존 루프에 조건부 마커만 얹으면
   됨.
4. 역량별 분석 섹션(`report.sections`, `ReportSection`)에도 해당 역량에
   꼬리질문이 있었으면 `content`에 그 사실이 자연스럽게 녹아들도록(1번에서
   프롬프트로 유도) — 별도 UI 컴포넌트 불필요.

### 원칙
- 새 LLM 호출 추가 금지 — 기존 `generateSessionReport`/
  `generateCompetencyFeedback` 호출의 입력만 확장.
- 스키마 변경 없음(이미 있는 필드 사용).
- 타임라인 마커는 CSS만으로 처리(새 아이콘 라이브러리 추가 불필요, 기존
  `lucide-react` 아이콘 재사용).

---

## C. 트리플 피드백 (Triple Feedback) MVP

`docs/STATUS.md`에 이미 있는 스펙을 그대로 따른다 (아래 요약, 원문은
STATUS.md "트리플 모드" 절 참고).

### 컨셉
동일 답변에 대해 **대기업 · 공공기관 · 스타트업** 3명의 면접관 관점 피드백을
카드 3장으로 병렬 표시. IRT 점수(θ, pass/attempt/downgrade)는 1개만 유지하고,
3카드는 해석·코칭 렌즈만 다름. 시장에 "한 답변 → 3조직 유형 카드 병렬 피드백"을
하는 곳이 거의 없어서 차별화 포인트로 잡은 기능.

### 중요 정정 — 재사용할 파일
STATUS.md 스펙에 `lib/company/company-size-presets.ts`를 기반으로 한다고
적혀 있는데, **이건 정확함** — 이 파일에 이미 `LARGE`/`MID`/`SMALL`/`STARTUP`/
`PUBLIC` 5종 `interviewStyle.tone`/`rounds`/`focus` 프리셋이 있음. 트리플
피드백은 이 중 `LARGE`/`PUBLIC`/`STARTUP` 3개만 뽑아 쓰면 됨(MID/SMALL은
트리플 카드에서 제외, 필요하면 나중에 확장).

**`lib/interview/persona-archetype.ts`는 이거랑 다른 축**(산업×직무 기반
페르소나 매칭)이니 헷갈려서 재사용하지 말 것 — 트리플 피드백엔 안 씀.

### 구현
1. `lib/interview/triple-feedback.ts` (신규):
   ```ts
   export interface TripleFeedbackCard {
     lens: "LARGE" | "PUBLIC" | "STARTUP";
     verdict: string;        // 이 관점에서의 한줄 총평
     comment: string;        // 코칭 코멘트
   }
   export async function generateTripleFeedback(params: {
     question: string;
     answer: string;
     competency: string;
   }): Promise<{ LARGE: TripleFeedbackCard; PUBLIC: TripleFeedbackCard; STARTUP: TripleFeedbackCard }>
   ```
   - Gemini 1회 호출(기존 `generateGeminiText` 재사용). 시스템 프롬프트에
     `COMPANY_SIZE_PRESETS.LARGE/PUBLIC/STARTUP`의 `tone`/`focus`를 각각
     그대로 근거로 박아서, 3장의 카드가 실제로 다른 관점처럼 보이게 유도
     (대기업=조직적합·리더십·프로세스·윤리, 공공=NCS·공직가치·규칙·책임,
     스타트업=오너십·성장·속도·비전공감 — STATUS.md 원문 그대로).
   - 점수(score)는 여기서 새로 안 만듦 — 기존 IRT/루브릭 점수 1개를 그대로
     공용으로 사용, 이 함수는 해석 텍스트만 생성.
   - API 키 없거나 실패 시 결정론적 폴백(각 프리셋의 `focus` 배열을 문장으로
     조립한 템플릿 코멘트) — 대시보드/리포트가 LLM 상태에 의존하지 않게.

2. `respond/route.ts`(답변 채점하는 곳) — 트리플 모드가 켜진 세션일 때만
   `generateTripleFeedback` 호출해서 `answerFeedback`에 `tripleFeedback` 필드로
   얹기. **트리플 모드 꺼져 있으면 이 호출 자체를 안 함**(토큰 비용 증가
   방지 — STATUS.md에 명시된 리스크).

3. `components/interview/TripleFeedbackPanel.tsx` (신규) — 3카드 그리드(대기업/
   공공/스타트업), 하단에 공통 IRT 점수/노트 1줄. 기존 `AnswerFeedbackPanel`과
   같은 카드 톤(`card-luxe`) 재사용.

4. `SetupForm.tsx` — "트리플 모드" 토글 추가(기본 OFF, 옵션). 토글 켜져 있으면
   세션에 `tripleFeedbackMode: true` 같은 플래그 저장(세션 생성 시
   `InterviewSession`에 필드 추가 필요 — 스키마 변경 1개, 마이그레이션 필요).

5. `InterviewSession.tsx`(면접 진행 화면) — 트리플 모드면 `AnswerFeedbackPanel`
   대신 `TripleFeedbackPanel` 렌더링.

### 스키마
```prisma
model InterviewSession {
  // ...기존 필드...
  tripleFeedbackMode Boolean @default(false)
}
```
그리고 `ResponseRecord`(또는 `ChipEvent`)에 `tripleFeedback Json?` 필드 추가해서
생성된 3카드 결과를 저장(재조회 시 재생성 안 하도록).

### 원칙 (STATUS.md 원문 그대로)
- 3개 verdict가 서로 다르게 나오는 건 정상 — UI에 "관점마다 판단이 다를 수
  있어요" 안내 문구 넣을 것.
- 토큰 비용 증가하므로 기본은 옵션/토글로, 자동 활성화 금지.
- 스키마 변경 있으니 `npx prisma migrate dev` + `npm run build` 확인.
- 작업 끝나면 `docs/STATUS.md`의 "트리플 모드" 절을 "구현 완료"로 갱신하고
  근거·API·UI 정리.

---

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_followup_triple_feedback_prompt.md)에 정리된 두 가지를 구현해줘:

1. 꼬리질문(follow-up) 발생 여부를 세션 리포트/역량별 피드백에 반영 — 이미
   저장돼 있는 followUpQuestion/followUpTranscript/hadFollowUp 데이터가 현재
   리포트 생성 단계에서 드롭되고 있어. generateSessionReport/
   generateCompetencyFeedback 입력에 이 필드들을 추가해서(새 LLM 호출은 추가하지
   말고 기존 호출 입력만 확장) 리포트 코멘트에 반영되게 하고, 세션 타임라인의
   ChipEvent 글리프 루프에 hadFollowUp 마커만 추가해줘.

2. 트리플 피드백(대기업/공공/스타트업 3관점 병렬 카드) MVP — docs/STATUS.md의
   "트리플 모드" 절 스펙 그대로 구현. lib/company/company-size-presets.ts의
   LARGE/PUBLIC/STARTUP 프리셋을 근거로 Gemini 1회 호출로 3카드 생성(점수는
   기존 IRT 점수 1개 공용, 새로 안 만듦). 트리플 모드는 SetupForm 토글로 옵션
   켜야만 호출되게(기본 OFF, 토큰 비용 방지). InterviewSession에
   tripleFeedbackMode Boolean 필드, ResponseRecord/ChipEvent에 tripleFeedback
   Json 필드 추가(재생성 방지용 캐시).

원칙: 새 LLM 호출 최소화, LLM 실패 시 결정론적 폴백 필수, 스키마 변경 있으니
npx prisma migrate dev + npm run build 확인, 끝나면 docs/STATUS.md 갱신.
```
