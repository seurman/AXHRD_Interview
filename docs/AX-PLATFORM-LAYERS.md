# AXHRD Platform Layers (AX-native, lightweight)

Salesforce Customer 360 다이어그램을 **복제하지 않는다.**  
목표는 동일한 **역할 분리**를, AX 시대 면접·역량 플랫폼에 맞게 **4단 + Trust**로 얇게 유지하는 것이다.

> AX = AI가 *부가기능*이 아니라 *운영 단위*인 제품.  
> 에이전트·모델·증거가 레이어 경계를 넘나들되, **의미(Meaning)** 와 **신뢰(Trust)** 없이 워크플로만 쌓지 않는다.

---

## 한 장 요약

```
┌──────────────────────────────────────────────────────────────┐
│  L1  Surfaces          사람·에이전트가 만나는 면              │
│      웹 / 앱 / 기관 SaaS / 데모 / (나중) API·MCP·봇           │
├──────────────────────────────────────────────────────────────┤
│  L2  Workflows         제품이 하는 일                          │
│      킷·세션·IRT·피드백·구독·코호트·공유 링크                 │
├──────────────────────────────────────────────────────────────┤
│  L3  Meaning ★         경쟁 우위 — 무엇이 역량·증거인가         │
│      온톨로지 · 루브릭 · 벤치마크 · 증거 그래프 (가볍게)       │
├──────────────────────────────────────────────────────────────┤
│  L4  Intelligence      모델·채점·개인화 — Meaning 위에서만 동작 │
│      Gemini / DeepSeek / IRT · 프롬프트 · mock 폴백           │
├──────────────────────────────────────────────────────────────┤
│  Trust (가로지름)      권한 · 감사 · PII · 채점 근거 · 거버넌스 │
└──────────────────────────────────────────────────────────────┘
         ▲
    Postgres가 시스템 오브 레코드.
    그래프 DB는 L3가 커질 때 선택적으로 붙인다 (지금 필수는 아님).
```

Salesforce의 Sales/Service/… 세로 기둥 대신, 우리는 **도메인 모듈**만 둔다:  
면접(IRT) · 자기발견 · 기관 킷 · 콘텐츠 CMS · 빌링.

---

## L1 — Surfaces (경험면)

| 지금 | 다음 (가볍게) |
|------|----------------|
| 학습자 웹 (`/interview`, `/discover`, `/profile`) | 모바일 PWA |
| 기관 SaaS (`/org/...`, 킷 빌더·공유) | 공개 API / MCP (킷·세션 읽기만 먼저) |
| 고객 데모 (`/admin/demo`, `/demo/[slug]`) | Slack/Teams 알림 봇 (세션 완료·코호트) |
| 플랫폼 콘솔 (`/admin/...`) | — |

**원칙:** Surface는 상태를 소유하지 않는다. Workflow + Meaning을 호출만 한다.

---

## L2 — Workflows (일)

제품 루프만 여기 둔다. “CRM 전체”를 흉내 내지 않는다.

| 워크플로 | 역할 | 현재 앵커 |
|----------|------|-----------|
| Interview loop | 시작 → 적응형 문항 → 채점 → θ → 리포트 | `InterviewSession`, IRT engine |
| Kit compose & share | 기관이 문항·루브릭 조립 → 링크로 배포 | `OrgInterviewKit`, `OrgInterviewKitShare` |
| Discover loop | 비채점 서사 → 강점/가치 프로필 | `SelfDiscovery*` |
| Content ops | NCS 문항·글로벌 사전·데모 샌드박스 | `/admin/content`, DemoWorkspace |
| Billing / seats | 개인 구독 · 기관 좌석 | `Subscription`, usage |

**원칙:** 새 화면을 만들기 전에 “어느 워크플로 상태 기계에 붙는가”를 먼저 적는다.

---

## L3 — Meaning ★ (의미 · 온톨로지)

AXHRD가 Salesforce식 일반 CRM보다 **깊게** 갈 수 있는 층.  
여기를 비우면 L2는 도구 모음이고, 채우면 플랫폼이 된다.

### 개념 노드 (v0)

| 노드 | 설명 | 지금 있는 것 |
|------|------|--------------|
| `CompetencyCluster` | 역량군 | `GlobalCompetencyCluster` |
| `Competency` | 측정/개발 단위 | IRT `Competency`(NCS 6) **\|** `GlobalCompetency`(20) — **아직 미연결** |
| `RubricLevel` | L1–L5 행동 기준 | `rubricByLevel`, `GlobalCompetencyRubricLevel` |
| `Question` | 관찰 프롬프트 | `Question` / `GlobalCompetencyQuestion` / Demo* |
| `BenchmarkRef` | 외부 프레임 교차 | `GlobalCompetencyBenchmarkRef` (UK CS 등) |
| `Evidence` | 답변·STAR·스냅샷 조각 | `ResponseRecord`, `UserTextRecord`, snapshots |
| `ProfileSignal` | 강점·가치·역량 신호 | `SelfDiscoveryProfile` |
| `RoleContext` | 직무·산업·규모 | `JobRole`, 산업 enum, company size |

### 관계 (엣지) — 논리 그래프 먼저

나중에 Neo4j/FalkorDB로 옮겨도 스키마가 안 바뀌게, **이름을 고정**한다.

| 엣지 | from → to | 의미 |
|------|-----------|------|
| `HAS_LEVEL` | Competency → RubricLevel | 숙련 정의 |
| `PROBES` | Question → Competency (+ level) | 문항이 무엇을 보나 |
| `ALIGNS_WITH` | Competency → BenchmarkRef | 외부 프레임 정렬 (복제 ≠ 동일시) |
| `MAPS_TO` | GlobalCompetency ↔ NCS Competency | **명시적·선택적** 브릿지 (자동 병합 금지) |
| `SUPPORTED_BY` | RubricLevel → Evidence | 채점/피드백 근거 |
| `SIGNALS` | ProfileSignal → Competency | 자기발견 → 면접 브릿지 |
| `CONTEXTUALIZES` | RoleContext → Competency/Question | 직무·산업 가중 |

### 저장 전략 (무거워지지 않게)

1. **지금:** Postgres = system of record. Meaning은 기존 테이블 + (필요 시) `ConceptRelation(fromId, toId, edgeType, meta)` 같은 **얇은 엣지 테이블**.
2. **다음:** 관리 UI에서 그래프 탐색 (역량 → 지표 → 문항 → 벤치마크).
3. **이후:** 다중 홉 추천·스킬트리·360 집계가 조인 지옥이 되면 **그래프 DB를 L3 읽기 전용/분석 쪽으로** 도입.  
   COMMERCIAL.md의 “선택 Neo4j”와 동일 노선.

**금지:** IRT NCS 풀과 Global 20을 테이블 하나로 합치지 않는다. `MAPS_TO`로만 잇는다.

---

## L4 — Intelligence (AX 실행면)

모델은 **Meaning의 소비자**이지, 진실의 원천이 아니다.

| 능력 | 규칙 |
|------|------|
| 채점 · 개인화 | 루브릭·Evidence를 컨텍스트로 넣고, 점수만 뱉게 하지 않음 |
| 리포트 | 세션당 제한 호출, mock 폴백 유지 |
| IRT | θ·문항 선택은 결정론 엔진 (LLM과 분리) |
| (나중) Agent | “다음 연습 추천”, “킷 초안” — L2 워크플로를 *제안*만, Trust 없이 자동 커밋 금지 |

비용 분리(Gemini 실시간 / DeepSeek 리포트 / IRT 엔진)는 ARCHITECTURE.md를 따른다.

---

## Trust — 모든 레이어를 가로지름

| 축 | 지금 | 강화 방향 |
|----|------|-----------|
| Identity & roles | platformRole, org role, 데모/콘텐츠 분리 | SSO (로드맵) |
| Access | page guards, API `require*Api` | 공개 킷 링크 스코프 명확화 |
| Audit | admin audit log | Meaning·킷 변경 감사 범위 확대 |
| Evidence trail | 루브릭 기준·답변 텍스트 | “왜 이 레벨인가”를 UI에 항상 노출 |
| Data | PIPA 고려, 벤더 분리 | 음성 보존 기간, 삭제 정책 (Phase 2) |

에이전트·MCP를 붙여도 **Trust를 우회하는 Surface는 두지 않는다.**

---

## Salesforce 매핑 (참고만)

| SF 레이어 | AXHRD |
|-----------|--------|
| Customer apps & agents | L1 Surfaces |
| Agentforce / Slack / Tableau 기둥 | L2 모듈 + (나중) 봇/인사이트 — **기둥 3개 복제 안 함** |
| Customer 360 apps | Interview / Discover / Org Kit / CMS |
| Data 360 + Knowledge Graph | **L3 Meaning** (우리의 차별 초점) |
| AI Trust Layer + 모델 나열 | L4 + Trust (모델은 교체 가능 부품) |

우리는 Sales Cloud를 만들지 않는다. **역량·증거·숙련 그래프**를 만든다.

---

## 구현 우선순위 (가볍게 유지)

| 순서 | 작업 | 레이어 | Done when |
|------|------|--------|-----------|
| 1 | 이 문서 = 팀 공통 지도 | — | ✅ STATUS/ARCH에 링크됨 |
| 2 | `MAPS_TO` 시드 (`seed/meaning-maps-to.json`) | L3 | ✅ 6×N 엣지 |
| 3 | `ConceptRelation` 테이블 + migrate | L3 | ✅ `20260709020000_add_meaning_concept_relation` |
| 4 | 시드 스크립트 `npm run db:seed:meaning` | L3 | ✅ MAPS_TO + MEMBER_OF/HAS_LEVEL/PROBES/ALIGNS_WITH |
| 5 | Admin API + UI (`/admin/content` Meaning 패널) | L3 | ✅ `/api/admin/meaning*` |
| 6 | 채점/피드백에 Evidence→Rubric 인용 강화 | L3↔L4 | 다음 |
| 7 | 그래프 DB PoC | L3 | 조인 대비 벤치 후 결정 |

### 로컬/운영 반영

```bash
cd web
npx prisma migrate deploy
npx prisma generate
npm run db:seed:global   # Global 20이 아직 없다면
npm run db:seed:meaning  # ConceptRelation 채우기
```

관리자: `/admin/content` → 하단 **온톨로지 · 개념 관계**.


---

## 비목표 (일부러 안 함)

- Salesforce 규모의 MCP·Experience·Industry 클라우드 전면 복제
- 당장 Neo4j 운영 필수화
- NCS IRT와 Global 사전 스키마 병합
- Trust 없는 “전부 자율 에이전트 HR”

---

## 관련 문서

- `docs/ARCHITECTURE.md` — 런타임·IRT·API 비용
- `docs/COMMERCIAL.md` — Postgres + 선택 그래프
- `docs/STATUS.md` — 글로벌 역량사전, 킷 공유 등 현재 구현
- `docs/ROADMAP.md` — Phase 타임라인
