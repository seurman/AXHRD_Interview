# Cursor 작업 스펙 — 기업 채용 담당자용 지원자 결과 화면 (3/3: 스크리닝용)

## 배경 / 실제로 확인된 문제

기업이 인터뷰 킷을 만들어 외부 지원자에게 공유하면(`OrgInterviewKitShare`, `/kit/[slug]`
경로) 지원자는 로그인 후 그 킷으로 면접을 완료하고, `InterviewSession.kitOrganizationId`
+ `orgKitShareId`에 어느 기관·어느 공유링크로 들어왔는지 스냅샷이 남는다. **그런데 이
데이터를 기업이 볼 수 있는 화면이 코드베이스 어디에도 없다** — 개별 세션 상세를 보는
페이지는 `/admin/sessions/[sessionId]`(플랫폼 슈퍼어드민 전용, `src/app/admin/sessions/[sessionId]/page.tsx`)
뿐이고, `/org/**` 아래엔 지원자별 결과 페이지가 없다(grep으로 확인 완료).

이건 역량평가 SaaS(HR_ENTERPRISE 고객) 제품의 핵심 기능 누락이다 — 기업이 인터뷰 킷으로
지원자를 스크리닝하는 게 이 상품의 존재 이유인데, 결과를 볼 화면이 없으면 반쪽짜리다.
이번 작업은 취업센터 코칭용 화면(`CURSOR_TASK_org_coaching_view.md`)과 다르다 —
**여기는 지원자가 그 기업에 지원하려고 킷을 시작한 것이므로, 기업이 결과를 보는 것 자체는
채용 프로세스의 당연한 일부다(동의 토글 불필요).** 대신 **지원 시작 시점에 결과가
기업에 전달된다는 걸 명확히 고지**하는 게 이번 작업의 중요한 부분이다.

## 1. 신규 페이지 — `src/app/org/candidates/page.tsx` (캠페인 목록)

```ts
export default async function OrgCandidatesPage() {
  const orgUser = await requireOrgStaff("/org/candidates");

  const shares = await prisma.orgInterviewKitShare.findMany({
    where: { organizationId: orgUser.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sessions: { where: { status: "COMPLETED" } }, // 관계명은 schema에서 확인 후 맞출 것
        },
      },
    },
  });

  // 캠페인(label)별로 카드 나열: label, slug, 활성 여부, 완료 건수, 만료일
  // 각 카드 클릭 → /org/candidates/[shareId]
}
```

`OrgInterviewKitShare` → `InterviewSession`의 관계명(`sessions`인지 다른 이름인지)은
`prisma/schema.prisma`에서 실제 필드명을 확인 후 정확히 쓸 것 — 추측하지 말 것.

## 2. 신규 페이지 — `src/app/org/candidates/[shareId]/page.tsx` (지원자 목록)

```ts
export default async function OrgCandidateListPage({ params }: { params: Promise<{ shareId: string }> }) {
  const orgUser = await requireOrgStaff(`/org/candidates/...`);
  const { shareId } = await params;

  const share = await prisma.orgInterviewKitShare.findUnique({ where: { id: shareId } });
  if (!share || share.organizationId !== orgUser.organizationId) notFound();

  const sessions = await prisma.interviewSession.findMany({
    where: { orgKitShareId: shareId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      // 필요한 만큼만: overallTheta, focusCompetency, completedAt
    },
  });

  // 테이블: 지원자명 · 이메일 · 완료일 · 종합 백분위(있으면) · "리포트 보기" 링크
  // 링크 대상은 3번에서 만드는 org 전용 리포트 라우트
}
```

## 3. 신규 라우트 — `src/app/org/candidates/session/[sessionId]/page.tsx` (org용 리포트 뷰)

**기존 지원자용 리포트 페이지(`src/app/interview/[sessionId]/report/page.tsx`)의 인증
로직(`resolveInterviewActor`, 세션 소유자 또는 시연 토큰만 허용)은 손대지 않는다** —
그 경로를 org staff까지 허용하도록 느슨하게 풀면 지원자 개인정보 보호 경로 전체가
약해질 위험이 있다. 대신 완전히 별도의 org 전용 라우트를 새로 만든다.

```ts
export default async function OrgCandidateReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const orgUser = await requireOrgStaff(`/org/candidates/session/...`);
  const { sessionId } = await params;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { /* 기존 리포트 페이지와 동일한 include — 그 파일을 먼저 읽고 그대로 맞출 것 */ },
  });

  // 가드: 이 세션이 실제로 이 기업의 킷으로 시작된 게 맞는지 반드시 확인
  if (!session || session.kitOrganizationId !== orgUser.organizationId) notFound();
  if (session.status !== "COMPLETED") notFound();

  // 렌더링은 기존 리포트 페이지가 쓰는 컴포넌트들(ReportCompetencyAnalysis 등)을
  // 최대한 재사용 — 다만 "다음 역량 이어서 보기"(NextCompetencyButton) 같은 지원자
  // 전용 액션 버튼은 여기서 숨길 것(org 담당자용 화면이므로).
}
```

## 4. 지원 시작 시점 고지 문구 추가

`/kit/[slug]` 랜딩 페이지(정확한 파일 경로는 `src/app/kit/[slug]/**` 아래에서 확인) 또는
`/api/kit/[slug]/start/route.ts` 호출 직전 화면에, 면접 시작 전 명확히 보이는 위치에
문구 추가: "이 모의면접 결과는 {기관명} 채용 담당자에게 전달됩니다." 기관명은
`OrgInterviewKitShare.organization.name`에서 가져올 것. 이미 비슷한 고지 문구가 있는지
먼저 확인하고, 없으면 새로 추가.

## 5. 기관 네비게이션에 진입점 추가

`src/lib/platform/nav-registry.ts`(다른 스펙들에서 이미 이 파일을 건드린 이력 있음 —
`10dc6fb` 커밋 참고)에 "지원자 결과"(`/org/candidates`) 메뉴 항목 추가. 표시 조건은
`competency` entitlement(`saasPersonalizationEnabled`)가 켜진 기관에서만 보이게 —
`src/lib/org/entitlements.ts`의 `readOrgEntitlements` 패턴 참고.

## 인수 조건

- [ ] `saasPersonalizationEnabled`(역량평가 SaaS) 켜진 기관 담당자로 로그인하면
      `/org/candidates`에서 자기 기관이 만든 인터뷰 킷 공유 캠페인 목록이 보인다.
- [ ] 캠페인 클릭 → 완료한 지원자 목록 → 개별 리포트까지 3단계로 접근 가능.
- [ ] 다른 기관의 `shareId`나 다른 기관 킷으로 만들어진 `sessionId`를 URL에 직접 넣으면
      404(교차 기관 데이터 노출 없음 — 이 가드가 제일 중요함, 반드시 테스트할 것).
- [ ] `/kit/[slug]`로 면접을 시작하기 전에 "결과가 기업에 전달된다"는 고지가 명확히
      보인다.
- [ ] 기존 지원자용 리포트 페이지(`/interview/[sessionId]/report`)의 인증 로직과 동작은
      전혀 바뀌지 않는다(회귀 없음).
- [ ] `npx tsc --noEmit`, `npm run build` 통과.

## 건드리지 않는 것

- `src/app/interview/[sessionId]/report/page.tsx`의 기존 인증 로직 — 절대 org staff를
  허용하도록 느슨하게 풀지 않는다. 새 라우트를 따로 만든다(3번 참고).
- 취업센터 코칭용 동의 플로우(`CURSOR_TASK_org_coaching_view.md`)와 이 작업은 무관 —
  여기는 지원자-채용기업 관계라 동의 토글이 필요 없다는 걸 혼동하지 말 것.
