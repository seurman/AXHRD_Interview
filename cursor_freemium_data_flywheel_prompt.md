# 프리미엄 전환 + 데이터 플라이휠 — 커서용 스크립트

## 방향 요약

지금 `plans.ts`(FREE=월 3회)와 실제 접근 제어(`personal-access.ts`가 FREE
개인 전체를 "5분 체험만" 가둠) 사이의 모순을 없앤다. **회원가입 = 진짜
FREE 티어(월 3회) 잠금 해제**로 바꾸고, 비로그인 방문자에게는 계정 없이도
1문항만 맛보는 티저를 제공한다. 동시에 문항뱅크 전체 노출을 막아 경쟁사
스크래핑 리스크를 줄이고, **모든 실사용 응답이 우리 데이터 자산으로
축적**되도록 설계한다 — 이게 콘텐츠보다 강한 진짜 모트.

## A. FREE 티어 잠금 해제 — 회원가입 = 진짜 체험

`lib/auth/personal-access.ts`의 `isPersonalTrialOnlyUser`가 FREE 개인
사용자를 전면 차단하는 로직을 제거하고, 대신 기존 `checkUsageLimit()`
(월 3회 한도)만으로 제어되게 한다:
- `blockPersonalTrialApi()`를 호출하는 6개 라우트(`interview/start`,
  `resume/review`, `resume/review/[id]`, `discover/start`,
  `discover/respond`, `questions/swipe`, `kit/[slug]/start`)에서 이 차단을
  제거하고, `interview/start`/`discover/start`는 이미 있는
  `checkUsageLimit(userId, "mock_interview" | "self_discovery")`로만 게이팅.
- `isPersonalTrialOnlyUser`/`blockPersonalTrialApi` 함수 자체는 완전히
  지우지 말고, **비로그인 방문자 판별용**으로 재정의(B번 참고) — 이름도
  헷갈리지 않게 정리.

## B. 비로그인 1문항 티저

기존 `/api/demo/[slug]/try`(영업 데모용, `DemoWorkspace` 스코프)는 그대로
두고 손대지 않는다. **일반 방문자용 신규 엔드포인트**를 별도로 만든다:

`POST /api/trial/try` — 비로그인, DB 세션 저장 없음, 결과만 반환:
```ts
// checkRateLimit(`trial:try:${ip}`, 5, 10*60*1000) — 데모용보다 더 빡빡하게
// 문항은 아래 C번의 "쇼케이스 문항"에서만 선택
// 채점은 기존 buildGuestTryFeedback(휴리스틱, LLM 호출 없음) 재사용
```
`/demo` 페이지에 로그인 여부와 무관하게 "1문항 체험해보기"를 최상단에
배치, 체험 직후 "회원가입하면 진짜 리포트와 역량 추적을 받을 수 있어요"
CTA로 전환 유도.

## C. 쇼케이스 문항 — 노출 범위 최소화

`Question` 모델에 필드 추가:
```prisma
model Question {
  // ...기존 필드...
  isShowcase Boolean @default(false)  // 비로그인 티저 + FREE 티어에 노출 허용
}
```
- 관리자(CMS)가 역량당 3~5개만 `isShowcase: true`로 지정(전체 문항의
  일부만). 비로그인 티저(B번)와 FREE 플랜 실사용 모두 `isShowcase: true`
  문항 풀에서만 선택.
- PRO/PREMIUM 사용자만 전체 문항뱅크(150개 예정) 접근 — 문항뱅크 CRUD
  화면(지난번 CMS 스크립트)에 이 토글 추가.
- 이렇게 하면 계정을 여러 개 만들어 긁어가도 전체 뱅크의 일부만 노출됨.

## D. 원점수/루브릭 비노출 — 이미 되어 있음

지난번 대시보드 개편(can-do 문장, θ/percentile 상세보기 뒤로 숨김)이 이미
이 역할을 겸하고 있다. 이번 배치에서 추가 작업 불필요 — 원칙만 재확인:
어떤 화면에서도 `rubricCriteria`/`difficulty`/`discrimination` 원문·수치를
사용자에게 노출하지 않는다(관리자 CMS 화면 제외).

## E. 어뷰징 탐지 확장

기존 무결성 신호(붙여넣기/탭전환 감지) 옆에, 짧은 시간 내 동일 IP/이메일
도메인에서 대량 가입+체험 패턴을 관리자에게 플래그(자동 차단 아님 — 대학
캠퍼스망 같은 공용 IP 오탐 방지):
```ts
// lib/auth/signup-anomaly.ts
// checkRateLimit 패턴 재사용, 예: 같은 IP에서 1시간 내 5개 이상 신규 가입 시
// User.signupFlag: "NONE" | "REVIEW" 필드에 표시, /admin/users에서 필터 가능하게
```

## F. 데이터 플라이휠 — 축적·동의·활용

**F-1. 동의 고지**(신규, 법무 검토 필요 — 아래 문구는 초안):
`User` 모델에 `dataUseConsentAt DateTime?` 추가. 회원가입 폼(`register/route.ts`
연동 화면)에 체크박스 추가:
> "답변 내용은 익명·집계 형태로 문항 개선과 산업별 인사이트 리포트 생성에
> 활용될 수 있습니다. 개인을 식별할 수 있는 형태로 외부에 제공되지 않습니다."

동의 없이는 가입 진행 불가(필수 동의) 또는 선택 동의로 할지는 법무 판단
필요 — **이 문구는 초안이며 실제 서비스 반영 전 법무 검토 필수**로
`docs/STATUS.md`에 명시.

**F-2. 응답 축적 — 이미 되고 있음, 범위만 확장**
`ResponseRecord`/`CompetencySnapshot`은 이미 모든 세션을 저장한다. A번으로
FREE 사용자도 진짜 세션을 쓰게 되면 자동으로 이 풀에 더 많은 데이터가
쌓인다 — 별도 코드 변경 불필요, A번의 자연스러운 부산물.

**F-3. 재보정(recalibration) — 설계만, 실행은 다음 배치**
`docs/STATUS.md`에 다음을 설계 메모로 남긴다(이번엔 구현 안 함):
> "Question.difficulty/discrimination은 현재 작성 시점 추정치. ResponseRecord.
> rubricScore가 역량×레벨별로 충분히(예: 문항당 100건 이상) 쌓이면, 실제
> 정답률 분포 기반으로 재보정하는 배치 작업을 다음 배치에서 설계한다. 표준
> IRT 파라미터 추정(2PL MLE)은 통계적으로 신중한 작업이라 별도 배치로 분리."

**F-4. 집계 인사이트 — 지원자풀 인사이트를 플랫폼 전체로 일반화**
지난번 B2B 킷용 `getApplicantPoolInsight(shareId)`와 같은 로직을, 캠페인
스코프가 아니라 **산업×직무 스코프**로 일반화:
```ts
// lib/insight/industry-insight.ts
export async function getIndustryInsight(industry: Industry, jobRole: JobRole) {
  // 표본 30명 미만이면 null 반환(익명성 보호 — 캠페인용보다 더 보수적인 임계값)
  // CompetencySnapshot을 industry/jobRole로 조인 집계, 개인 식별 정보 없음
}
```
이번 배치에서는 함수만 만들고 어디에도 노출하지 않는다(내부 준비만) —
나중에 대학 취업센터 대시보드나 기업 대상 데이터 상품으로 노출할지는 별도
비즈니스 판단.

## 원칙

- FREE 티어 잠금 해제는 기존 `checkUsageLimit()` 재사용 — 새 과금 로직
  없음.
- 비로그인 티저는 영업 데모(`/api/demo/[slug]/try`)와 완전히 분리된 별도
  엔드포인트 — 섞지 않는다.
- 쇼케이스 문항만 비로그인/FREE에 노출 — 전체 뱅크는 유료 이상만.
- 데이터 활용 동의 문구는 초안이며 법무 검토 없이 그대로 배포하지 않는다.
- 재보정 배치는 설계 메모만, 이번엔 구현하지 않는다.
- 산업 인사이트 함수는 만들되 이번엔 어디에도 노출하지 않는다(내부 준비).
- 스키마 변경 있음(`Question.isShowcase`, `User.dataUseConsentAt`,
  `User.signupFlag`) — 마이그레이션 필요.
- 작업 끝나면 `npm run build` 확인, `docs/STATUS.md`에 정리(특히 F-1/F-3의
  "법무 검토 필요"/"다음 배치" 표시를 반드시 남길 것).

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_freemium_data_flywheel_prompt.md)에 정리된 프리미엄 전환 +
데이터 플라이휠을 구현해줘.

핵심 원칙:
1. personal-access.ts의 FREE 개인 전체 차단 로직을 없애고, 기존
   checkUsageLimit()(월 3회)만으로 게이팅되게 해줘 — 6개 라우트에서
   blockPersonalTrialApi 호출 제거.
2. 비로그인 1문항 티저는 /api/trial/try로 완전히 새로 만들고, 기존 영업
   데모(/api/demo/[slug]/try)는 절대 건드리지 마 — 둘은 다른 용도야.
3. Question.isShowcase 필드 추가하고, 비로그인 티저+FREE 티어는 이 필드가
   true인 문항만 쓰게 해줘. 전체 뱅크는 PRO 이상만.
4. User.dataUseConsentAt, signupFlag 필드 추가하고 회원가입 폼에 동의
   체크박스 추가해줘. 단, 동의 문구는 초안이니 "법무 검토 필요"라고
   docs/STATUS.md에 반드시 남겨.
5. F-3(재보정 배치)은 구현하지 말고 docs/STATUS.md에 설계 메모만 남겨줘.
6. lib/insight/industry-insight.ts는 함수만 만들고 UI에는 노출하지 마 —
   내부 준비 단계야.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md에 정리해줘.
```
