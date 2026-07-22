# Cursor 작업 스펙 — 답변 채점 축 확장 (4축 → 6축, BEI 타당도 연구 기반)

## 배경

지금 답변마다 채점하는 4축(`starStructure`, `questionIntent`, `logic`, `delivery`,
`src/lib/interview/answer-dimensions.ts`)은 STAR(상황-과제-행동-결과)를 하나로 뭉쳐서
채점한다. 구조화 행동면접(BEI) 타당도 연구를 보면 실제 채점자들은 상황 맥락, **개인
기여도**("나는" vs "우리는", 본인이 실제로 뭘 결정·행동했는지), 구체적 행동, **정량화된
성과**를 따로 본다 — 특히 개인 기여도는 타당도에 크게 기여하는 요소로 반복 강조된다.
지금 `starStructure`는 이걸 다 뭉쳐서 하나의 숫자로만 내서, 정작 가장 차별화되는 신호
(이 사람이 실제로 뭘 했는지 vs 팀 성과에 묻어간 건지)가 안 보인다.

이번 작업은 4축을 아래 6축으로 재설계한다. **`starStructure`는 폐기하고
`situationSpecificity`(상황 구체도) + `individualOwnership`(자기 기여도)로 분리한다.**
"설득력"은 애매한 축이라 그대로 추가하지 않고, 연구에서 실제 채점 기준으로 쓰는
"성과를 수치로 뒷받침했는가"로 구체화해 `outcomeQuantification`(성과 구체성)으로 만든다.

| 순서 | 키 | 라벨 | 설명 |
|---|---|---|---|
| 1 | `questionIntent` | 질문 의도 파악 | 기존 유지 |
| 2 | `situationSpecificity` | 상황 구체도 | 신규 — STAR의 S/T를 분리 |
| 3 | `individualOwnership` | 자기 기여도 | 신규 — "나는" 주도로 서술했는지, 본인의 의사결정·행동이 명확한지 |
| 4 | `logic` | 논리적 설명력 | 기존 유지 |
| 5 | `outcomeQuantification` | 성과 구체성 | 신규 — 결과를 수치/구체적 근거로 뒷받침했는지("설득력"의 재정의) |
| 6 | `delivery` | 전달력·의사소통 | 기존 유지 |

**타이밍이 좋다**: `ResponseRecord.dimensions`/`CompetencyFeedback.dimensions`는 Json 필드라
축 개수가 바뀌어도 스키마 마이그레이션이 필요 없고, 이 저장 기능 자체가 오늘 막 라이브됐기
때문에(커밋 `10dc6fb`) 쌓인 과거 데이터가 거의 없다 — 지금이 이 breaking change를 하기 가장
싼 시점이다. 나중에 데이터가 더 쌓이면 하위호환 처리가 더 복잡해진다.

## 영향 범위 — grep으로 확인한 전체 터치포인트

아래 파일들은 전부 `starStructure`/`questionIntent`/`logic`/`delivery`를 직접 참조하거나
4개 키를 하드코딩하고 있다. 빠짐없이 수정할 것 — 하나라도 빠지면 축이 섞이거나 리포트가
깨진다.

### 수정이 필요한 파일

1. **`src/lib/interview/answer-dimensions.ts`** (핵심 타입)
2. **`src/lib/gemini/evaluate.ts`** (Gemini 채점 프롬프트 — 아래 "프롬프트 수정" 참고)
3. **`src/lib/labels.ts`** (`dimensionLabel()` — 새 키 3개 라벨 추가)
4. **`src/lib/claude/competency-feedback.ts`** (DeepSeek 역량 리포트 프롬프트 + `mockCompetencyFeedback` 폴백)
5. **`src/types/index.ts`** (약 92~97번째 줄, `dimensions?: {starStructure, questionIntent, logic, delivery}` 하드코딩된 타입 — 6개 키로 갱신하거나 `AnswerDimensions` 타입을 import해서 재사용)
6. **`src/lib/admin/response-dimensions-health.ts`** (48번째 줄 `dimensionsMatch()`의 하드코딩된 `["starStructure","questionIntent","logic","delivery"]` 배열 — `ANSWER_DIMENSION_KEYS`를 import해서 동적으로 순회하도록 변경)

### 확인만 하면 되는 파일 (구조상 이미 동적으로 처리됨 — 코드 변경 불필요할 가능성 높음, 그래도 열어서 확인할 것)

- `src/components/interview/AnswerInsightRadar.tsx` — `ANSWER_DIMENSION_KEYS`를 순회해서 그리므로 축이 늘어도 자동 대응. 다만 6축이면 레이더가 좀 빽빽해지니 `height={220}`을 `260` 정도로 늘리는 걸 고려(선택).
- `src/lib/interview/feedback-helpers.ts` — `buildAnswerKeyPointFeedback`이 `Object.entries(params.dimensions)`로 순회하므로 키 개수 무관하게 동작.
- `src/app/interview/plan/[planId]/competency/[code]/feedback/page.tsx` — `Object.entries(dimensions)`로 순회 렌더. 무관하게 동작할 가능성 높음.
- `src/app/admin/data-storage/page.tsx`, `src/app/admin/sessions/[sessionId]/page.tsx` — 실제로 어떻게 렌더하는지 열어서 확인. 하드코딩된 키 참조가 있으면 5번과 동일하게 수정.

### 테스트 파일 — 존재만 확인, 갱신 필요

- `src/lib/gemini/evaluate.test.ts`
- `src/lib/interview/dimensions-persistence.test.ts`

이 두 테스트가 옛 4축 기준으로 짜여 있을 것 — 6축 기준으로 갱신할 것.

## 1. `src/lib/interview/answer-dimensions.ts` 전면 수정

```ts
export type AnswerDimensions = {
  questionIntent: number;
  situationSpecificity: number;
  individualOwnership: number;
  logic: number;
  outcomeQuantification: number;
  delivery: number;
};

export type AnswerDimensionKey = keyof AnswerDimensions;

export const ANSWER_DIMENSION_KEYS: AnswerDimensionKey[] = [
  "questionIntent",
  "situationSpecificity",
  "individualOwnership",
  "logic",
  "outcomeQuantification",
  "delivery",
];
```

`normalizeAnswerDimensions()`는 하위호환 분기를 추가한다 — **기존 로직(신규 6키 체크 →
구버전 대체키 체크)은 그대로 두고, 그 사이에 "구버전 4축(starStructure 포함)" 분기를
새로 끼워 넣는다**:

```ts
export function normalizeAnswerDimensions(raw: unknown): AnswerDimensions | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  // 1) 신규 6축 형태
  if (
    typeof o.questionIntent === "number" &&
    typeof o.situationSpecificity === "number" &&
    typeof o.individualOwnership === "number" &&
    typeof o.logic === "number" &&
    typeof o.outcomeQuantification === "number" &&
    typeof o.delivery === "number"
  ) {
    return {
      questionIntent: clamp01(o.questionIntent),
      situationSpecificity: clamp01(o.situationSpecificity),
      individualOwnership: clamp01(o.individualOwnership),
      logic: clamp01(o.logic),
      outcomeQuantification: clamp01(o.outcomeQuantification),
      delivery: clamp01(o.delivery),
    };
  }

  // 2) 구버전 4축(starStructure 포함) — 오늘 이전에 저장된 실제 데이터용 하위호환.
  //    starStructure 하나였던 값을 situationSpecificity/individualOwnership/
  //    outcomeQuantification 세 곳에 동일하게 복제한다(구버전은 이 셋을 구분하지
  //    않았으니 근사치로 취급 — 완벽한 재현이 아니라 "값이 아예 없는 것보다 낫다"는
  //    수준의 폴백임을 코드 주석에 남길 것).
  if (
    typeof o.starStructure === "number" &&
    typeof o.questionIntent === "number" &&
    typeof o.logic === "number" &&
    typeof o.delivery === "number"
  ) {
    const s = clamp01(o.starStructure);
    return {
      questionIntent: clamp01(o.questionIntent),
      situationSpecificity: s,
      individualOwnership: s,
      outcomeQuantification: s,
      logic: clamp01(o.logic),
      delivery: clamp01(o.delivery),
    };
  }

  // 3) 기존에 있던 더 오래된 대체키 분기(structure/specificity/relevance/clarity)는
  //    그대로 유지 — 건드리지 말 것.
  if (
    typeof o.structure === "number" ||
    typeof o.specificity === "number" ||
    typeof o.relevance === "number" ||
    typeof o.clarity === "number"
  ) {
    // ...기존 코드 그대로...
  }

  return null;
}
```

`CompetencyReportDimensions`(0~100 스케일 버전)와 `normalizeCompetencyDimensions()`도
6개 키로 동일하게 갱신. `findWeakestDimension`/`averageDimensions`는 `ANSWER_DIMENSION_KEYS`
를 순회하는 구조라 이미 그대로 동작하지만, 6키 기준으로 타입이 맞는지 확인할 것.

## 2. `src/lib/labels.ts` — `dimensionLabel()` 갱신

```ts
const map: Record<string, string> = {
  questionIntent: "질문 의도 파악",
  situationSpecificity: "상황 구체도",
  individualOwnership: "자기 기여도",
  logic: "논리적 설명력",
  outcomeQuantification: "성과 구체성",
  delivery: "전달력·의사소통",
  // 구버전 키 라벨(과거 데이터 표시용으로 남겨둘 것 — 삭제 금지)
  starStructure: "STAR 구조",
  structure: "구조",
  specificity: "구체성",
  relevance: "관련성",
  clarity: "명확성",
};
```

## 3. `src/lib/gemini/evaluate.ts` — 프롬프트 2곳 수정

**(a) `RUBRIC_SYSTEM`**(약 21~30번째 줄)의 dimensions 설명 문장을:

```
dimensions는 다음 6개 기준으로 0.0~1.0을 매기세요:
- questionIntent: 질문 의도를 정확히 파악해 답했는가
- situationSpecificity: 상황·과제를 구체적으로 묘사했는가(막연한 일반론이 아닌지)
- individualOwnership: 본인이 실제로 한 행동·의사결정이 "나는" 주도로 명확히
  드러나는가(팀 성과에 묻어가듯 "우리는"으로만 서술하면 낮게)
- logic: 원인→행동→결과로 이어지는 논리 흐름이 자연스러운가
- outcomeQuantification: 결과를 수치나 구체적 근거로 뒷받침했는가
- delivery: 명확하고 이해하기 쉽게 전달했는가
```

JSON 예시 블록도 6개 키로 갱신.

**(b) `CORRECT_AND_EVALUATE_SYSTEM`**(105~146번째 줄) — 118~119번째 줄의 동일한
dimensions 설명 문장과 138~143번째 줄의 JSON 스키마 블록을 위와 동일하게 6개 키로 갱신.
이 프롬프트는 STT 교정 + 채점을 합친 메인 경로라 실제 트래픽 대부분이 여길 지나간다 —
**(a)와 반드시 동일한 6개 정의 문구를 써서 두 프롬프트 간 채점 기준이 갈리지 않게 할 것.**

## 4. `src/lib/claude/competency-feedback.ts` — DeepSeek 역량 리포트 프롬프트

`SYSTEM`(약 41~64번째 줄)의 JSON 스키마 중 `"dimensions": {...}` 부분을 6개 키로 갱신하고,
`CompetencyFeedbackData.dimensions` 인터페이스(약 26~31번째 줄)도 6개 키로 갱신.

`mockCompetencyFeedback()`(폴백, API 키 없을 때)의 `dimensions` 계산부(약 214~219번째
줄)도 6개 키에 맞게 갱신 — 지금 `avg` 하나로 4개를 다 계산하던 걸, 대략:
- `situationSpecificity`: `detectStarCoverage`의 `situation` 커버리지 비율 기반
- `individualOwnership`: `detectStarCoverage`의 `action` 커버리지 비율 기반
- `outcomeQuantification`: `detectStarCoverage`의 `result` 커버리지 비율 기반
같은 식으로 기존 `coverageCount()` 헬퍼(이미 이 파일에 있음, 176~181번째 줄)를 재사용해서
그럴듯한 폴백 값을 만들 것 — 폴백이라 완벽할 필요는 없지만, 6개가 전부 똑같은 값으로
나오면 레이더 차트가 무의미해지니 이 부분만 신경 써줄 것.

## 5. `src/types/index.ts` (약 92~97번째 줄)

하드코딩된 4키 타입을:

```ts
dimensions?: {
  questionIntent: number;
  situationSpecificity: number;
  individualOwnership: number;
  logic: number;
  outcomeQuantification: number;
  delivery: number;
};
```

로 갱신하거나, 가능하면 `src/lib/interview/answer-dimensions.ts`의 `AnswerDimensions`
타입을 import해서 재사용(중복 정의 제거 — 더 나은 방향이면 이걸로).

## 6. `src/lib/admin/response-dimensions-health.ts` (48번째 줄)

```ts
// 변경 전
const keys = ["starStructure", "questionIntent", "logic", "delivery"] as const;

// 변경 후
import { ANSWER_DIMENSION_KEYS } from "@/lib/interview/answer-dimensions";
// ...
const keys = ANSWER_DIMENSION_KEYS;
```

이렇게 하드코딩을 없애면 나중에 축이 또 바뀌어도 이 헬스체크 페이지가 자동으로 따라간다.

## 인수 조건

- [ ] 모의면접 한 세션을 실제로 진행해서, 답변 직후 레이더 차트에 6개 축이 뜬다(`질문
      의도 파악·상황 구체도·자기 기여도·논리적 설명력·성과 구체성·전달력`).
- [ ] "저는 팀 프로젝트를 했습니다" 류의 "우리는" 중심 답변과, 본인 행동을 명확히 서술한
      답변을 비교해서 `individualOwnership` 값이 실제로 차이 나는지 육안 확인.
- [ ] 오늘 이전에 만들어진(구버전 4축으로 저장된) `ResponseRecord`가 있다면, 그걸 보여주는
      화면에서 에러 없이 렌더되고(situationSpecificity/individualOwnership/
      outcomeQuantification이 starStructure 값으로 채워진 근사치로 나옴) 6축이 하나도
      비어 보이지 않는다.
- [ ] `/admin/data-storage` 헬스체크 페이지가 새 6축 기준으로 정상 작동(하드코딩된 4키
      배열 때문에 나머지 2축이 항상 "불일치"로 잘못 표시되지 않는지 확인).
- [ ] DeepSeek 역량 리포트(`CompetencyFeedback.dimensions`)도 6축으로 저장되고, 이전에
      만든 `finalizeCompetencySession`의 실측 평균 로직(있다면)도 6축 기준으로 정상 작동.
- [ ] `npx tsc --noEmit`, `npm run build`, 기존 테스트(`evaluate.test.ts`,
      `dimensions-persistence.test.ts`) 통과(6축 기준으로 갱신 후).

## 건드리지 않는 것

- IRT theta 계산 로직(`irt-state.ts`, `services/irt-engine`) — `dimensions`는 채점
  코칭용이지 IRT 점수 계산에 안 쓰인다는 기존 원칙 그대로 유지.
- `follow-up.ts`의 `shouldTriggerFollowUp()` — `rubric.dimensions.questionIntent`만
  참조하고 `questionIntent` 키는 이름이 안 바뀌므로 수정 불필요(단, 타입이 바뀌므로
  컴파일이 되는지만 확인).
