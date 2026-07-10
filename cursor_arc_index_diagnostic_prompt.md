# ARC Index 조직진단 시스템 — 1단계 (커서용 스크립트)

## 방향 요약

기존 "설문(Survey)" CMS 모델(`SurveyQuestion` 등, SINGLE_CHOICE/SCALE/TEXT)로는 ARC Index를
못 담는다 — 이중응답(현재수준+중요도), 역코딩, 척도 타입 3종(동의/6개월전대비/속도),
지표 계층(Index→Subscale→Item), 가중합성(OAI), 팀 단위 롤업, 웨이브(종단) 비교가 전부
필요해서 **별도 도메인(`Diagnostic*`)으로 신설**한다. 기존 `Survey` 모델은 손대지 않는다 —
향후 ARC 외 다른 진단 도구도 이 `Diagnostic*` 인프라를 재사용할 수 있게 설계한다.

이번 1단계 범위: 문항뱅크 + 팀/웨이브 구조 + **결정론적** 스코어링(평균·가중합성·임계값
판정)까지만. 회귀(β)·OLS·HLM·LDA 같은 통계추정은 2~3단계(별도 스크립트, Python 서비스
필요)로 명시적으로 미룬다 — 이번엔 절대 손대지 않는다.

## 0. 원본 소스 문서 — 문항 텍스트는 반드시 여기서 그대로 옮길 것

`docs/arc-index/source/`에 5개 원본 문서의 텍스트 추출본을 넣어뒀다:
- `ARC_Index_산식표_통합설문지.md` — **산식 정의서(정본)**. 모든 계산식·역문항 목록·
  가중치·판정기준표가 여기 있다.
- `ARC_OHI_최종_v2.md`, `ARC_ORI_최종.md`, `ARC_OVI_최종.md`, `ARC_OAI_최종.md` —
  섹션별 정확한 문항 텍스트(정본, 260626 축약본보다 문항 수가 많음 — 이게 맞는 버전).

**시드 데이터 작성 시 이 5개 파일이 유일한 정본이다. 문항 텍스트를 의역·요약·생략하지
말고 그대로 옮겨 적을 것.** 애매하거나 문항 번호가 안 맞는 부분이 있으면 임의로 채우지
말고 코드 주석(`// TODO: 원장님 확인 필요 — ...`)으로 표시만 하고 넘어갈 것.

## 1. 스키마 — `Diagnostic*` 신규 도메인

```prisma
enum DiagnosticItemScaleType {
  AGREEMENT_5      // 전혀그렇지않다~매우그렇다 (기본)
  RETRO_CHANGE_5   // 6개월전 대비: 많이악화~크게개선 (OVI 섹션 기본)
  SPEED_5          // 매우느림~매우빠름 (CV01 전용 예외)
  OPEN_TEXT        // 주관식(_OE 문항)
}

enum DiagnosticResponseAxis {
  CURRENT      // 현재수준
  IMPORTANCE   // 중요도 (드라이버 10개 영역만 해당)
}

enum DiagnosticWaveStatus {
  DRAFT
  OPEN
  CLOSED
}

model DiagnosticInstrument {
  id               String   @id @default(cuid())
  code             String   @unique          // "ARC_INDEX"
  nameKo           String                    // "ARC Index — 통합 조직진단"
  version          String                    // "v1.0"
  estimatedMinutes Int?                      // 22
  minGroupSize     Int      @default(5)      // 익명보호 최소표본 — 우리 플랫폼 기존 원칙과 동일
  sections         DiagnosticSection[]
  waves            DiagnosticWave[]
  createdAt        DateTime @default(now())
}

model DiagnosticSection {
  id           String   @id @default(cuid())
  instrumentId String
  instrument   DiagnosticInstrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  code         String               // "OHI" | "ORI" | "OVI" | "OAI"
  nameKo       String
  order        Int
  subscales    DiagnosticSubscale[]

  @@unique([instrumentId, code])
}

model DiagnosticSubscale {
  id        String   @id @default(cuid())
  sectionId String
  section   DiagnosticSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  code      String             // "SE.E" | "SE.C" | "SE.F" | "BO" | "TL.TR" | "TL.GF" | "TL.PS"
                                // | "SL" | "SV" | "PS" | "C" | "EM" | "PM" | "LG" | "CI" | "WE"
                                // | "CD" | "LA" | "AXS" | "AXC" | "AXA" | "AXG"
                                // | "HV" | "CV" | "AV" | "SA" | "EA" | "OA"
  nameKo    String
  weight    Float?             // OAI만 사용: SA=0.40 EA=0.35 OA=0.25, 나머지는 null(단순평균)
  isDriver  Boolean  @default(false)  // OHI 10개 드라이버 영역(SE 제외 9개) — 이중응답 대상
  order     Int
  items     DiagnosticItem[]

  @@unique([sectionId, code])
}

model DiagnosticItem {
  id                String   @id @default(cuid())
  subscaleId        String
  subscale          DiagnosticSubscale @relation(fields: [subscaleId], references: [id], onDelete: Cascade)
  itemCode          String              // "E01", "PS03", "SE_OE", "DM01" ...
  textKo            String
  scaleType         DiagnosticItemScaleType @default(AGREEMENT_5)
  scaleLabels       Json?               // 커스텀 라벨 override, 없으면 scaleType 기본 라벨 사용
  hasImportanceAxis Boolean  @default(false)  // true면 현재수준+중요도 동시 응답
  isReversed        Boolean  @default(false)  // ★ 역문항 — 집계 시 6-원값
  isDemographic     Boolean  @default(false)  // DM01~05
  choiceOptions     Json?               // 인구통계 문항의 선택지(예: DM01 직급 구간)
  order             Int
  answers           DiagnosticAnswer[]

  @@unique([subscaleId, itemCode])
}

model DiagnosticWave {
  id             String   @id @default(cuid())
  instrumentId   String
  instrument     DiagnosticInstrument @relation(fields: [instrumentId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  waveNumber     Int
  label          String?             // "2026 상반기 조직진단"
  status         DiagnosticWaveStatus @default(DRAFT)
  opensAt        DateTime?
  closesAt       DateTime?
  teams          DiagnosticTeam[]
  responses      DiagnosticResponse[]
  createdAt      DateTime @default(now())

  @@unique([organizationId, instrumentId, waveNumber])
  @@index([organizationId])
}

model DiagnosticTeam {
  id         String   @id @default(cuid())
  waveId     String
  wave       DiagnosticWave @relation(fields: [waveId], references: [id], onDelete: Cascade)
  name       String              // "전략기획팀"
  department String?             // DM03류 참고용 카테고리(선택)
  slug       String              // 응답 링크용 — /diagnosis/w/[waveSlug]/t/[slug]
  responses  DiagnosticResponse[]

  @@unique([waveId, slug])
}

model DiagnosticResponse {
  id              String   @id @default(cuid())
  waveId          String
  wave            DiagnosticWave @relation(fields: [waveId], references: [id], onDelete: Cascade)
  teamId          String?
  team            DiagnosticTeam? @relation(fields: [teamId], references: [id])
  respondentToken String   @unique     // 익명 토큰 — User 연동 없음, 재접속용(쿠키/로컬스토리지)
  demographics    Json?                // { DM01: "...", DM02: "...", ... }
  consentAt       DateTime?
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  answers         DiagnosticAnswer[]

  @@index([waveId])
  @@index([teamId])
}

model DiagnosticAnswer {
  id           String   @id @default(cuid())
  responseId   String
  response     DiagnosticResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  itemId       String
  item         DiagnosticItem @relation(fields: [itemId], references: [id])
  axis         DiagnosticResponseAxis @default(CURRENT)
  numericValue Int?      // 1~5, 원값 그대로 저장(역코딩은 조회 시점에 계산 — 원본 보존)
  textValue    String?   // 주관식(_OE)용

  @@unique([responseId, itemId, axis])
}
```

`Organization` 모델에 `diagnosticWaves DiagnosticWave[]` 역참조 추가. 그리고 **이 상품을
기본으로 켜지 않기 위해** `Organization.diagnosticEnabled Boolean @default(false)` 필드
추가(별도 SKU — 계약된 기관만 노출, 아래 4번 참고).

## 2. 시드 스크립트 — `web/prisma/seed/arc-index.ts`

`docs/arc-index/source/ARC_Index_산식표_통합설문지.md`를 기준으로 `DiagnosticInstrument`
(code: "ARC_INDEX", version: "v1.0") 생성 후, 4개 `DiagnosticSection`(OHI/ORI/OVI/OAI) →
각 `DiagnosticSubscale` → 각 `DiagnosticItem` 순으로 시드한다.

**필수 반영 사항 (산식표 기준, 임의 판단 금지):**
- 역문항 7개 `isReversed: true` — `PS03, EM03, CD04, SA04, EA03, EA06, OA02`
- OHI 드라이버 9개 영역(`SL,SV,PS,C,EM,PM,LG,CI,WE`)은 `DiagnosticSubscale.isDriver: true`,
  소속 문항은 `hasImportanceAxis: true`(SE/BO/TL/D는 단일응답, 이중응답 아님)
- OVI 섹션 전체 `scaleType: RETRO_CHANGE_5`, 단 `CV01`만 `scaleType: SPEED_5`
- OAI 서브스케일 가중치: `SA.weight=0.40`, `EA.weight=0.35`, `OA.weight=0.25`
- 인구통계 `DM01~DM05`는 별도 섹션 없이 `instrument` 최상위(예: `DiagnosticSection(code:"DM")`
  하나 두고 그 아래 subscale 없이 items로 취급하거나, subscale 없이 items를 바로 items에
  넣을 수 있게 스키마상 subscaleId를 nullable로 바꿔도 됨 — 커서 재량으로 처리하되
  `isDemographic: true`는 반드시 표시)
- OHI 최종본(v2)은 260626 축약본과 문항 수가 다르다(WE 3문항, D01/D02 신규 등) —
  **v2가 정본**이니 v2 기준으로 시드.

## 3. 조직 관리자 — 웨이브/팀 생성 + 응답 링크 발급 (발송은 하지 않음)

`POST /api/org/diagnosis/waves` — 웨이브 생성 + 팀 목록 일괄 등록.
`POST /api/org/diagnosis/waves/[id]/teams` — 팀 추가, 각 팀에 `slug` 자동 생성.

응답 링크는 `/diagnosis/w/[waveSlug]/t/[teamSlug]` 형태로 **팀당 1개**(개인별 아님 —
완전 익명 원칙 유지, `KitShareInvite`처럼 개인별 토큰을 두지 않는다). 관리자 화면에서
팀별 링크 목록을 CSV로 내려받거나 복사할 수 있게 한다.

**우리는 이 링크를 발송하지 않는다** — 기존 원칙(`메시지 발송은 우리가 하지 않는다`)
그대로. 관리자가 사내 메신저/메일로 직접 배포.

## 4. 응답 수집 — `/diagnosis/w/[waveSlug]/t/[teamSlug]`

- 비로그인, 계정 연동 없음. 최초 접속 시 `respondentToken` 발급 → 쿠키에 저장(재접속 시
  이어서 응답 가능).
- 상단에 익명 안내 고정 노출: "완전 익명 · 5명 미만 집단은 결과를 보고하지 않습니다 ·
  개인 평가·인사에 활용되지 않습니다."
- 문항 렌더링: `scaleType`별 라벨 분기(`AGREEMENT_5`/`RETRO_CHANGE_5`/`SPEED_5`),
  `hasImportanceAxis`면 [현재수준]/[중요도] 두 줄 라디오 동시 노출, `OPEN_TEXT`는
  서술형 textarea.
- DM01~05는 최초 진입 시 한 번만.
- 제출 시 `submittedAt` 기록, `consentAt`은 별도 동의 체크박스(문구는 기존
  `cursor_freemium_data_flywheel_prompt.md`의 F-1과 동일하게 **초안이며 법무 검토
  필요**로 `docs/STATUS.md`에 명시).

## 5. 결정론적 스코어링 엔진 — `lib/diagnostic/arc-scoring.ts`

산식표 그대로 구현. 통계추정(β/OLS/HLM/LDA)은 **포함하지 않는다** — 아래 함수만.

```ts
// 공통 유틸
function reverseCode(v: number) { return 6 - v; }
function rawValue(item: DiagnosticItem, v: number) {
  return item.isReversed ? reverseCode(v) : v;
}
function average(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// OHI
function computeSE(answers) {
  const E = average(pick(answers, ["E01","E02","E03"]));
  const C = average(pick(answers, ["C01","C02","C03"]));
  const F = average(pick(answers, ["F01","F02"]));
  const SE = average([E, C, F].filter(v => v != null));
  return { E, C, F, SE };
}
function computeBO(answers) {
  return average(pick(answers, ["BO01","BO02","BO03"]));
}
function computeTL(answers) {
  const trust = average(pick(answers, ["TL01","TL02"]));
  const growth = average(pick(answers, ["TL03","TL04"]));
  const safety = average(pick(answers, ["TL05","TL06"]));
  const TL = average(pick(answers, ["TL01","TL02","TL03","TL04","TL05","TL06"]));
  return { trust, growth, safety, TL };
}
function computeDriverAreas(answers) {
  // SL,SV,PS,C,EM,PM,LG,CI,WE 각각 { current: avg(현재수준, 역코딩 적용), importance: avg(중요도) }
  // PS: AVERAGE(PS01,PS02,PS03_R) / EM: AVERAGE(EM01,EM02,EM03_R)
}
function computeOhiOverall(SE, drivers9) {
  // AVERAGE(SE, SL, SV, PS, C, EM, PM, LG, CI, WE) — SE 포함 10개 항
  return average([SE, ...Object.values(drivers9).map(d => d.current)]);
}
function computeRiskIndex(C03raw, Eavg, ovi_HV) {
  // (C03<=2?1:0)*0.4 + (Eavg<=2.5?1:0)*0.3 + (ovi_HV<2.5?1:0)*0.3
  // ⚠ OVI의 HV값이 필요 — 반드시 OVI 계산 이후 후처리 단계에서 호출
}

// ORI
function computeOri(answers) {
  const CD = average(pick(answers, ["CD01","CD02","CD03","CD04_R","CD05"]));
  const LA = average(pick(answers, ["LA01","LA02","LA03","LA04"]));
  const AXS = average(pick(answers, ["AXS01","AXS02","AXS03","AXS04"]));
  const AXC = average(pick(answers, ["AXC01","AXC02","AXC03","AXC04"]));
  const ORI = average([CD, LA, AXS, AXC]);
  return { CD, LA, AXS, AXC, ORI };
}
function computeOpportunityScore(answers) {
  const AXA = average(pick(answers, ["AXA01","AXA02"]));
  const AXG = average(pick(answers, ["AXG01","AXG02"]));
  const oppScore = AXA - AXG;
  // 밴딩: ≥1.0 / 0.1~0.9 / ≈0 / 음수 — 산식표 3-2 표 그대로 매핑해 처방 문구 반환
  return { AXA, AXG, oppScore, band: bandOpportunityScore(oppScore) };
}
function computeAxMaturityStage(inputs) {
  // 산식표 3-3 표: CD02·AXA01/AXC01·AXS01~04·AXG01+02·ORI범위·(5단계는 OVI AV 참조)
  // ⚠ 5단계 판별에 OVI AV값 필요 — 후처리 단계에서 호출
}

// OVI (6개월전 대비 회고 척도)
function computeOvi(answers) {
  const HV = average(pick(answers, ["HV01","HV02","HV03","HV05"])); // HV04는 260626판 기준 HV03에 통합 — 최종본 기준이면 HV04 별도 포함
  const CV = average(pick(answers, ["CV01","CV02","CV03","CV04","CV05"]));
  const AV = average(pick(answers, ["AV01","AV02","AV03","AV04","AV05"]));
  const OVI = average([HV, CV, AV]);
  return { HV, CV, AV, OVI };
}
function computeDynamicCongruenceGap(AV, HV) {
  return AV - HV; // 양수: AX가 건강보다 빠름(번아웃 위험) / 음수: 건강이 AX보다 빠름(가속 기회)
}
function computeWaveDelta(currentAvg, previousAvg) {
  return previousAvg == null ? null : currentAvg - previousAvg;
}

// OAI (가중합성)
function computeOai(answers) {
  const SA = average(pick(answers, ["SA01","SA02","SA03","SA04_R","SA05","SA06"]));
  const EA = average(pick(answers, ["EA01","EA02","EA03_R","EA04","EA05","EA06_R"]));
  const OA = average(pick(answers, ["OA01","OA02_R","OA03","OA04","OA05","OA06"]));
  const OAI = SA * 0.40 + EA * 0.35 + OA * 0.25;
  return { SA, EA, OA, OAI, band: bandOai(OAI) };
}
function computeOaiPattern(OHI, ORI, OVI, OAI) {
  // 산식표 5-3 표: 빠른오류/건강한표류/느리지만정확/이상적조직 — 임계값 그대로 if/else
}

// 팀 단위 (5~14개 팀 한정 — 15개 이상은 회귀분석 필요, 2단계로 명시적 보류)
function computeTeamGapMatrix(teams: { teamId, ORI, OVI, OHI_SE, OAI }[]) {
  if (teams.length >= 15) {
    return { mode: "OLS_REQUIRED", note: "팀 15개 이상 — OLS 회귀+잔차분석 필요(2단계 통계엔진 대상, 이번 단계 미구현)" };
  }
  const xBase = average(teams.map(t => t.ORI));
  const yBase = average(teams.map(t => t.OVI));
  return {
    mode: "GAP_MATRIX",
    teams: teams.map(t => {
      const gap = t.ORI - t.OVI;
      const quadrant =
        t.ORI >= xBase && t.OVI >= yBase ? "IDEAL" :
        t.ORI <  xBase && t.OVI >= yBase ? "POSITIVE_GAP" :   // OHI로 Crash/Super-Star 세분
        t.ORI <  xBase && t.OVI <  yBase ? "CRISIS" :
        "NEGATIVE_GAP";                                        // OHI로 Apathy/Cartel 세분
      return { ...t, gap, gapSquared: gap * gap, quadrant };
    }).sort((a, b) => b.gapSquared - a.gapSquared),
  };
}
```

집계 진입점:

```ts
export async function computeAggregateScores(scope: { waveId: string; teamId?: string }) {
  // teamId 있으면 해당 팀 응답만, 없으면 웨이브 전체(조직 종합)
  // N < instrument.minGroupSize(기본 5)면 { hidden: true } 반환 — 화면에서 "표본 부족" 처리
  // OHI → OVI → (Risk Index, AX성숙도5단계, OAI패턴)순으로 계산 — cross-reference 의존성 순서 지킬 것
}
```

**중요**: Risk Index, AX 성숙도 5단계, OAI 4축 패턴판정은 다른 섹션(OVI) 값에 의존한다
(산식표에 명시됨). 반드시 OHI·ORI·OVI를 먼저 각각 계산한 뒤 후처리 단계에서 이 셋을
계산할 것 — 순서를 지키지 않으면 null 참조 에러 남.

## 6. 대시보드 UI — `/org/diagnosis/waves/[waveId]`

이번 단계는 **평균/판정 기반**만 렌더링. 회귀·군집·인과체인 카드는 다음 단계.

- **종합 탭**: OHI/ORI/OVI/OAI 4개 카드(값+판정 라벨), 4축 레이더 차트(recharts 기존
  `CompetencyDashboard.tsx` 패턴 재사용), 드라이버 10개 영역 막대(현재수준 vs 중요도
  나란히), Risk Index %, Opportunity Score + 밴딩 처방 문구, AX 성숙도 단계.
- **팀 탭**: 팀 목록(탭 전환), 팀별 카드(N<5면 "표본 부족"으로 숨김), 팀간 비교 막대
  (전사 평균 대비 ▲▼ 표시), 5~14팀이면 Gap 매트릭스 사분면 산점도(recharts
  ScatterChart), 15팀 이상이면 "회귀분석 기반 리포트는 2단계에서 제공 예정" 안내만.
- 강점/개선 카드: 산식표 판정기준표(건강등급 ≥4.5 탁월/3.5~4.4 양호/2.5~3.4 보통/<2.5
  주의 등)를 그대로 매핑한 **템플릿 문구**(LLM 호출 없음, 이번 단계 비용 0).

## 7. Nav/IA 통합 — 형제 레벨 신설, 채용 메뉴 하위 아님

`lib/platform/capabilities.ts`: `ORG_ADMIN`에 `tenant.diagnostic` capability 추가하되,
**`Organization.diagnosticEnabled`가 true인 조직에만 노출**(전체 기관 기본 노출 아님 —
별도 계약 SKU 성격).

`lib/platform/nav-registry.ts`: `SaasNavConfig`에 "조직진단" 항목을 `tenant.cohort`/
`tenant.interview_kit`과 **형제 레벨**로 신설(채용 서브메뉴에 끼워넣지 않음), 라우트는
`/org/diagnosis`로 완전히 분리된 네임스페이스.

`AdminSectionKey`에 `"diagnostic"` 신규 — 수퍼어드민이 `DiagnosticInstrument`/문항뱅크
편집, 전체 기관의 웨이브 현황을 볼 수 있는 `/admin/diagnostic` 페이지.

홈페이지(`app/page.tsx` 또는 랜딩): 상단 nav에 "조직진단" 탭 신설(공개 소개 페이지,
`/diagnosis` 마케팅 랜딩 — ARC Index 소개, 문의 CTA). 실제 응답·리포트는 로그인 후 조직
컨텍스트 안에서만 접근(위 org nav).

## 원칙

- 이번 단계는 결정론적 평균/가중합성/임계값 판정까지만. 회귀(β)·OLS·HLM·LDA는 절대
  이번에 구현하지 않는다 — `docs/STATUS.md`에 "2~3단계 별도 스크립트, Python 통계 서비스
  필요"로 명시.
- 문항 텍스트는 `docs/arc-index/source/*.md` 정본 그대로 옮긴다 — 의역·요약 금지.
- 응답은 완전 익명(User 미연동), 팀 소속만 링크 슬러그로 구분.
- N < 5(minGroupSize) 집단은 어떤 화면에서도 결과를 보여주지 않는다.
- 진단 상품은 기관별 `diagnosticEnabled` 플래그로 기본 비활성 — 계약된 기관만 노출.
- 응답 링크 발송은 우리가 하지 않는다 — 팀별 링크 CSV/복사까지만 제공.
- 데이터 활용 동의 문구는 초안이며 법무 검토 전 그대로 배포하지 않는다.
- 기존 `Survey`/`SurveyQuestion` 모델은 건드리지 않는다 — 완전히 별도 도메인.
- 스키마 변경 있음 — 마이그레이션 필요.
- 작업 끝나면 `npm run build` 확인, `docs/STATUS.md`에 정리(특히 통계추정 레이어가
  "다음 단계"임을 명시).

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_arc_index_diagnostic_prompt.md)에 정리된 ARC Index 조직진단 시스템
1단계를 구현해줘.

핵심 원칙:
1. docs/arc-index/source/ 안의 5개 원본 문서(산식표 + OHI/ORI/OVI/OAI 최종본)가
   문항 텍스트·산식의 유일한 정본이야. 문항을 의역하거나 생략하지 말고 그대로 옮겨줘.
   애매한 부분은 임의로 채우지 말고 TODO 주석만 남겨.
2. 기존 Survey/SurveyQuestion 모델은 건드리지 마. 완전히 별도의 Diagnostic* 도메인으로
   새로 만들어줘.
3. 이번 단계는 결정론적 계산(평균·가중합성·임계값 판정)까지만이야. 회귀분석(β)·OLS·
   HLM·LDA 같은 통계추정은 절대 구현하지 마 — docs/STATUS.md에 "다음 단계"로 남겨.
4. Risk Index, AX 성숙도 5단계, OAI 4축 패턴판정은 OVI 값에 의존해. 반드시 OHI→ORI→OVI
   순으로 계산한 뒤 후처리로 이 셋을 계산해줘 — 순서 지켜.
5. 응답은 완전 익명이야. User 모델과 연동하지 말고, 팀별 응답 링크(슬러그)로만 구분해줘.
   개인별 초대 토큰은 만들지 마.
6. N < 5(minGroupSize)인 집단/팀은 어떤 화면에서도 결과를 보여주지 마.
7. Organization.diagnosticEnabled 플래그로 이 기능을 기본 비활성으로 해줘 — 계약된
   기관만 켜지는 구조야.
8. nav는 기존 채용 관리 메뉴 하위가 아니라 형제 레벨로 "조직진단"을 새로 만들어줘
   (SaasNavConfig + tenant.diagnostic capability). 수퍼어드민 nav에도 "diagnostic"
   섹션 신설하고, 홈페이지에도 별도 "조직진단" 소개 탭 추가해줘.
9. 응답 링크는 우리가 발송하지 않아 — 관리자가 CSV/복사로 직접 배포하는 구조로만 만들어줘.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md에 정리해줘.
```
