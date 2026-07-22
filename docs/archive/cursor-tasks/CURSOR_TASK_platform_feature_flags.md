# Cursor 작업 스펙 — 세션 옵션 기능 플랫폼 킬스위치 (관리자 설정)

## 배경 / 실제로 확인된 문제

`resumeClaimEnabled`(자소서 진위 검증), `jdBonusEnabled`(JD 보너스 질문),
`tripleFeedbackMode`(트리플 피드백)는 전부 `SetupForm.tsx`의 체크박스로 지원자가 직접
켜는 세션 옵션이다. 세 개 다 **관리자·기관 레벨에서 켜고 끌 방법이 전혀 없다**(grep으로
확인, 이 필드들을 다루는 관리자 화면 없음). 특히 `resumeClaimEnabled`는 가장 최근에
추가된 민감한 기능(진위 검증 프레이밍)인데, 문제가 생겨도 코드 배포 없이 끌 방법이 없다는
게 제일 큰 리스크다.

## 목표

슈퍼어드민이 관리자 메뉴에서 이 세 기능을 개별적으로 켜고 끌 수 있는 플랫폼 전역
킬스위치를 만든다. 끄면 해당 체크박스가 SetupForm에서 아예 안 보이고, 서버 쪽에서도
강제로 무시된다(방어적 이중 처리 — 클라이언트만 숨기고 서버가 안 막으면 우회 가능).

## 1. `prisma/schema.prisma` — 신규 모델

```prisma
model PlatformFeatureFlag {
  id          String   @id @default(cuid())
  /** "resume_claim_verification" | "jd_bonus_question" | "triple_feedback_mode" */
  key         String   @unique
  label       String
  description String?  @db.Text
  enabled     Boolean  @default(true)
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}
```

`npx prisma migrate dev --name add_platform_feature_flags` 실행 후, 세 개 키를 기본
`enabled: true`(지금 동작 그대로 유지 — 회귀 없음)로 시드하는 스크립트나 마이그레이션
데이터 삽입을 추가할 것(`prisma/seed.ts`가 있으면 거기에, 없으면 최초 요청 시
upsert하는 방식도 가능 — Cursor 재량).

## 2. `src/lib/platform/feature-flags.ts` (신규)

```ts
export const FEATURE_FLAG_KEYS = {
  RESUME_CLAIM_VERIFICATION: "resume_claim_verification",
  JD_BONUS_QUESTION: "jd_bonus_question",
  TRIPLE_FEEDBACK_MODE: "triple_feedback_mode",
} as const;

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.platformFeatureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? true; // 플래그 row가 아직 없으면(마이그레이션 직후 등) 기본 허용
}

export async function getAllFeatureFlags() {
  return prisma.platformFeatureFlag.findMany({ orderBy: { key: "asc" } });
}
```

## 3. 서버 쪽 강제 적용 (방어적 이중 처리 — 제일 중요)

`src/lib/interview/start-session.ts`에서 세션 생성 직전, 각 옵션을 최종 반영하기 전에
플래그를 확인해서 꺼져 있으면 강제로 `false`로 덮어쓸 것:

```ts
const [resumeClaimAllowed, jdBonusAllowed, tripleFeedbackAllowed] = await Promise.all([
  isFeatureEnabled(FEATURE_FLAG_KEYS.RESUME_CLAIM_VERIFICATION),
  isFeatureEnabled(FEATURE_FLAG_KEYS.JD_BONUS_QUESTION),
  isFeatureEnabled(FEATURE_FLAG_KEYS.TRIPLE_FEEDBACK_MODE),
]);

// 기존 resumeClaimEnabled: resumeClaimEnabled === true && (...) 조건에 && resumeClaimAllowed 추가
// jdBonusEnabled, tripleFeedbackMode도 동일하게
```

이렇게 하면 프론트에서 체크박스를 숨기는 걸 깜빡하거나, 누군가 API를 직접 호출해도
서버가 최종적으로 막는다.

## 4. `SetupForm.tsx` — 체크박스 조건부 노출

세 체크박스(`jdBonusEnabled`, `tripleFeedbackMode`, `resumeClaimEnabled`) 렌더링 부분에
플래그 값을 받아서 꺼져 있으면 아예 렌더하지 않도록 조건 추가. 플래그 값은 이 페이지가
서버 컴포넌트(부모)에서 가져와 props로 내려주거나, 가벼운 GET API
(`/api/feature-flags/public`, `enabled`만 노출하고 `updatedBy` 등은 제외)를 새로 만들어
클라이언트에서 조회 — 기존 SetupForm 데이터 로딩 패턴을 확인해서 그 방식을 따를 것.

## 5. 관리자 화면 — `src/app/admin/settings/features/page.tsx` (신규)

```ts
export default async function FeatureFlagsPage() {
  const user = await requirePageUser("/admin/settings/features");
  if (!hasSuperadminAccess(user)) notFound(); // 슈퍼어드민 전용 — 일반 콘텐츠 관리자도 접근 불가

  const flags = await getAllFeatureFlags();
  // 각 flag: label, description, enabled 여부를 보여주고 토글 스위치
  // ADMIN_CONTAINER, AdminPageHeader 등 기존 admin 페이지 공통 컴포넌트 재사용
}
```

토글 시 호출할 `PATCH /api/admin/feature-flags/[key]/route.ts` 신규 작성 —
`requirePlatformAdminApi` + `hasSuperadminAccess` 가드, 변경 시 기존
`logAdminAudit()`(`src/lib/admin/audit.ts`, IRT 재보정 작업에서 쓴 것과 동일 패턴)로
`action: "UPDATE"`, `entityType: "platform_feature_flag"` 감사 로그 남길 것.

`/admin/page.tsx`(관리자 홈)나 `/admin/content`의 헤더 링크 목록에 "기능 설정 →" 진입점
추가.

## 인수 조건

- [ ] 마이그레이션 직후 기존 세 기능이 전과 동일하게 SetupForm에 보인다(기본값
      `enabled: true`라 회귀 없음).
- [ ] 슈퍼어드민이 `/admin/settings/features`에서 "자소서 진위 검증"을 끄면, 이후
      SetupForm에서 그 체크박스가 안 보인다.
- [ ] 꺼진 상태에서 `/api/interview/start`를 직접(체크박스 우회) 호출해 `resumeClaimEnabled:
      true`를 보내도, 서버가 무시하고 세션에는 반영되지 않는다.
- [ ] 일반 콘텐츠 관리자(슈퍼어드민 아님) 계정으로 `/admin/settings/features` 접근 시
      404.
- [ ] 토글 변경 시 `/admin/audit`에 로그가 남는다.
- [ ] `npx prisma migrate dev`, `npx tsc --noEmit`, `npm run build` 통과.

## 건드리지 않는 것

- 기관별 entitlement(`interviewEnabled`/`saasPersonalizationEnabled`/`diagnosticEnabled`)
  시스템 — 이건 이미 별도로 잘 되어 있고 이번 작업과 무관. 이번 건 "기관 단위"가 아니라
  "플랫폼 전체" on/off라는 점이 다름.
- IRT 재보정 알고리즘 내부 상수(`MIN_SAMPLE_SIZE`, 학습률, 클램프 범위) — 이런 알고리즘
  튜닝 값까지 이번 스펙에서 관리자 UI로 노출하지 않는다. 범위 밖.
