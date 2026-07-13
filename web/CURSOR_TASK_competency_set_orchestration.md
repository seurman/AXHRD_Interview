# Cursor 작업 스펙 — 역량 세트 순차 진행 (세션 오케스트레이션)

## 배경

`SetupForm.tsx`(`src/app/interview/setup/SetupForm.tsx`)는 이미 아래까지 완료돼 있음(Claude가 구현, 코드 리뷰만 했고 로컬 실행 검증은 안 됨 — 이 작업 시작 전에 `npm run dev`로 먼저 한 번 클릭해서 확인해줘):

- 산업+직무를 고르면 `matchPersona()`가 페르소나를 매칭하고, 그 페르소나의 `focusCompetencies`(보통 3개, `src/lib/interview/persona-archetype.ts`)가 **역량 카드에 자동으로 체크**된다.
- 역량 카드는 이제 단일 선택이 아니라 **체크박스형 다중 선택**(`focusCompetencies: string[]` 상태)이다. 사용자가 자유롭게 추가/해제 가능.
- JD를 붙여넣으면 AI가 추천한 역량이 세트 맨 앞으로 온다.
- "시작하기" 버튼을 누르면 **선택된 첫 번째 역량으로만** 세션이 시작된다(`focusCompetency` = `focusCompetencies[0]`). 기존 `/api/interview/start` API 계약은 그대로.
- 나머지 선택 역량은 `queuedCompetencies: string[]` 필드로 `/api/interview/start` 요청 바디에 **이미 함께 전송되고 있음** — 단, 서버는 아직 이 필드를 읽지 않고 무시한다.

## 이번 작업 목표

세션 하나가 끝났을 때(리포트 화면에서) 남은 큐가 있으면 "다음 역량 이어서 시작" CTA를 보여주고, 클릭하면 설정 화면을 다시 거치지 않고 큐의 다음 역량으로 곧바로 새 세션을 시작한다. 즉, 사용자가 처음에 역량 3개를 체크하고 시작하면 → 세션1 완료 → "다음: 문제해결 이어서 시작" 버튼 → 세션2 → ... 큐 소진까지 자연스럽게 이어지는 흐름을 만든다.

## 재사용 가능한 기존 인프라 (새로 안 만들어도 됨)

- `Plan` / `CompetencyProgress` 모델 — `planId` 기준으로 역량별 진행 상태(`NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`)를 이미 추적한다.
- `nextRecommendedCompetency(progress, order)` — `src/lib/candidate/service.ts`. `order` 배열 안에서 다음 미완료 역량을 고르는 순수 함수. 지금은 `COMPETENCY_CODES`(6개 고정 순서)로만 호출되는데, 우리 큐 순서를 `order`로 넘기면 그대로 재사용 가능.
- `start-session.ts`의 `opts.allowedCompetencies` — 이미 "이 세션에서 고를 수 있는 역량을 특정 집합으로 제한"하는 옵션이 있다(공유 링크 킷 기능용). 큐 기능과 이름이 비슷하니 혼동 주의 — 큐는 이 옵션과 별개 개념이다(제한이 아니라 "다음에 뭘 추천할지" 순서).
- `/api/candidates/progress?planId=` — planId로 진행 상황 조회.

## 변경이 필요한 파일

1. **`prisma/schema.prisma`** — `Plan` 모델(정확한 모델명은 스키마에서 확인, `getOrCreateActivePlan` 반환 타입 참고)에 `queuedCompetencies Json?` 필드 추가 + 마이그레이션. 세션이 끝날 때마다 이미 시작한 역량은 큐에서 빼고 갱신.
2. **`src/app/api/interview/start/route.ts`** — 요청 바디에서 `queuedCompetencies: string[]`를 파싱해 `start-session.ts`로 전달.
3. **`src/lib/interview/start-session.ts`**
   - `queuedCompetencies`를 받아서 plan에 저장(최초 세션 시작 시 1회, 이후 세션에서는 덮어쓰지 않고 유지 — 아래 "엣지 케이스" 참고).
   - `focusCompetency`가 없고 저장된 큐가 있으면, 그 큐의 첫 항목을 `nextRecommendedCompetency`에 넘길 `order`로 사용(현재 코드 262번째 줄 근처 `competencyOrder` 결정 로직을 확장).
4. **세션 완료/리포트 화면** — 정확한 파일은 grep으로 찾을 것(`router.push(\`/interview/${sessionId}\`)` 이후 어디서 리포트를 렌더링하는지 추적. `src/app/interview/[sessionId]/` 하위 또는 별도 report 라우트일 가능성 높음). 여기에:
   - `planId`로 현재 남은 큐를 조회.
   - 큐가 남아 있으면 "다음 역량: {역량명} 이어서 시작" 버튼 노출.
   - 클릭 시 `/api/interview/start`를 `focusCompetency: 큐의_다음_항목, planId` 로 다시 호출해 새 세션을 만들고 그 세션으로 이동. (설정 화면 재방문 없이 바로 다음 세션 시작 — UX 핵심 포인트)
5. **`src/app/interview/setup/SetupForm.tsx`** — 이미 완료. 추가 수정 불필요(단, 로컬에서 실제로 클릭해보고 체크박스 토글·자동 추천 동작이 자연스러운지는 확인 필요).

## 인수 조건 (Acceptance criteria)

- [ ] 산업+직무를 고르면 추천 역량 세트(보통 3개)가 자동 체크된 채로 뜬다.
- [ ] 체크박스를 자유롭게 추가/해제할 수 있고, 최소 1개는 있어야 시작 버튼이 활성화된다.
- [ ] "시작하기"를 누르면 선택된 첫 번째 역량으로 세션이 시작된다(기존과 동일).
- [ ] 세션 완료 후, 남은 큐가 있으면 리포트 화면에 "다음 역량 이어서 시작" CTA가 보인다.
- [ ] CTA를 클릭하면 설정 화면을 거치지 않고 큐의 다음 역량으로 새 세션이 바로 시작된다.
- [ ] 큐를 다 소진하면(또는 처음부터 역량 1개만 골랐으면) CTA가 안 보이고 기존 화면과 100% 동일하게 동작한다 — **회귀 금지**.
- [ ] `?competency=` 쿼리 파라미터로 직접 진입하는 기존 흐름(스킬 트리에서 특정 역량 클릭해서 오는 경우)도 그대로 동작해야 한다.
- [ ] 공유 링크 킷(`allowedCompetencies` 제한이 걸린 세션)에서는 큐가 그 제한 밖의 역량을 추천하지 않아야 한다.

## 리스크 / 주의사항

- IRT 적응형 난이도(θ) 추적은 역량별로 완전히 독립적이라, 순차 진행 흐름을 추가해도 IRT 엔진(`irt-state.ts`, `irt-client.ts`)은 건드릴 필요 없음. 만약 건드리게 된다면 설계가 잘못된 것.
- 기존 "전체 6개 역량 완주" 플랜 화면(`/interview/plan/[planId]`, `allDone` 관련 로직)과 이번 "역량 세트(3~4개) 순차 진행"은 다른 개념이다. 사용자가 헷갈리지 않게 문구를 구분할 것(예: 전체 플랜 = "핵심 역량 전체 진단", 세트 = "이번 지원 준비 세트").
- `queuedCompetencies`가 이미 완료된 역량을 포함하고 있을 수 있음(예: 사용자가 스킬 트리에서 이미 끝낸 역량을 실수로 다시 체크) — 큐 소비 시 항상 `CompetencyProgress.status !== "COMPLETED"` 체크를 거칠 것.

## 참고: 현재 클라이언트가 서버로 보내는 요청 바디 (변경 없음, 그대로 사용)

```ts
// SetupForm.tsx startInterview() 발췌
body: JSON.stringify({
  industry,
  companySize,
  companyName,
  jobRole,
  resumeText: resumeText.trim(),
  resumeFileName: uploadedFileName,
  planId,
  focusCompetency,               // 큐의 0번째 — 지금 시작할 역량
  queuedCompetencies,             // 큐의 나머지 — 지금은 서버가 무시, 이번 작업에서 저장/활용
  jdText,
  jdUrl,
  tripleFeedbackMode,
  jdBonusEnabled,
  questionCount,
  precomputedJdAnalysis,
})
```
