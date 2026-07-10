# 통합 콘텐츠 CMS(역량·문항·설문) — 커서용 스크립트

## 방향 요약

`/admin/content` + `CONTENT_ADMIN` 역할(`platform.content` capability)이 이미
"역량·문항·루브릭 CMS 운영" 목적으로 존재 — 새 메뉴/권한 체계는 필요 없고, 이
페이지 안의 콘텐츠 타입을 확장하는 구조. 면접(IRT 문항뱅크) · 실제기출문항 ·
글로벌 역량사전(기존) · 설문(신규)을 한 CMS 셸 안에서 관리하고, 역량평가(AC)는
아직 미구현이니 자리만 비워둔다.

**설계 원칙**: 콘텐츠 타입마다 테이블을 따로 둔다(IRT 문항은 difficulty/
discrimination, 설문은 문항타입/옵션처럼 구조가 완전히 다름 — 억지로 하나의
폴리모픽 테이블에 합치지 않음). 대신 두 가지로 통일성을 준다: (1) 역량 참조는
전부 FK가 아니라 **문자열 코드 참조**(`Competency.code` 또는
`GlobalCompetency.code`) — 이미 코드베이스 전체에서 쓰는 패턴 그대로. (2) 기관이
콘텐츠를 골라 배포하는 "킷" 개념은 콘텐츠 타입별로 **병렬 구조의 별도 테이블**을
쓴다(`OrgInterviewKit`이 이미 이 패턴 — 기관+역량 단위로 문항 ID 배열을
선택해서 저장하는 구조). 억지로 하나의 메가 테이블에 합치지 않는다.

## 1. 신규: 설문(Survey) 모델군

```prisma
enum SurveyQuestionType {
  SINGLE_CHOICE
  MULTI_CHOICE
  SCALE   // 리커트 척도(1-5, 1-7 등)
  TEXT
}

enum SurveyAudience {
  CANDIDATE    // 개인 지원자/응시자
  ORG_MEMBER   // 기관 소속 구성원
  PUBLIC       // 비로그인 공개
}

model Survey {
  id          String         @id @default(cuid())
  title       String
  description String?        @db.Text
  audience    SurveyAudience @default(CANDIDATE)
  /** 자기평가형 설문이면 GlobalCompetency.code 참조(느슨한 문자열 참조) */
  linkedCompetencyCode String?
  /** null이면 플랫폼 공용, 있으면 기관 전용(맞춤 설문) */
  organizationId String?
  organization    Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  isActive        Boolean       @default(true)
  createdByUserId String?
  createdBy       User?         @relation("SurveyCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  createdAt       DateTime      @default(now())

  questions SurveyQuestion[]
  responses SurveyResponse[]

  @@index([organizationId])
  @@index([audience, isActive])
}

model SurveyQuestion {
  id          String             @id @default(cuid())
  surveyId    String
  survey      Survey             @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  sortOrder   Int                @default(0)
  type        SurveyQuestionType
  prompt      String             @db.Text
  /** SINGLE_CHOICE/MULTI_CHOICE 옵션: string[] */
  options     Json?
  /** SCALE 범위: { min, max, minLabel, maxLabel } */
  scaleConfig Json?
  isRequired  Boolean            @default(true)

  answers SurveyAnswer[]

  @@index([surveyId, sortOrder])
}

model SurveyResponse {
  id          String    @id @default(cuid())
  surveyId    String
  survey      Survey    @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  userId      String?   // PUBLIC 설문은 null 허용
  user        User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  submittedAt DateTime  @default(now())

  answers SurveyAnswer[]

  @@index([surveyId])
  @@index([userId])
}

model SurveyAnswer {
  id         String         @id @default(cuid())
  responseId String
  response   SurveyResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId String
  question   SurveyQuestion @relation(fields: [questionId], references: [id])
  /** 단일/다중 선택은 string[], SCALE은 number, TEXT는 string — 전부 Json으로 통일 저장 */
  value      Json

  @@unique([responseId, questionId])
}
```
`Organization.surveys Survey[]`, `User.surveysCreated Survey[] @relation("SurveyCreatedBy")` 관계 추가.

용도 메모(콘텐츠 작성 시 참고): 만족도/펄스 설문(`ORG_MEMBER`), 자기평가형
설문(`linkedCompetencyCode`로 Global 역량사전 연결 — 향후 자기평가/360 모듈의
입력 데이터가 됨), 응시 전 사전설문(`CANDIDATE`) 등 다목적으로 쓸 수 있게
설계돼 있음 — 특정 용도에 종속되지 않음.

## 2. 기존 콘텐츠 타입 CMS 커버리지 확인

- **`Question`**(IRT 면접 문항뱅크, `competencyId` FK → `Competency`) — 지금
  seed 파일로만 관리됨. 이번에 CRUD UI 추가.
- **`RealInterviewQuestion`**(실제기출, industry/jobRole/companySize 태그) —
  지금 seed 파일로만 관리됨. 이번에 CRUD UI 추가.
- **`GlobalCompetency`/`GlobalCompetencyCluster`/`GlobalCompetencyRubricLevel`/
  `GlobalCompetencyQuestion`** — 이미 `GlobalCompetencyDictionaryPanel`로 CMS
  UI 있음. 그대로 유지, 새로 만들 것 없음.
- **역량평가(AC) 과제** — 스키마도 아직 없음(별도 배치 예정). 이번엔 탭 자리만
  "준비 중"으로 비워둠.

## 3. CMS 화면 구조 — `/admin/content` 탭 재구성

```
/admin/content
├── 문항뱅크 (Question — NCS 6역량 IRT)         [신규 CRUD]
├── 실제기출문항 (RealInterviewQuestion)         [신규 CRUD]
├── 글로벌 역량사전 (GlobalCompetency 등)         [기존 패널 그대로]
├── 설문 (Survey)                                [신규 CRUD + 빌더]
└── 역량평가 과제 (AC) — "준비 중"                [placeholder만]
```
탭 전환은 클라이언트 상태(쿼리 파라미터 `?tab=`)로, 기존 페이지 셸 안에서
컴포넌트만 교체 — 새 라우트/새 권한 불필요(`platform.content` capability 하나로
전부 커버).

### 3-1. 문항뱅크 CRUD
- 목록: 역량/레벨 필터, 활성/비활성 토글.
- 생성/수정 폼: `template`, `level`(1-5), `difficulty`(b값 — 레벨별 기준표
  L1=-2.0~L5=+2.0 참고선 표시), `discrimination`, `rubricCriteria`,
  `followUpHints`.
- 미리보기: 실제 면접 화면과 동일한 스타일로 문항 렌더링(오타/줄바꿈 확인용).

### 3-2. 실제기출문항 CRUD
- 목록: industry/jobRole/companySize 필터.
- 생성/수정 폼: `questionText`, `industry`, `jobRole`, `companySize?`,
  `competency?`, `sourceName?`, `sourceUrl?`, `isAiExample`.

### 3-3. 설문 빌더
- Survey 생성(title/description/audience/linkedCompetencyCode/organizationId).
- 질문 추가/삭제/순서변경(드래그, 기존 `@dnd-kit` 재사용 — 이미 설치돼 있음),
  타입별(SINGLE_CHOICE/MULTI_CHOICE/SCALE/TEXT) 옵션 입력 폼.
- 응답 집계 화면(선택형은 막대그래프, SCALE은 평균, TEXT는 목록) — `recharts`
  재사용.

## 4. 설문 응답 수집 API (응시자/구성원용, CMS 밖)

- `GET /api/surveys/[id]` — 공개 설문 메타+문항 조회(PUBLIC/CANDIDATE는 로그인
  느슨하게, ORG_MEMBER는 소속 검증).
- `POST /api/surveys/[id]/respond` — `SurveyResponse`+`SurveyAnswer` 생성.
  `isRequired` 문항 누락 시 400.

## 5. "선발 패키지" 확장 — 새 메가 테이블 대신 병렬 구조

`OrgInterviewKit`은 `@@unique([organizationId, competency])`로 **기관+역량
단위 1행**에 `selectedQuestionIds`를 담는 구조라, 설문/AC를 여기 욱여넣지
않는다. 대신 그 패턴을 그대로 따라 하는 병렬 테이블을 나중에(설문/AC가 실제
운영 단계에 들어갈 때) 추가하는 걸 원칙으로 삼는다 — 예: `OrgSurveyAssignment
{ organizationId, surveyId, isActive }`. **이번 배치에서는 만들지 않음** —
설계 원칙만 문서화(이 파일과 `docs/STATUS.md`에).

## 원칙

- 새 capability/역할 불필요 — 기존 `platform.content`/`CONTENT_ADMIN` 그대로.
- 역량 참조는 전부 FK 아닌 문자열 코드(`Competency.code`/
  `GlobalCompetency.code`) — 두 역량 체계를 강제 병합하지 않는다(기존 결정
  유지).
- 콘텐츠 타입별 테이블은 분리 유지 — 폴리모픽 통합 금지.
- "선발 패키지"용 새 메가 테이블 만들지 않음 — `OrgInterviewKit`과 같은
  패턴의 병렬 테이블을 콘텐츠 타입이 실제로 필요해질 때 추가.
- AC 탭은 placeholder만 — 스키마/로직 추가 금지(별도 배치).
- 스키마 변경 있음(Survey 모델군 신규) — 마이그레이션 필요.
- 작업 끝나면 `npm run build` 확인, `docs/STATUS.md`에 CMS 구조·새 모델·CRUD
  라우트 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_content_cms_prompt.md)에 정리된 통합 콘텐츠 CMS를 구현해줘.

핵심 원칙:
1. 새 capability/역할 만들지 마 — 기존 platform.content / CONTENT_ADMIN을
   그대로 써.
2. Survey/SurveyQuestion/SurveyResponse/SurveyAnswer 모델을 문서에 정리된
   그대로 추가하고, 역량 참조는 linkedCompetencyCode처럼 문자열 코드로만(FK
   아님).
3. /admin/content 안에 탭 구조로 문항뱅크(Question CRUD)/실제기출문항
   (RealInterviewQuestion CRUD)/글로벌 역량사전(기존 그대로)/설문(Survey 빌더)
   을 넣고, 역량평가(AC) 탭은 "준비 중" placeholder만 넣어줘 — 실제 로직/스키마
   추가하지 마.
4. 설문 응답 수집은 CMS 밖 별도 API(/api/surveys/[id], /api/surveys/[id]/respond)
   로 분리해줘.
5. "선발 패키지" 통합용 새 메가 테이블은 만들지 마 — OrgInterviewKit과 같은
   패턴의 병렬 테이블은 설문/AC가 실제 운영 단계에 들어갈 때 추가한다는 원칙만
   docs/STATUS.md에 남겨줘.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md에 정리해줘.
```
