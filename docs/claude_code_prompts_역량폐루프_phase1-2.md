# Claude Code 구현 프롬프트 — 역량 폐루프 Phase 1·2

D:\HR_IN_Solution 폴더에서 `claude` 실행 후, 아래 두 프롬프트를 각각 새 세션(또는 완료 후 이어서)에 그대로 붙여넣으세요. Phase 1을 먼저 완료하고 커밋한 뒤 Phase 2를 진행하는 것을 권장합니다(Phase 2가 Phase 1의 ConceptRelation을 전제로 함).

---

## 프롬프트 #1 — 공통 역량 온톨로지 확장 (조직진단 ↔ 면접 역량 연결)

```
우리는 조직진단(ARC Index, Diagnostic* 모델)과 면접(Interview, Competency/Question 모델)이라는
두 제품을 갖고 있는데, 지금은 두 도메인이 스키마상 완전히 분리되어 있다. 이 둘을 docs/AX-PLATFORM-LAYERS.md에
정의된 L3 Meaning 레이어(ConceptRelation 얇은 엣지 테이블)로 연결하고 싶다. 목표는 "조직진단의 어떤
드라이버(예: 심리적 안전, 협업)가 면접의 어떤 역량 코드(Competency.code)와 대응하는가"를 데이터로
표현하는 것이다. 이번 작업은 온톨로지 연결 자체만 만드는 것이고, 이걸 실제로 활용하는 추천 기능은
다음 단계에서 별도로 진행한다.

시작하기 전에 반드시 다음을 먼저 읽고 파악해라:
1. docs/AX-PLATFORM-LAYERS.md 전체 — 특히 "L3 Meaning" 절의 개념 노드 표(ConceptNodeKind)와
   엣지 표(ConceptEdgeType), "저장 전략"과 "금지" 절. 이름을 고정해서 쓰는 원칙을 지켜야 한다.
2. web/prisma/schema.prisma 에서 ConceptNodeKind, ConceptEdgeType enum과 ConceptRelation 모델 정의.
3. web/prisma/seed-meaning-layer.ts 와 web/seed/meaning-maps-to.json — 기존에 MAPS_TO 엣지를
   시드하는 방식(이 패턴을 그대로 따라간다).
4. web/prisma/schema.prisma 에서 DiagnosticInstrument/DiagnosticSection/DiagnosticSubscale/
   DiagnosticItem 모델 구조, 그리고 web/prisma/seed/arc-index-data.ts 에서 실제 섹션/서브스케일
   code 값이 어떻게 들어가는지(예: SE.C, TL, PS, EM, CM 등 — docs/arc-index/source/*.md 문서와
   대조해 정확한 코드 목록을 직접 확인해라, 추측하지 마라).
5. web/prisma/schema.prisma 에서 Competency 모델과 현재 실제 존재하는 NCS Competency.code 값들
   (seed 데이터 또는 DB 조회로 확인 — 마찬가지로 추측 금지).
6. web/src/app/api/admin/meaning/route.ts 와 node/[kind]/[key]/route.ts — 기존 온톨로지 조회 API.
7. /admin/content 페이지에서 "온톨로지 · 개념 관계" 패널을 렌더링하는 컴포넌트.

구현할 것:
1. schema.prisma의 ConceptNodeKind enum에 DIAGNOSTIC_SUBSCALE 값을 추가한다(DiagnosticItem 단위가
   아니라 Subscale/드라이버 단위로 연결 — ARC scoring의 드라이버 분석과 granularity를 맞춘다).
   ConceptEdgeType은 기존 값 중 의미가 맞는 것을 우선 재사용하되(SIGNALS가 "ProfileSignal → Competency"
   용도로 이미 있으니 이걸 재사용할지, 아니면 의미가 다르다고 판단되면 신규 타입을 추가할지 직접
   판단하고 그 이유를 커밋 메시지와 docs/AX-PLATFORM-LAYERS.md에 남겨라.
2. 마이그레이션 생성: npx prisma migrate dev --name add_diagnostic_subscale_concept_node
   (이 세션 환경에 따라 Prisma 엔진 다운로드가 막힐 수 있다 — 안 되면 마이그레이션 SQL을 손으로
   작성해라. 기존 web/prisma/migrations 폴더의 손으로 쓴 마이그레이션 예시들을 참고해 형식을 맞춰라)
3. 신규 시드 파일 seed/meaning-diagnostic-signals.json — 조직진단 서브스케일 code → Competency code
   매핑 목록. 예를 들어 PS(심리적 안전)나 TL(팀리더십)이 면접의 어떤 역량과 연결되는지는 4번에서
   확인한 실제 코드 목록을 갖고 네가 직접 합리적으로 매핑안을 짜되, 억지로 모든 서브스케일을
   연결하지 말고 개념적으로 확실한 것만 연결해라(빈 매핑도 괜찮다).
4. seed-meaning-layer.ts를 확장해 이 신규 JSON을 읽어 ConceptRelation 레코드를 생성하도록 한다.
   기존 MAPS_TO 시드 로직과 동일한 스타일(멱등 upsert)로 작성해라.
5. /admin/content의 온톨로지 패널이 DIAGNOSTIC_SUBSCALE 노드도 필터/조회할 수 있도록 최소한으로
   확장한다(새 UI를 통째로 새로 만들지 말고 기존 컴포넌트의 kind 목록에 추가하는 선에서).
6. docs/AX-PLATFORM-LAYERS.md의 "개념 노드(v0)" 표와 "구현 우선순위" 표를 이번 변경 내용으로
   갱신한다(이 문서가 팀 공통 지도이므로 반드시 최신화).
7. docs/STATUS.md 최상단에 이번 세션 작업 요약을 기존 포맷(다른 항목들처럼 "최근 작업 — ..." 절)에
   맞춰 추가하고, 로컬에서 실행해야 할 검증 명령(npx prisma migrate deploy, npx prisma generate,
   npm run db:seed:meaning, npx tsc --noEmit)을 명시해라.

제약:
- 기존 MAPS_TO 엣지나 기존 Competency/Question 데이터를 건드리지 마라 — 순수 추가(additive)만.
- LLM을 이 파이프라인에 넣지 마라. 순수 데이터 매핑이다.
- 이 세션에서 npx prisma migrate dev / npx tsc --noEmit / npm test를 못 돌리면(권한/네트워크 문제)
  그 사실과 로컬에서 실행해야 할 정확한 명령어를 최종 요약에 명시해라.

완료 기준: 신규 마이그레이션 파일, meaning-diagnostic-signals.json, 갱신된 seed-meaning-layer.ts,
갱신된 /admin/content 온톨로지 패널, 갱신된 AX-PLATFORM-LAYERS.md/STATUS.md. 마지막에 무엇을
매핑했고 무엇을 의도적으로 매핑하지 않았는지 요약해줘.
```

---

## 프롬프트 #2 — Gap-to-Hire 추천 (조직진단 결과 → 면접 킷 역량 가중치 추천)

```
프롬프트 #1에서 만든 ConceptRelation(조직진단 서브스케일 ↔ Competency)을 활용해, "이 조직의 조직진단
결과에서 부족한 것으로 나온 드라이버가, 면접 인터뷰 킷(OrgInterviewKit)에서 어떤 역량 문항 비중을
높여야 하는지"를 관리자에게 추천해주는 기능을 만들고 싶다. 이게 우리 제품의 핵심 차별화 기능
"Gap-to-Hire"다.

시작하기 전에 반드시 다음을 먼저 읽고 파악해라:
1. web/src/lib/diagnostic/arc-scoring.ts 의 computeDriverImportance() — 드라이버별
   { code, current, beta, priority: "FOCUS" | "MAINTAIN" | null } 를 반환한다. priority가
   "FOCUS"인 항목이 "중요도는 높은데 현재 점수가 낮은" 개선 우선순위 드라이버다. insufficientData
   가드(표본 부족 시 계산 안 함) 로직도 같이 확인해라.
2. web/src/lib/diagnostic/aggregate.ts 의 computeAggregateScores() — 이 함수가
   computeDriverImportance()를 어떻게 호출하고 결과를 어디에 담아 리턴하는지.
3. web/src/lib/diagnostic/prescription.ts 의 buildPrescriptions() — 우리가 이미 "의도적으로 LLM을
   쓰지 않고 결정론적 규칙 기반"으로 처방을 만드는 패턴을 갖고 있다. 이번 기능도 이 원칙(감사
   가능성 우선, LLM 미사용)을 그대로 따라야 한다.
4. web/prisma/schema.prisma 의 OrgInterviewKit 모델 — selectedQuestionIds(Json), 
   customRubricCriteria(Json), competency(String, Competency.code) 필드 구조.
5. web/src/app/org/settings/interview-kit/page.tsx 와
   web/src/app/admin/organizations/[id]/interview-kit/page.tsx — 인터뷰 킷을 편집하는 기존
   화면·API. 이 화면이 지금 어떤 API를 호출해 킷 목록/편집을 하는지 확인해라.
6. Organization 모델의 diagnosticEnabled, interviewEnabled 플래그 — 이번 기능은 이 둘이 모두
   true인 기관에서만 노출되어야 한다.
7. 프롬프트 #1에서 만든 ConceptRelation 시드(DIAGNOSTIC_SUBSCALE ↔ Competency 매핑)가 실제로
   DB에 들어가 있는지 확인해라(없으면 먼저 시드 실행 필요).

구현할 것:
1. web/src/lib/diagnostic/ 아래에 신규 함수 getCompetencyGapRecommendations(organizationId: string)를
   만든다. 로직: 해당 기관의 가장 최근 완료된 DiagnosticWave에 대해 computeDriverImportance()
   결과를 가져와 priority === "FOCUS"인 드라이버 코드를 추출 → ConceptRelation에서 그 드라이버
   코드(DIAGNOSTIC_SUBSCALE)에 연결된 Competency 코드를 조회 → { competencyCode, driverCode,
   driverLabel, beta, current, rationale } 형태의 추천 리스트를 반환한다. insufficientData이거나
   매핑된 엣지가 없으면 빈 배열을 반환하고 그 이유를 함께 리턴해라(추천이 왜 없는지 UI에서
   설명할 수 있어야 한다).
2. 신규 API 라우트(기존 org 인터뷰킷 API와 같은 인증/권한 패턴을 그대로 따라서) — 예:
   GET /api/org/interview-kits/gap-recommendations — 로그인한 사용자의 조직에 대해 위 함수를
   호출해 반환. 권한 체크는 기존 인터뷰킷 편집 권한(ORG_ADMIN 등)과 동일하게 맞춰라.
3. 인터뷰 킷 편집 화면(org/settings/interview-kit)에 추천 배지/배너를 추가한다: 각 역량 카드
   옆에 "조직진단 결과 기반 추천 — {드라이버명} 개선 우선순위(β={beta}, 현재 {current}점)"
   같은 형태로 표시하고, 클릭하면 해당 역량의 문항 비중을 늘리도록 안내하는 정도로 충분하다
   (자동으로 selectedQuestionIds를 바꾸는 것까지는 이번 스코프에 넣지 마라 — 추천만 보여주고
   최종 반영은 관리자가 직접 하도록 한다. 자동화는 다음 단계).
4. diagnosticEnabled와 interviewEnabled가 둘 다 true가 아닌 기관에서는 이 UI/API가 아예
   노출되지 않도록 가드를 건다.
5. docs/STATUS.md에 이번 작업을 기존 포맷대로 요약 추가.

제약:
- LLM 호출을 쓰지 마라 — 순수 규칙/통계 기반이어야 한다(prescription.ts와 동일 원칙).
- computeDriverImportance()의 insufficientData 가드를 반드시 그대로 존중해라 — 표본이 적은
  조직에는 추천을 보여주지 말고 "표본 부족" 메시지를 보여줘라.
- 기존 인터뷰킷 저장/편집 로직은 건드리지 마라 — 이번 기능은 추천을 "보여주기"만 한다.
- npx tsc --noEmit / npm test를 이 세션에서 못 돌리면 로컬에서 실행할 명령을 최종 요약에
  명시해라.

완료 기준: getCompetencyGapRecommendations() 함수, 신규 API 라우트, 인터뷰킷 화면의 추천
배지 UI, 갱신된 docs/STATUS.md. 마지막에 실제 매핑이 하나도 없어서 추천이 안 나오는 조직이
있다면 그 케이스를 어떻게 처리했는지도 요약해줘.
```

---

## 실행 순서 메모

1. `claude` 실행 → 프롬프트 #1 붙여넣기 → 완료 후 `npx prisma migrate deploy && npx prisma generate && npm run db:seed:meaning` 로컬 실행 → git commit.
2. 같은 세션 또는 새 세션에서 프롬프트 #2 붙여넣기 → 완료 후 `npx tsc --noEmit && npm test` 로컬 실행 → 관리자 계정으로 `/org/settings/interview-kit`에서 추천 배지 수동 확인 → git commit.
3. 두 단계 모두 완료되면 이 세션(Cowork)으로 돌아와서 결과를 알려주시면, 3번(후보자 문화적합도 프리뷰) 프롬프트를 이어서 작성해 드릴 수 있습니다.
