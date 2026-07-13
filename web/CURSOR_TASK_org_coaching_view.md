# Cursor 작업 스펙 — 취업센터 코칭용 개인 화면 (2/3: 동의 기반)

## 배경

`/org/dashboard`(`src/lib/org/cohort.ts`의 `getCohortData()`)는 학생 개인 리포트를
**의도적으로** 안 보여준다(화면에 "개인 답변 원문은 이 화면에 표시되지 않습니다" 명시).
이건 맞는 기본값이지만, 학생이 명시적으로 동의하면 취업센터 담당자가 1:1 코칭을 위해
상세 리포트를 볼 수 있게 하는 옵트인 기능을 추가한다. **기본은 항상 비공개.**

## 1. `prisma/schema.prisma` — `User`에 동의 필드 추가

```prisma
model User {
  ...
  /** 소속 기관 담당자가 내 상세 역량 리포트(대시보드)를 볼 수 있도록 허용 — 기본 false,
   *  학생이 프로필 설정에서 직접 켜야 함. 기관 집계(cohort) 통계에는 영향 없음(그건
   *  동의 여부와 무관하게 항상 집계됨) — 이건 "개인 리포트 열람"만 통제한다. */
  orgCoachingConsent   Boolean   @default(false)
  orgCoachingConsentAt DateTime?
  ...
}
```

`npx prisma migrate dev --name add_org_coaching_consent`

## 2. 학생용 동의 토글 UI

`src/app/profile`(또는 설정 페이지 — **정확한 경로는 먼저 확인할 것**, `역량 인증서`
링크가 `/profile/certificate`인 걸 보면 `/profile` 하위에 설정류 페이지가 있을 가능성이
높음)에 토글 추가:

- 라벨: "{기관명}이 내 상세 역량 리포트를 볼 수 있도록 허용" — 기관명은
  `user.organization.name`에서 동적으로 가져올 것. `user.organizationId`가 없으면(개인
  가입자) 이 토글 자체를 숨길 것.
- 설명 문구: "기관 담당자는 코호트 평균 통계는 항상 볼 수 있어요. 이 토글을 켜면 담당자가
  내 개인 리포트(역량별 점수, 답변 피드백)까지 볼 수 있어요. 언제든 끌 수 있습니다."
- 토글 변경 시 `orgCoachingConsent` + `orgCoachingConsentAt`(켤 때만 현재시각, 끌 때는
  유지하거나 null — Cursor 재량) 업데이트하는 API 라우트 신규 작성
  (`src/app/api/profile/org-coaching-consent/route.ts` 같은 경로, PATCH).

## 3. 기관 멤버 목록에 동의 상태 표시 + 상세 링크

`getCohortData()`(`src/lib/org/cohort.ts`)의 `students` 조회(39~42번째 줄)에
`orgCoachingConsent`를 `select`에 추가하고, `CohortMemberRow` 타입에
`coachingConsent: boolean` 필드 추가, `members` 매핑 로직에 반영.

`/org/dashboard/page.tsx`의 멤버 테이블에서 동의한 멤버는 이름 옆에 "상세 보기" 링크
(`/org/dashboard/members/[userId]`)를 보여주고, 동의 안 한 멤버는 "비공개" 배지만 표시
(링크 없음).

## 4. 신규 페이지 — `src/app/org/dashboard/members/[userId]/page.tsx`

```ts
export default async function OrgMemberDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const orgUser = await requireOrgStaff(`/org/dashboard/members/...`); // src/lib/auth/guards.ts
  const { userId } = await params;

  const member = await prisma.user.findUnique({ where: { id: userId } });

  // 가드 순서 중요: 존재 확인 → 같은 기관 소속 확인 → 동의 확인. 셋 다 실패하면 notFound()
  // (403 대신 404로 — 다른 기관 학생 존재 여부를 노출하지 않기 위함, 기존 컨벤션 확인 후 맞출 것)
  if (!member || member.organizationId !== orgUser.organizationId) notFound();
  if (!member.orgCoachingConsent) {
    return <div className="card-luxe p-8 text-center text-muted">
      아직 상세 공유에 동의하지 않은 구성원입니다.
    </div>;
  }

  // 이후 src/app/dashboard/page.tsx와 거의 동일한 데이터 조회(해당 member.id 기준)를
  // 재사용 — 데이터 조회 로직을 공용 함수로 뽑아서 두 페이지가 같이 쓰는 게 이상적
  // (src/lib/dashboard/get-dashboard-data.ts 같은 신규 파일로 추출 고려).
  // CompetencyDashboard 컴포넌트도 그대로 재사용하되, QuestPanel(게임화)과 "+새 면접"
  // 버튼은 담당자 화면에선 의미 없으니 숨길 수 있는 prop(예: readOnly?: boolean)을
  // CompetencyDashboard에 추가할 것.
}
```

`CURSOR_TASK_self_dashboard_polish.md`가 먼저 적용됐다면 6축 BEI 트렌드 섹션도 여기
자동으로 같이 보인다(같은 데이터 조회 로직 재사용이므로) — 순서상 이 스펙을 그 스펙
다음에 진행하는 걸 권장.

## 인수 조건

- [ ] 학생이 동의 토글을 켜기 전에는 기관 담당자가 `/org/dashboard/members/[userId]`에
      접근해도 "동의하지 않음" 안내만 보이고 실제 데이터는 안 보인다.
- [ ] 동의 후에는 담당자가 해당 학생의 역량 대시보드를 읽기 전용으로 볼 수 있다.
- [ ] 다른 기관 소속 학생의 userId로 URL을 직접 넣으면 404.
- [ ] 코호트 집계(`/org/dashboard`의 평균·통계)는 동의 여부와 무관하게 기존과 동일하게
      작동한다(회귀 없음) — 이 기능은 개인 리포트 열람만 추가로 통제하는 것.
- [ ] `npx prisma migrate dev`, `npx tsc --noEmit`, `npm run build` 통과.

## 건드리지 않는 것

- `getCohortData()`의 집계 로직 자체(평균·벤치마크 계산) — 동의 필드 select만 추가, 계산
  로직은 그대로.
- `CompetencyDashboard`의 기존 개인 사용자 렌더링 경로 — `readOnly` 같은 옵션 prop을
  추가하는 형태로 확장하고, 기존 호출부(`src/app/dashboard/page.tsx`)는 그 prop 없이
  기존과 동일하게 동작해야 함.
