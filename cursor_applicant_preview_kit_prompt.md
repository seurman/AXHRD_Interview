# 지원자 프리뷰 킷(B2B 1단계) — 커서용 스크립트

## 방향 요약 + 차별화 포인트

기업이 서류 통과자에게 "우리 회사 스타일 모의면접"을 미리 연습시키는 상품.
채용 결정에 관여하지 않아 AI 기본법 고위험 분류 밖 — 순수 지원자 서비스.
`OrgInterviewKitShare` 인프라를 그대로 확장한다.

베이스 기능(화이트라벨 라이트, 대량 초대, 완료율 추적) 위에, **그리팅·마이다스인·
제네시스랩 같은 순수 B2B 툴은 구조적으로 못 하는 세 가지 차별화**를 얹는다 —
이 세 회사는 소비자(B2C) 접점이 없지만 우리는 이미 강한 개인 사용자 제품이
있다는 게 진짜 모트(moat)다:

1. **지원자풀 인사이트 리포트**(기업용) — 이미 만든 코호트 히트맵 집계 로직을
   캠페인(shareId) 단위로 재사용해서, "이번 지원자풀은 어떤 역량이 강하고
   약한지" 익명 집계로 기업에 제공. 순수 연습앱은 이런 집계 인사이트를 줄 수
   없음 — 우리만 코호트 분석 인프라를 이미 갖고 있어서 가능.
2. **탈락자 자산화** — 연습한 지원자가 계정을 만들면 그 리포트가 개인
   대시보드에도 남아서, 이 회사에 탈락하더라도 우리 B2C 사용자로 자연 전환됨.
   순수 B2B 툴(그리팅 등)은 소비자 제품이 없어서 이 루프를 못 만듦.
3. **참여 완료 배지**(점수 아님) — 지원자가 자소서/이력서에 붙일 수 있는
   "참여 완료" 배지. 점수나 등급은 절대 포함하지 않음(컴플라이언스 안전판 —
   평가 신호가 아니라 참여 사실만).

## 1. 스키마

```prisma
model OrgInterviewKitShare {
  // ...기존 필드...
  /** 화이트라벨 라이트 — 기업 로고/문구만, 완전 화이트라벨(도메인 분리)은 아님 */
  brandLogoUrl String?
  brandLabel   String?   // 예: "OO기업 지원자 전용 모의면접"

  invites KitShareInvite[]
}

enum KitInviteStatus {
  PENDING
  STARTED
  COMPLETED
}

/** 대량 초대 — 우리가 이메일을 발송하지 않는다. CSV/템플릿만 생성하고
 *  실제 발송은 기업 담당자가 자기 메일/ATS로 한다(메시지 발송 대행 금지 원칙 준수). */
model KitShareInvite {
  id            String            @id @default(cuid())
  shareId       String
  share         OrgInterviewKitShare @relation(fields: [shareId], references: [id], onDelete: Cascade)
  email         String
  name          String?
  /** 개인화된 URL 토큰 — /kit/[slug]?invite=personalToken */
  personalToken String            @unique
  status        KitInviteStatus   @default(PENDING)
  sessionId     String?           // 연결된 InterviewSession(완료 추적)
  createdAt     DateTime          @default(now())

  @@unique([shareId, email])
  @@index([shareId])
}
```

## 2. 대량 초대 — CSV 업로드 → 자료 생성 (발송은 기업이)

`POST /api/org/kit-share/[id]/invites`:
- body: CSV 파싱 결과 `{ email, name? }[]`.
- `KitShareInvite` bulk create, 각 행에 `personalToken` 생성(예: `crypto.randomUUID()` 앞 12자리).
- 응답: (a) 개인화 링크가 포함된 CSV 다운로드(기업이 자기 메일 발송 도구에
  merge-field로 넣게), (b) **복사용 이메일 템플릿**(제목/본문, `{{name}}`/
  `{{link}}` 플레이스홀더) — 화면에 "복사" 버튼.
- **우리는 이메일을 발송하지 않는다** — 이 API는 발송용 자료만 만든다.

`GET /kit/[slug]?invite=<personalToken>` 접속 시 `KitShareInvite.status`를
`STARTED`로, 세션 완료 시 `COMPLETED` + `sessionId` 연결로 갱신.

## 3. 완료율 추적 — 기존 코호트 퍼널 스크립트 보강

지난번 `cursor_org_cohort_analytics_prompt.md`의 `getCohortFunnel(organizationId,
{ shareId })`가 "시작→완료"만 계산했는데, 이제 `KitShareInvite` 덕분에
**"초대→시작→완료" 3단계 퍼널**이 완성된다. `getCohortFunnel`에 `shareId`가
있고 `KitShareInvite` 레코드가 존재하면 1단계로 "초대 인원"(`KitShareInvite`
count)을 추가하도록 확장.

## 4. 지원자풀 인사이트 리포트 (기업용, 신규)

`lib/org/kit-insight.ts`:
```ts
export async function getApplicantPoolInsight(shareId: string) {
  // getCompetencyHeatmap(organizationId, { shareIds: [shareId] })를 그대로 재사용
  // N < 5인 역량은 "표본 부족"으로 숨김 — 익명성 보호 최소 표본 원칙
}
```
- 완전히 새로 만들지 않고 지난번 코호트 히트맵 집계 함수를 캠페인 스코프로
  호출. **개인 식별 정보 전혀 없음** — 역량별 평균만.
- **표본수 5명 미만인 역량은 화면에서 숨김**(소수 인원이면 사실상 개인 식별
  가능해지는 프라이버시 리스크 방지) — 이 임계값은 상수로 빼서 조정 가능하게.
- 서술 요약(선택, 버튼 클릭 시): 기존 DeepSeek 코호트 인사이트 함수
  (`generateCohortInsightNarrative`)를 shareId 스코프로 재사용 — 새 LLM
  호출 패턴 추가 아님.

## 5. 참여 완료 배지 (점수 없음)

`components/kit/ParticipationBadge.tsx`(신규) — `/profile/certificate`의
비주얼 언어(더블 골드 보더 등)를 가볍게 재사용하되, 내용은 **"OO기업 지원자
프리뷰 모의면접 참여 완료"** + 완료일자만. **점수·레벨·백분위는 절대 포함하지
않음.** 하단에 명시 문구:
> "이 배지는 참여 사실만을 나타내며, 평가 결과나 채용 결정에 사용되는 점수를
> 포함하지 않습니다."

공유 가능(기존 `ShareLinkButton` 패턴 재사용), 이력서/자소서에 링크로 첨부
가능.

## 6. 탈락자 자산화 — B2C 연계

`kit/[slug]/start` 흐름(공유링크 세션 시작)에서:
- 게스트로도 계속 가능(진입장벽 유지)하되, 세션 완료 후 리포트 화면에 CTA
  추가: **"이 리포트, 내 개인 계정에도 저장해서 계속 보고 싶다면?"** →
  회원가입/로그인 연결. 이미 계정 있으면 자동 연결.
- 계정과 연결되면 이 세션이 개인 `/dashboard`(지난번 만든 강점/성장포인트
  Top 3 카드)에도 그대로 나타남 — 이 회사 지원 결과와 무관하게 개인 성장
  기록으로 남음. **탈락해도 우리 B2C 사용자로 자연 전환되는 루프**.

## 7. 화이트라벨 라이트 UI

`kit/[slug]/page.tsx`, `KitStartClient.tsx`: `share.brandLogoUrl`/
`brandLabel`이 있으면 AXHRD 로고 옆(대체 아님)에 기업 로고 + 문구 표시.
완전 화이트라벨(도메인 분리, AXHRD 브랜드 완전 은닉)은 이번 범위 밖.

## 8. 관리자 UI

`KitShareManager.tsx`에 추가:
- 브랜드 로고 URL/문구 입력.
- CSV 업로드 → 초대 생성 → 이메일 템플릿/CSV 다운로드.
- 초대 현황 테이블(이름/이메일/상태).
- "지원자풀 인사이트 보기" 버튼(4번).

## 원칙

- 이메일 발송은 우리가 하지 않는다 — 자료만 생성, 발송은 기업이.
- 지원자풀 인사이트는 표본 5명 미만이면 숨김(익명성 보호).
- 참여 배지는 점수/등급 절대 미포함 — 참여 사실만.
- B2C 연계는 선택적(옵트인) CTA로만, 강제 회원가입 아님.
- 완전 화이트라벨(도메인 분리)은 범위 밖 — 로고/문구 수준만.
- 스키마 변경 있음(`KitShareInvite` 신규, `OrgInterviewKitShare` 필드 추가) —
  마이그레이션 필요.
- 작업 끝나면 `npm run build` 확인, `docs/STATUS.md`에 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_applicant_preview_kit_prompt.md)에 정리된 "지원자 프리뷰
킷"(B2B 1단계) 기능을 구현해줘.

핵심 원칙:
1. 이메일은 우리가 발송하지 않아 — CSV/템플릿 생성까지만, 발송은 기업 담당자가.
2. 지원자풀 인사이트 리포트는 기존 코호트 히트맵 집계(getCompetencyHeatmap)를
   shareId 스코프로 재사용하고, 표본 5명 미만 역량은 화면에서 숨겨줘(익명성
   보호).
3. 참여 완료 배지는 점수/레벨/백분위를 절대 포함하지 마 — 참여 사실 + 날짜만,
   "채용 결정에 사용 안 됨" 문구 명시.
4. 탈락자 자산화 CTA는 선택적 옵트인이어야 해 — 강제 회원가입 아니야.
5. 화이트라벨은 로고+문구 수준만, 완전 도메인 분리는 하지 마.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md에 정리해줘.
```
