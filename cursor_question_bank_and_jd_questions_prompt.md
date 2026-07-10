# 세션 길이 확장(레벨5 도달) + 자소서/공고 기반 즉석 질문 — 커서용 스크립트

두 가지를 한 문서에 정리하지만 독립적으로 구현 가능. A는 코드 설정값 변경 +
콘텐츠 확장, B는 기존 개인화 로직 확장 + 새 "보너스 질문" 트랙 추가.

---

## A. 세션 질문 수 확장 — 레벨5 도달 가능하게

### 원인 (코드로 확인됨)
`current_level`이 세션 시작 시 **L2**에서 출발하고, 레벨 상승 규칙은 강한
정답(score ≥ 0.75)일 때만 +1, 애매(0.55~0.75)면 그대로, 부족(<0.55)이면 -1인
철저한 래칫 구조(`services/irt-engine/app/core/irt_2pl.py`
`adjust_level_after_response`). 그런데 COMPETENCY 모드 세션이
`minItems: 2, maxItems: 3`으로 고정돼 있어서(`web/src/lib/interview/
start-session.ts`, `web/src/app/api/interview/respond/route.ts` 양쪽),
L2→L5(+3레벨)를 가려면 **3문제를 전부 강한 정답으로 맞혀야만** 가능함. 애매한
답 1번만 나와도 그 세션에선 L5가 수학적으로 불가능 — 레벨5 문항 개수와는 무관한
문제였음.

### 수정
1. `web/src/lib/interview/start-session.ts` — `initIrtSession()` 호출부의
   `minItems: 2, maxItems: 3` → **`minItems: 3, maxItems: 5`**.
2. `web/src/app/api/interview/respond/route.ts` — 동일한 값을 쓰는 두 곳
   (`maxItemsPerCompetency = isCompetencyMode ? 3 : 18` 및 `minItems:
   isCompetencyMode ? 2 : 8, maxItems: isCompetencyMode ? 3 : 18`)도 똑같이
   `3`→`5`, `2`→`3`으로 맞출 것 — **두 파일의 값이 반드시 일치해야 함**(하나만
   바꾸면 클라이언트-서버 종료 조건이 어긋나는 버그가 남).
3. `docs/IRT.md`의 "최소 8문항, 최대 18문항" 문구는 FULL 모드(현재 미사용) 값이라
   COMPETENCY 모드 실제 값과 다름 — 헷갈리니 문서에 "COMPETENCY 모드(실사용):
   min 3 / max 5, FULL 모드(미사용): min 8 / max 18"로 명확히 구분해서 갱신.

### 문항뱅크 확장 (콘텐츠 작업)
세션이 길어지면 같은 레벨 문항이 반복 노출될 위험이 커지므로, 레벨별 문항을
현재 3개 → **5개**로 확장(`seed/questions.json`). 6개 역량 × 5레벨 × 5개 =
150문항(현재 90개 → +60개 신규). 새 문항 작성 시:
- 기존 `seed/questions.json`의 톤/형식(간결한 한국어, NCS 6역량 맥락)을 그대로
  따를 것 — 기존 문항 옆에 나란히 둬도 이질감 없어야 함.
- `difficulty`는 레벨별 b값 기준표(`docs/IRT.md`: L1=-2.0, L2=-1.0, L3=0.0,
  L4=+1.0, L5=+2.0)를 참고해 해당 레벨 문항끼리 값이 겹치지 않게 약간씩 분산.
- `discrimination`은 기존 문항들의 평균값 범위를 참고해 비슷한 수준으로.
- 같은 레벨 안에서도 서로 다른 상황/각도를 다뤄서 순수 반복처럼 안 느껴지게.

### 참고
`minItems`/`maxItems`는 세션 초기화 시 IRT 엔진에 파라미터로 전달되는 값이라
(`services/irt-engine`) 엔진 코드 자체는 수정할 필요 없음 — Next.js 쪽 호출부
두 곳만 맞추면 됨.

---

## B. 자소서/공고 기반 즉석 질문

### 방향
`lib/interview/personalize-question.ts`가 이미 하고 있는 방식(기존 은행 문항의
**문구만** 자소서 인용구로 다시 쓰고, 문항의 `difficulty`/`discrimination`/
`rubricCriteria`는 그대로 유지)이 안전한 확장 경로. 이 방식은 IRT 캘리브레이션을
안 건드리니 여러 문항에, 그리고 자소서뿐 아니라 JD(공고)에도 넓힐 수 있음.

반면 **은행에 없는, JD에서 완전히 새로 뽑아낸 질문**은 난이도/판별도가
없으므로 θ 계산에 넣으면 안 됨 — 별도의 "보너스 질문" 트랙으로 분리해서
기존 홀리스틱 루브릭(리포트용 BARS/STAR 채점과 동일한 방식)으로만 평가.

### B-1. 기존 개인화 범위 확장
`lib/interview/personalize-question.ts`:
- 지금은 "역량당 첫 질문만" 개인화됨 — 세션 문항 수가 3→5로 늘어난 김에,
  **매 문항**(또는 최소 처음 2~3개까지)에 적용하도록 확장. 단, 같은 자소서
  인용구를 반복 사용하지 않도록 이미 사용한 인용구는 추적해서 제외.
- 그라운딩 소스에 `TargetCompany.jdRequirements`(자소서 첨삭 기능에서 이미
  추가된 필드)도 추가 — 자소서 인용구가 없거나 소진됐으면 JD 요구사항 키워드로
  그라운딩. 검증 로직(`isQuestionGroundedInHighlights` 패턴)도 JD 키워드
  기준으로 동일하게 적용.
- **원칙: 이 경로로 만들어진 질문은 여전히 기존 은행 문항의 `difficulty`/
  `discrimination`을 그대로 물려받는다 — 새 캘리브레이션 값을 만들지 않는다.**

### B-2. JD 전용 "보너스 질문" (신규, 선택적)

**스키마** — `ResponseRecord`에 필드 추가:
```prisma
model ResponseRecord {
  // ...기존 필드...
  isBonusQuestion Boolean @default(false)  // true면 theta 계산에서 제외
}
```

**생성** — `lib/interview/jd-bonus-question.ts`(신규):
```ts
export async function generateJdBonusQuestion(params: {
  jdRequirements: { skills: string[]; keywords: string[] };
  competency: string;
}): Promise<{ question: string; groundedRequirement: string } | null>
```
- Gemini 1회 호출(기존 `generateGeminiText` 재사용). JD 요구사항 중 실제로
  하나를 인용해서 질문을 만들고, 은행에 없는 내용이라는 걸 명시.
- `TargetCompany.jdRequirements`가 없으면(공고 미입력) 이 기능 자체를 비활성화.

**세션 흐름**: COMPETENCY 세션이 끝날 때(3~5개 정규 문항 완료 후), JD가
있고 사용자가 옵션을 켰을 때만 **1개 추가**로 이 보너스 질문을 물어봄. 기본은
OFF — `SetupForm.tsx`에 "공고 맞춤 질문 추가" 토글 추가.

**채점**: 새 루브릭 시스템 만들지 말고, 기존 리포트/역량피드백 생성에 쓰는
홀리스틱 BARS 방식 그대로 재사용(질문+답변을 그 호출 입력에 얹어서 코멘트만
받음). **theta/percentile 계산 경로에는 절대 넣지 않음** —
`isBonusQuestion: true`인 응답은 IRT 엔진에 전달하는 응답 목록에서 필터링.

**리포트 UI**: 정규 역량별 분석 섹션과 명확히 분리된 별도 박스로 —
"공고 맞춤 보너스 질문 (참고용 · 점수에는 반영되지 않음)" 라벨과 함께 질문/답변/
코멘트만 표시.

### 원칙
- 새 LLM 벤더 추가 없음, 기존 Gemini/DeepSeek 클라이언트만 사용.
- 은행 문항 기반 개인화(B-1)는 반드시 원 문항의 IRT 파라미터를 유지 — 문구만
  바뀜.
- JD 전용 보너스 질문(B-2)은 반드시 theta 계산에서 제외 — 심리측정 신뢰성을
  지키는 게 최우선.
- 보너스 질문은 기본 OFF, 사용자가 켜야만 동작(세션 길이/비용 증가 방지).
- A/B 모두 스키마 변경 있음(B만 마이그레이션 필요 — A는 seed 데이터 추가만이라
  마이그레이션 불필요, seed 재실행만 필요).
- 작업 끝나면 `npm run build` 확인, `docs/IRT.md`와 `docs/STATUS.md` 갱신.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_question_bank_and_jd_questions_prompt.md)의 A, B 두 파트를
구현해줘.

A(세션 길이 확장):
1. start-session.ts와 respond/route.ts 양쪽의 COMPETENCY 모드
   minItems/maxItems를 2/3 → 3/5로 동일하게 맞춰줘 — 두 파일 값이 반드시
   일치해야 해.
2. seed/questions.json에 레벨별 문항을 3개 → 5개로 확장해줘(6역량×5레벨×5개=
   150개, 기존 90개 톤/형식 유지, difficulty는 docs/IRT.md의 레벨별 b값
   기준표 참고).
3. docs/IRT.md의 "최소 8/최대 18" 문구가 미사용 FULL 모드 값이라는 걸 명확히
   구분해서 갱신해줘.

B(자소서/공고 기반 즉석 질문):
1. personalize-question.ts의 개인화 범위를 첫 질문에서 매 문항으로 넓히고,
   그라운딩 소스에 TargetCompany.jdRequirements도 추가해줘. 이 경로는 반드시
   기존 은행 문항의 difficulty/discrimination을 그대로 유지해야 해(새 캘리브레이션
   값 만들지 마).
2. ResponseRecord.isBonusQuestion Boolean 필드 추가하고, JD 전용 보너스 질문
   생성 함수(lib/interview/jd-bonus-question.ts)를 만들어줘. 기본 OFF,
   SetupForm 토글로 켜야만 동작. 채점은 새 루브릭 만들지 말고 기존 홀리스틱
   BARS 방식 재사용. isBonusQuestion=true인 응답은 IRT theta 계산에서 반드시
   제외해줘 — 이게 제일 중요한 원칙이야.
3. 리포트 UI에 보너스 질문을 "참고용·점수 미반영"으로 명확히 분리해서 보여줘.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md, docs/IRT.md 갱신해줘.
```
