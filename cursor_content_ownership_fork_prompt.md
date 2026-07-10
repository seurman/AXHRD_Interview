# 통합 콘텐츠 오너십(기본/기관 포크/승격) 모델 — 커서용 스크립트

이 문서는 이전 두 스크립트를 아래와 같이 대체/보강한다:
- `cursor_content_cms_prompt.md`의 Survey 설계는 유지하되 오너십 필드를 이
  문서 기준으로 통일(아래 4번).
- `cursor_mobile_kit_builder_prompt.md`의 "3단계 마법사" 안은 **폐기**하고,
  이 문서의 바텀시트 기반 설계로 대체.

## 개념 요약

역량(Competency)은 루브릭과 1:1. 기본(플랫폼) 역량 세트는 수퍼어드민만
편집 가능하고, 기관이 새로 만들거나(또는 기본을 복제해서) 고친 역량/문항은
그 기관 소유로 격리된다. 수퍼어드민은 모든 기관의 커스텀 역량/문항을 다 볼 수
있고, 필요하면 "기본 역량으로 승격"할 수 있다. 이 패턴(기본/포크/승격)은
역량·문항에 한정하지 않고 설문 등 다른 콘텐츠 타입에도 재사용 가능한 공통
구조로 만든다.

**벤치마킹 근거**: Figma의 팀 라이브러리 컴포넌트를 로컬에서 오버라이드하고
"Push changes to main component"로 다시 반영하는 워크플로우, Salesforce의
Standard(잠김) vs Custom(테넌트 소유) Object 권한 모델, Korn Ferry/
SuccessFactors 같은 HR테크의 "표준 역량 라이브러리를 라이선스 받아 조직에
맞게 커스터마이징"하는 업계 관행 — 세 가지를 결합한 구조.

## 1. 공통 오너십 필드 — `ContentOwnerScope`

```prisma
enum ContentOwnerScope {
  PLATFORM   // 기본, 수퍼어드민만 편집
  ORG        // 기관 소유, 해당 기관+수퍼어드민 편집
  DEMO       // 고객 데모 워크스페이스 소유 — 이번 배치는 값만 준비(아래 5번 참고)
}
```

## 2. `Competency` 모델 확장

```prisma
model Competency {
  // ...기존 필드(id, level, difficulty 등은 Question 쪽, 여기는 rubricByLevel 등)...
  ownerScope      ContentOwnerScope @default(PLATFORM)
  organizationId  String?           // ownerScope=ORG일 때만 값 있음
  organization    Organization?     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  forkedFromId    String?           // 베이스가 된 역량 id — 계보 추적, 승격/병합 시 참조
  forkedFrom      Competency?       @relation("CompetencyFork", fields: [forkedFromId], references: [id], onDelete: SetNull)
  forks           Competency[]      @relation("CompetencyFork")
  createdByUserId String?
  createdBy       User?             @relation("CompetencyCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([ownerScope])
}
```

**중요 — 기존 `code String @unique` 제약 변경 필요**: 기관이 자기 역량을 만들
수 있게 되면 `code`가 전역에서 유일할 필요가 없어진다(예: 여러 기관이 각자
"LEADERSHIP_CUSTOM" 코드를 쓸 수 있어야 함). `@unique` → **`@@unique([organizationId,
code])`** 로 변경(단, `organizationId`가 null인 PLATFORM 항목끼리는 여전히
서로 code가 겹치면 안 되므로, Prisma의 nullable 복합유니크 특성상 null끼리는
유니크 제약이 적용 안 되는 DB도 있음 — Postgres는 NULL을 서로 다른 값으로
취급해 복합유니크를 통과시키므로 **PLATFORM 항목 간 code 중복 방지는 애플리케이션
레벨에서 별도 검증 필요**(생성 API에서 `organizationId: null`일 때 code 중복
체크를 명시적으로 추가).

**필수 후속 작업**: 코드베이스 전체에서 `prisma.competency.findUnique({ where:
{ code } })` / `findFirst({ where: { code } })` 형태로 code만으로 조회하는
곳을 전부 grep해서, 의도가 "기본 역량"이면 `{ code, organizationId: null }`로
스코프를 명시하도록 수정할 것. 이 부분을 놓치면 기관 커스텀 역량이 생긴 순간
엉뚱한 조회 결과가 나올 수 있음 — **가장 위험한 지점이니 신중히 확인**.

## 3. `Question` 모델 확장

```prisma
model Question {
  // ...기존 필드(competencyId, level, difficulty, discrimination, template 등)...
  ownerScope      ContentOwnerScope @default(PLATFORM)
  organizationId  String?
  organization    Organization?     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  forkedFromId    String?
  forkedFrom      Question?         @relation("QuestionFork", fields: [forkedFromId], references: [id], onDelete: SetNull)
  forks           Question[]        @relation("QuestionFork")
  createdByUserId String?
  createdBy       User?             @relation("QuestionCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([ownerScope])
}
```
문항은 `competencyId`로 이미 특정 역량(플랫폼 것이든 기관 포크든)에 속하지만,
오너십 필드를 역량과 별도로 명시적으로 둔다 — 나중에 "역량 전체가 아니라
문항 하나만 승격"하는 세밀한 워크플로우(6번)를 지원하기 위함.

**주의**: 기관이 만든 신규 문항의 `difficulty`/`discrimination`은 실제 응답
데이터로 캘리브레이션된 값이 아니라 작성자의 추정치다. 이 한계를 CMS 문항
작성 폼에 안내 문구로 명시("초기값은 추정치이며, 응답이 쌓이면 추후 재보정
검토")하고, 재보정 자동화는 이번 배치 범위 밖(향후 과제로 `docs/STATUS.md`에
기록).

## 4. `Survey` 모델 — 지난 배치 설계를 이 패턴에 맞춰 보강

`cursor_content_cms_prompt.md`에서 설계한 `Survey` 모델(아직 미구현)에 동일
패턴 적용:
```prisma
model Survey {
  // ...지난 배치 설계 필드 그대로...
  ownerScope   ContentOwnerScope @default(PLATFORM)  // 기존 organizationId 필드는 유지(ORG일 때만 값)
  forkedFromId String?
  forkedFrom   Survey? @relation("SurveyFork", fields: [forkedFromId], references: [id], onDelete: SetNull)
  forks        Survey[] @relation("SurveyFork")
}
```
아직 구현 전이라 지금 반영하는 게 나중에 고치는 것보다 훨씬 쌈.

## 5. 고객 데모(`DemoCompetency`/`DemoQuestion`)에 미치는 영향

지금 `DemoCompetency`/`DemoQuestion`은 `Competency`/`Question`과 **완전히
분리된 중복 스키마**(`workspaceId`로 스코프, 자체 `code`/`rubricByLevel`/
`externalId` 필드 보유)다. 개념적으로는 이번 오너십 패턴의 `DEMO` scope로
정확히 흡수될 수 있는 구조(기관 대신 데모 워크스페이스가 소유자가 되는 것뿐)지만,
**이번 배치에서는 실제 테이블 통합·데이터 마이그레이션을 하지 않는다** — 이미
운영 중인 데모 워크스페이스 데이터를 옮기는 건 별도로 신중히 검증해야 할
마이그레이션이라 이번 스코프에 넣으면 리스크가 커진다.

이번엔 **`ContentOwnerScope.DEMO` 값만 준비**해두고, `docs/STATUS.md`에 다음을
후속 과제로 명시:
> "DemoCompetency/DemoQuestion을 Competency/Question + ownerScope=DEMO +
> demoWorkspaceId로 통합하면 중복 스키마·중복 CRUD 코드를 없앨 수 있음. 기존
> 데모 데이터 마이그레이션 검증 후 별도 배치로 진행 권장."

## 6. 승격(Promote) 워크플로우

기관 소유 역량/문항을 수퍼어드민이 검토해서 기본으로 올리는 두 가지 경로:

```ts
// POST /api/admin/content/competencies/[id]/promote
// body: { mode: "merge_into_base" | "promote_as_new_base" }
```
- **`merge_into_base`**: `forkedFromId`가 가리키는 기존 PLATFORM 역량의
  `rubricByLevel`(및 선택적으로 연결된 문항)을 이 기관 버전 내용으로 덮어씀.
  `forkedFromId`가 없으면(포크가 아니라 완전 신규 작성) 이 옵션 비활성화.
- **`promote_as_new_base`**: 이 기관 역량/문항을 복제해서 `ownerScope:
  PLATFORM, organizationId: null`인 새 행으로 생성(원본 기관 항목은 그대로
  둠 — 기관은 계속 자기 버전을 쓸 수 있음). `forkedFromId`는 계보 추적용으로
  그대로 유지(승격 후에도 "어디서 왔는지" 남겨둠).
- 문항 단위 승격도 동일 API 패턴을 `Question`에 적용(역량 전체를 승격하지
  않고 문항 몇 개만 골라 승격 가능해야 함 — 3번에서 문항에 독립 오너십 필드를
  둔 이유).

간단한 비교 UI(디프 알고리즘 없이, 기본 버전 텍스트 vs 기관 버전 텍스트를
좌우로 나란히 보여주는 정도)를 승격 버튼 옆에 배치 — 정교한 diff는 이번
범위 밖.

## 7. 권한 — 새 capability 1개만 추가

```ts
// lib/platform/capabilities.ts
"tenant.custom_competency": {
  id: "tenant.custom_competency",
  category: "tenant_content",
  labelKo: "기관 맞춤 역량",
  ...
}
```
`ORG_ADMIN` 역할 배열에 추가(`ORG_STAFF`는 조회만, 생성/편집은 `ORG_ADMIN`만
— 기존 `tenant.interview_kit` 권한 분리 패턴과 동일하게). 수퍼어드민 쪽은
기존 `platform.content`로 전체 기관 커스텀 콘텐츠 조회+승격 권한 커버(새
capability 불필요).

## 8. API

- `POST /api/org/content/competencies` — body `{ forkedFromId?, nameKo,
  definition, rubricByLevel }` → `ownerScope: ORG, organizationId: <소속기관>`
  으로 생성. `forkedFromId` 있으면 그 항목의 `rubricByLevel`을 초기값으로
  프리필(프론트에서 미리 불러와 폼에 채운 뒤 저장 — 별도 서버 로직 불필요).
- `PATCH/DELETE /api/org/content/competencies/[id]` — 소유 기관 검증(본인
  기관 것만) + 수퍼어드민은 전체 접근.
- `POST /api/org/content/competencies/[id]/questions` — 해당 역량에 문항
  추가(기관 소유 역량에만 가능 — PLATFORM 역량에는 기관이 문항 못 붙임).
- `GET /api/admin/content/competencies?scope=ORG` — 수퍼어드민 전용, 전체
  기관의 커스텀 역량 목록(기관명 포함, 필터/검색).
- `POST /api/admin/content/competencies/[id]/promote` — 6번 참고.

## 9. UI

### 데스크톱
- `/admin/content`(수퍼어드민)에 "기관 커스텀 역량" 탭 추가 — 기관별 그룹핑,
  각 항목에 "기본으로 승격" 버튼(6번 두 모드 선택 모달).
- `/org/settings`(기관 관리자)에 "역량 관리" 섹션 추가 — 기본 역량 목록(잠금
  아이콘, "복제해서 만들기" 버튼만 활성) + 우리 기관 커스텀 역량 목록(편집
  가능, "기본으로 승격 요청" 버튼 — 실제 승격 실행은 수퍼어드민만, 기관은
  요청 표시만 남김 정도로 가볍게).

### 모바일 — 바텀시트 기반(지난 3단계 마법사 대체)
- 역량 목록(마스터 리스트, 전체폭) — 항목 탭하면 그 역량이 "내 킷"에 추가됨
  (선택=담기). PLATFORM 항목은 자물쇠 배지, ORG 항목은 소속 기관 배지.
- 역량 옆 "문항 관리" 버튼(또는 항목 롱프레스) → 그 역량의 문항 목록/편집
  화면이 **풀스크린 시트**로 열림(Material Design 바텀시트가 풀스크린으로
  확장되는 패턴) — 뒤로가기/닫기로 원래 목록 맥락으로 복귀.
- 문항 편집 시트 안에서 추가/수정/삭제, 저장하면 시트 닫히고 목록으로 복귀.
- PLATFORM 역량의 문항 관리 시트는 읽기 전용 + "복제해서 커스터마이징" 버튼만.

## 원칙

- `Competency.code`/`Question`의 전역 유일성 제약을 기관 스코프 유일성으로
  바꾸는 게 이번 배치에서 가장 위험한 지점 — 코드베이스 전체의 code 기반 조회를
  전부 재검토할 것.
- 신규 커스텀 문항의 difficulty/discrimination은 추정치임을 UI에 명시, 자동
  재보정은 범위 밖.
- `DemoCompetency`/`DemoQuestion` 통합은 이번에 하지 않음 — `DEMO` scope 값만
  준비, 실제 통합은 후속 배치.
- 새 capability는 `tenant.custom_competency` 하나만, 그 외 기존 권한 재사용.
- 승격은 "병합" vs "신규 기본으로" 두 갈래 명확히 구분, 문항 단위로도 가능해야
  함.
- 스키마 변경이 크므로(uniqueness 제약 변경 포함) `npx prisma migrate dev`
  실행 후 기존 데이터에 영향 없는지 반드시 확인, `npm run build`도 확인.
- 작업 끝나면 `docs/STATUS.md`에 이 구조·후속 과제(데모 통합, 재보정)를 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_content_ownership_fork_prompt.md)에 정리된 통합 콘텐츠
오너십(기본/기관 포크/승격) 모델을 구현해줘. 이전에 준 cursor_content_cms_prompt.md의
Survey 설계는 유지하되 오너십 필드는 이 문서 기준(4번)으로 맞추고,
cursor_mobile_kit_builder_prompt.md의 3단계 마법사 안은 폐기하고 이 문서의
바텀시트 방식(9번)으로 대체해줘.

핵심 원칙:
1. Competency/Question에 ownerScope(PLATFORM/ORG/DEMO)/organizationId/
   forkedFromId/createdByUserId를 추가하고, Competency.code의 전역 unique
   제약을 @@unique([organizationId, code])로 바꿔줘. 이때 코드베이스 전체에서
   code만으로 역량을 조회하는 곳(prisma.competency.findUnique/findFirst by
   code)을 다 찾아서 PLATFORM 항목을 의도한 곳은 organizationId: null을
   명시하도록 고쳐줘 — 이게 제일 위험한 부분이니 신중하게 확인해.
2. DemoCompetency/DemoQuestion은 이번에 통합하지 마 — ContentOwnerScope에
   DEMO 값만 추가해두고, 실제 테이블 통합/데이터 마이그레이션은 후속 배치로
   docs/STATUS.md에 남겨줘.
3. 승격(promote) API는 merge_into_base(기존 기본 항목 덮어쓰기)와
   promote_as_new_base(신규 기본으로 복제) 두 모드로 구현하고, 역량 단위뿐
   아니라 문항 단위로도 가능하게 해줘.
4. 새 capability는 tenant.custom_competency 하나만 추가해서 ORG_ADMIN에
   부여해줘.
5. 모바일은 역량 목록(마스터)에서 탭해서 담고, 문항 편집은 별도 풀스크린
   시트로 열리는 구조로 만들어줘.

스키마 변경이 크니 npx prisma migrate dev 실행 후 기존 데이터 영향 없는지
확인하고, npm run build 확인 후 docs/STATUS.md에 정리해줘.
```
