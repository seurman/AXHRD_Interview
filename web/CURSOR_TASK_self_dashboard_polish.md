# Cursor 작업 스펙 — 본인용 홈 대시보드 개선 (1/3: 개인 화면)

## 배경

`/dashboard`(`src/app/dashboard/page.tsx` → `src/components/dashboard/CompetencyDashboard.tsx`)
실제 화면을 스크린샷으로 검토한 결과 확인된 문제 4가지를 고친다.

## 1. 역량 레이더 — 미측정 역량이 많을 때 찌그러진 모양으로 보임

현재 `CompetencyDashboard.tsx`의 `radarData`(80~85번째 줄)는 미시작 역량도 `score: 0`으로
넣어서 폴리곤을 그린다 — 측정된 역량이 1~2개뿐이면 레이더가 한쪽으로 찌그러진 얇은 모양이
되어 "역량이 부족하다"는 인상을 준다.

**수정**: 측정된(`assessed`) 역량이 3개 미만이면 레이더 대신 안내 카드를 보여준다:

```tsx
const assessedCount = radarData.filter((d) => d.assessed).length;

{assessedCount >= 3 ? (
  <RadarChart data={radarData}>...(기존 그대로)...</RadarChart>
) : (
  <div className="flex h-[260px] flex-col items-center justify-center text-center text-sm text-muted">
    <p>역량 3개 이상을 측정하면 레이더가 나타나요</p>
    <p className="mt-1 text-xs">지금까지 측정: {assessedCount}개</p>
  </div>
)}
```

`ChartCard`로 감싸는 기존 구조는 그대로 유지.

## 2. θ 성장 곡선 — 데이터 포인트가 2개일 때 직선이 오해를 줄 수 있음

`buildTimeline()`(277~291번째 줄)이 세션 번호별로 평균 theta를 모으는데, 포인트가 2개뿐이면
그 사이 구간에 실제로 무슨 일이 있었는지 모르는 채로 직선을 긋는다.

**수정**: `timelineData.length < 3`이면 `<Line>` 대신 점만 찍히는 형태(`<Line
type="monotone" dataKey="theta" stroke="..." strokeWidth={0} dot={{r:5}} />` 처럼
연결선 두께 0)로 렌더하고, 차트 위에 작은 안내 문구 추가: "세션이 3회 이상 쌓이면 추세선이
보여요". `ChartCard` 안, `ResponsiveContainer` 위에 조건부로 이 문구를 넣을 것.

## 3. 6축 BEI 답변 지표를 홈에 노출 (제일 중요한 추가 기능)

지금 6축(질문의도·상황구체도·자기기여도·논리성·성과구체성·전달력, `CURSOR_TASK_expand_answer_dimensions.md`
가 이미 적용됐다고 가정) 지표는 면접 리포트 페이지에서만 보이고 홈 대시보드엔 전혀 없다.
이게 "내 답변이 회차를 거듭하며 어떻게 구체적으로 좋아지는지" 보여주는 제일 설득력 있는
성장 지표라 홈에 추가한다.

**데이터 소스**: `ResponseRecord.dimensions`(이미 저장되고 있음, `CURSOR_TASK_persist_per_turn_dimensions.md`
참고) — `isBonusQuestion: false`인 사용자의 최근 완료 세션들에서 세션별 평균을 낸다.

**`src/app/dashboard/page.tsx`에 추가**:

```ts
import { normalizeAnswerDimensions, averageDimensions, ANSWER_DIMENSION_KEYS } from "@/lib/interview/answer-dimensions";

// full.sessions(최근 완료 세션, 이미 조회됨)의 id로 ResponseRecord를 조회
const dimensionResponses = await prisma.responseRecord.findMany({
  where: {
    session: { userId: user.id, status: "COMPLETED" },
    isBonusQuestion: false,
    dimensions: { not: Prisma.DbNull },
  },
  select: { dimensions: true, session: { select: { sessionNumber: true } } },
  orderBy: { createdAt: "asc" },
});

// 세션 번호별로 그룹핑 후 6축 평균 — buildTimeline()과 동일한 그룹핑 패턴을 재사용할 것
```

세션별 평균 6축 배열을 만들어 `CompetencyDashboard`에 새 prop(`dimensionTimeline`)으로
내려준다. 정확한 타입/그룹핑 헬퍼는 `buildTimeline()`(`CompetencyDashboard.tsx` 277번째
줄)과 동일한 방식(세션 번호로 묶어 평균)으로 만들되, 6개 축이라 결과 shape이 다르다 —
새 함수(`buildDimensionTimeline()`)로 분리해서 만들 것.

**UI**: `역량 레이더`/`θ 성장 곡선` 2열 그리드 아래에 새 `ChartCard`를 추가해서, 세션을
가로축으로 하는 **멀티라인 차트**(6개 축 각각 다른 색 line, Recharts `LineChart`에 `<Line>`
6개) 또는 **최근 세션 평균 vs 그 이전 평균을 비교하는 레이더**(`AnswerInsightRadar.tsx`와
비슷한 스타일, `sessionAverage` prop 패턴을 참고) 둘 중 하나로 구현 — 6개 라인이 한 차트에
겹치면 지저분할 수 있으니, 후자(최근 vs 이전 비교 레이더)가 더 읽기 쉬울 가능성이 높다.
Cursor 재량으로 판단하되, 어느 쪽이든 "이번 달 평균 vs 지난달 평균" 같은 비교 문구를
같이 보여줄 것.

세션이 2개 미만이면 이 섹션 자체를 숨기거나 "다음 면접부터 이 지표가 쌓여요" 안내로 대체.

## 4. VIA 강점 카드와 역량 진단을 명확히 구분

`StrengthCardDeck`(`CompetencyDashboard.tsx` 160~168번째 줄) 바로 위에 한 줄 설명 추가:
"역량 진단과는 별개로, 면접 중 발견된 성격 강점이에요" 같은 톤 — 정확한 카피는
`src/lib/discover` 쪽 기존 문구 컨벤션을 확인해서 맞출 것. 사용자가 "왜 강점 카드는 역량
레이더랑 다른 이름이지?"라고 헷갈리지 않게 하는 목적.

## 5. 평균 백분위에 비교 기준 문구 추가

`StatCard`(`st.avgPercentile`, 107~111번째 줄) 아래 작은 텍스트로 "동일 역량 응시자 대비"
같은 기준을 추가. `i18n` 딕셔너리(`src/lib/i18n/dictionaries/ko.ts`의 `dashboard.stats`
블록)에 문구를 추가해서 하드코딩하지 말 것 — 기존 파일이 이미 i18n 구조로 되어 있음.

## 건드리지 않는 것

- `QuestPanel`(게임화) 배치·크기 — 지금도 오른쪽 사이드 컬럼(1/3 폭)에 이미 부차적으로
  배치돼 있어 큰 문제는 아니라고 판단, 이번 스펙에서는 그대로 둔다. 새로 추가되는 6축
  트렌드 차트가 메인(2/3 폭) 영역에 들어가면 자연스럽게 시각적 우선순위가 과학적 지표
  쪽으로 기운다.
- `buildCareerQuests`, XP 계산 로직 — 무관, 손대지 않음.

## 인수 조건

- [ ] 역량이 1~2개만 측정된 계정으로 로그인하면 레이더 대신 안내 카드가 보인다.
- [ ] 완료 세션이 2개인 계정에서 θ 성장 곡선이 직선으로 안 이어지고 점만 보인다.
- [ ] 완료 세션이 2개 이상이고 dimensions가 저장된 계정에서 새 6축 트렌드 섹션이 보인다.
- [ ] 강점 카드 섹션 위에 구분 문구가 보인다.
- [ ] `npx tsc --noEmit`, `npm run build` 통과.
