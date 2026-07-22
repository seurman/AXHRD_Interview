# Cursor 작업 스펙 — 상품(entitlement)별 기관 홈 화면 분리

## 배경 / 실제로 확인된 문제

기관은 `interview`(면접) · `competency`(역량개발 SaaS/인터뷰 킷) · `diagnostic`(조직진단) 세 상품을 독립적인 boolean entitlement로 켜고 끌 수 있다(`src/lib/org/entitlements.ts`의 `OrgEntitlementSnapshot`). 그런데 기관 관리자/직원이 로그인해서 오는 홈 화면 `src/app/org/dashboard/page.tsx`(워크스페이스 전환 시 기본 진입 경로, `src/lib/nav/workspace.ts`의 `defaultWorkspaceHref("org")`가 여기로 보냄)는 **처음부터 `interview` 상품 전용으로만 짜여 있다** — `getCohortData()`를 불러서 코호트 통계·학생 로스터·벤치마크를 보여주는데, `competency`만 켜져 있거나 `diagnostic`만 켜져 있는 기관도 무조건 이 화면으로 온다. 즉 면접 상품이 없는 기관은 지금 사실상 제대로 된 홈이 없다.

## 목표

기관이 가진 entitlement 조합에 따라 `/org/dashboard` 진입 시 다른 화면을 보여준다.

- `interview`만 → 지금 화면 그대로 (변경 없음, 회귀 금지 — 기존 고객 대부분이 이 케이스)
- `competency`만 → 신규 "역량개발 SaaS 홈" (인터뷰 킷 상태 + 이번 시즌 평가 현황)
- `diagnostic`만 → 이미 있는 `/org/diagnosis`로 리다이렉트(새 화면 안 만들어도 됨)
- 2개 이상 → 신규 "복합 개요"에서 보유 상품별 요약 카드를 쌓아서 보여주고, 각 카드가 해당 상품 상세 페이지로 연결
- 0개(승인은 됐는데 아직 아무 상품도 안 켜짐) → 지금 동작을 확인하고 적절한 안내 문구로 유지/보완

## 재사용 가능한 기존 인프라

- `readOrgEntitlements(org)` / `countActiveEntitlements(snapshot)` — `src/lib/org/entitlements.ts`. `org`는 `Organization`의 `interviewEnabled`/`saasPersonalizationEnabled`/`diagnosticEnabled` 필드를 가진 객체(raw Prisma row 또는 그 셋만 select한 결과)면 된다.
- `getCohortData(organizationId)` — `src/lib/org/cohort.ts`. 지금 `/org/dashboard`가 쓰는 함수. 여기 반환 타입에 entitlement 세 필드가 이미 포함돼 있는지 먼저 확인할 것 — 없으면 여기에 필드를 추가하거나, `/org/dashboard/page.tsx`에서 `prisma.organization.findUnique({ where: { id: organizationId }, select: { interviewEnabled: true, saasPersonalizationEnabled: true, diagnosticEnabled: true } })`를 별도로 한 번 더 불러도 된다(가벼운 쿼리라 비용 문제 없음).
- `requireOrgStaff("/org/dashboard")` — 기존 가드, 그대로 사용.
- `/org/diagnosis` (`src/app/org/diagnosis/page.tsx`, `requireDiagnosticUser` 가드, `<DiagnosisOrgConsole />`) — 이미 완성된 조직진단 콘솔. diagnostic 전용 기관은 새로 안 만들고 여기로 `redirect()`.
- `getOrgBenchmark()` (`src/lib/org/benchmark.ts`) — interview 카드용 벤치마크, 기존 로직 그대로.
- `ORG_PRODUCTS` (`src/lib/org/entitlements.ts`) — 상품별 라벨/설명이 이미 정의돼 있음(`label`, `shortLabel`, `description`, `tenantMenu`) — 새 화면의 뱃지·카드 제목에 재사용.

## 새로 만들어야 하는 것

1. **`src/lib/org/competency-home-data.ts`** (신규) — 역량개발 SaaS 홈용 통계 함수. 필요한 지표: 조직 소유 인터뷰 킷에 설정된 역량 수, 최근 채용 시즌 동안 이 킷으로 평가된 지원자 수, 활성 공유 링크 수. **정확한 Prisma 모델/관계명(`OrgInterviewKitShare` 등)은 먼저 `prisma/schema.prisma`를 grep해서 확인하고 작성할 것** — 추측하지 말 것.
2. **`src/components/org/OrgCompetencyHome.tsx`** (신규) — 위 데이터를 받아 렌더링하는 클라이언트/서버 컴포넌트. 통계 타일 + 최근 공유 링크 활동 리스트 + "인터뷰 킷 편집"(`/org/settings/interview-kit`) · "커스텀 역량 만들기"(`/org/settings/competencies`) CTA.
3. **`src/lib/org/overview-data.ts`** (신규) — 복합 개요용 경량 통계 함수. 활성 상품마다 필요한 요약 지표만 뽑는다: interview는 `getCohortData`/`getOrgBenchmark` 중 요약에 필요한 값만, competency는 위 1번 함수, diagnostic은 `/org/diagnosis`가 이미 계산하는 최신 웨이브 응답률·OHI를 재사용(중복 구현하지 말고 `DiagnosisOrgConsole`이 쓰는 데이터 함수를 그대로 호출할 것 — 어디서 fetch하는지 확인 후 재사용).
4. **`src/components/org/OrgOverview.tsx`** (신규) — 보유 상품 카드를 세로로 나열. 각 카드: 상품 뱃지(`ORG_PRODUCTS`에서 라벨 가져오기) + 핵심 지표 2~3개 + "자세히 보기" 링크(interview→`/org/dashboard`가 아니라 카드 자체가 이 페이지 안에 있으니 상세 화면이 필요하면 새 서브 경로를 만들거나, 지금은 그냥 각 상품의 기존 전체 페이지로 링크: competency→`/org/settings`, diagnostic→`/org/diagnosis`. interview 카드만 예외적으로 "전체 코호트 대시보드 보기"가 필요한데, 이 경우 `/org/dashboard?full=1`처럼 쿼리로 분기하거나 별도 경로 `/org/dashboard/cohort`를 만드는 것도 고려 — 설계는 Cursor 재량, 다만 순환 리다이렉트가 생기지 않게 주의).
5. **`src/app/org/dashboard/page.tsx`** (수정) — `status !== "APPROVED"` 얼리 리턴은 그대로 두고, 그 다음에 entitlement 분기 추가:
   ```ts
   const ent = readOrgEntitlements(orgRow); // orgRow: 위에서 확보한 필드
   const active = countActiveEntitlements(ent);
   if (ent.diagnostic && !ent.interview && !ent.competency) {
     redirect("/org/diagnosis");
   }
   if (active >= 2) {
     return <OrgOverview organizationId={user.organizationId} entitlements={ent} />;
   }
   if (ent.competency && !ent.interview) {
     return <OrgCompetencyHome organizationId={user.organizationId} />;
   }
   // 기존 interview 전용 렌더링은 그대로 아래에 둔다 — 건드리지 않기
   ```

## 인수 조건 (Acceptance criteria)

- [ ] `interview`만 켜진 기관은 지금과 100% 동일한 화면을 본다 — 코드 diff 없이 렌더링 결과가 바뀌면 안 됨.
- [ ] `competency`만 켜진 기관은 `/org/dashboard`에서 역량개발 SaaS 홈을 본다(빈 화면·에러 없음).
- [ ] `diagnostic`만 켜진 기관은 `/org/dashboard` 접근 시 `/org/diagnosis`로 리다이렉트된다.
- [ ] 2개 이상 켜진 기관은 보유 상품 카드만 보이고, 안 켜진 상품 카드는 안 보인다.
- [ ] 각 카드의 "자세히 보기"가 실제로 맞는 페이지로 연결된다(순환 리다이렉트 없음).
- [ ] 0개 켜진 승인된 기관도 에러 없이 뭔가 합리적인 안내를 본다(현재 동작 확인 후 유지/개선).
- [ ] `PENDING`/`REJECTED` 상태 기관의 기존 동작은 그대로.
- [ ] 슈퍼어드민 콘솔(`/admin/organizations/[id]`)은 이 작업과 무관 — 건드리지 않는다.

## 리스크 / 주의

- `readOrgEntitlements`가 요구하는 필드명은 `interviewEnabled` / `saasPersonalizationEnabled` / `diagnosticEnabled`다(entitlement 키 이름 `competency`와 DB 컬럼명 `saasPersonalizationEnabled`이 다르니 헷갈리지 말 것).
- `useNavSession()`의 `saasLinks`(네비게이션 메뉴)는 이미 capability 기반으로 올바르게 필터링되고 있어 손댈 필요 없음 — 이번 작업은 페이지 콘텐츠 라우팅만 바꾼다.
- 복합 개요의 interview 카드용 지표는 `getCohortData`/`getOrgBenchmark`를 이미 호출하는 기존 `/org/dashboard`의 APPROVED 분기 로직을 최대한 재사용하고, 새로 요약 통계 함수를 또 만들지 않도록 확인할 것(중복 쿼리 방지).
