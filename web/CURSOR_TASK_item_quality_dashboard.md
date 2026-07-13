# Cursor 작업 스펙 — 문항 품질(실측 응답 기반) 관리자 대시보드

## 배경 / 실제로 확인된 문제

`/admin/content`(Framework Studio)에는 이미 "품질" 탭이 있다(`FrameworkCompetencyWorkspace.tsx`
의 `WorkspaceTab`, `CompetencyWorkspace.tsx`가 렌더). 하지만 여기서 말하는 "품질"은 **저작
완성도**뿐이다 — `validation.missingMappingCount`/`needsNormalizedMapping`/`coverage`
(`src/components/admin/repository/CompetencyWorkspace.tsx`의 `WorkspaceData.validation`),
즉 "이 문항에 루브릭이 연결돼 있는가"만 본다.

정작 **실제 응시자들이 이 문항에 어떻게 응답했는지**(점수 분포, 팔로우업이 얼마나 자주
발동했는지, 표본이 몇 건인지)는 `ResponseRecord`에 문항마다 쌓이고 있는데도 어떤 관리자
화면에서도 보여주지 않는다. 어떤 문항이 항상 만점만 나오는지(너무 쉬움), 항상 팔로우업이
붙는지(질문이 모호함), 표본이 거의 없어서 신뢰할 수 없는지 — 이걸 알 방법이 지금 없다.

## 목표

기존 "품질" 탭에 **응답 기반 성과 지표**를 추가한다. 새 화면을 만들지 않고 기존 워크스페이스를
확장하는 걸 우선하되, 데이터 구조상 자연스럽지 않으면 같은 탭 안에 별도 패널로 추가해도 된다
(판단은 Cursor 재량, 다만 저작완성도 패널과 성과 패널을 시각적으로 명확히 구분할 것 — 서로
다른 종류의 "품질"이라 섞이면 헷갈림).

## 데이터 소스 — 정확히 이렇게 계산할 것

문항별(`questionId`) 성과는 **`ResponseRecord`만으로 계산 가능**하다(`ChipEvent`은
`questionId`가 없어서 문항 단위로 조인 불가 — 세션/역량 단위만 가능하므로 이번 작업의
소스로 쓰지 않는다).

```ts
const rows = await prisma.responseRecord.groupBy({
  by: ["questionId"],
  where: { isBonusQuestion: false, questionId: { not: null } },
  _count: { _all: true },
  _avg: { rubricScore: true },
});
```

`groupBy`로는 followUpRate(follow-up 발동 비율)와 점수 분포 버킷은 못 뽑으므로, 문항별로
`responseRecord.findMany({ where: { questionId }, select: { rubricScore: true,
followUpQuestion: true } })`를 추가로 돌리거나, 처음부터 `findMany`로 전체를 가져와 JS에서
문항별로 그룹핑하는 편이 더 단순하다(문항 수 x 응답 수가 아주 크지 않다면 이 방식을 권장 —
실제 규모를 보고 판단할 것, 너무 크면 `groupBy` + 별도 count 쿼리 조합으로 최적화).

문항 하나당 계산할 지표:

- `sampleSize`: 응답 수(n)
- `avgRubricScore`: 평균 점수(0~1)
- `scoreDistribution`: `{ low: n(<0.4), mid: n(0.4~0.7), high: n(>0.7) }` — 표준편차보다
  관리자가 한눈에 이해하기 쉬움
- `followUpRate`: `count(followUpQuestion IS NOT NULL) / n`
  (기존 `mapResponseForReport`의 `hadFollowUp` 판정 로직 `!!(r.followUpQuestion &&
  r.followUpTranscript)`와 동일한 기준을 쓸 것 — `src/lib/interview/report-response.ts`)

**플래그 판정 로직**(표시용, 저장 안 해도 됨 — 매번 계산):

```ts
const MIN_SAMPLE = 10;

function flagQuestion(stats): "표본부족" | "너무쉬움" | "너무어려움_모호함" | "정상" {
  if (stats.sampleSize < MIN_SAMPLE) return "표본부족";
  if (stats.avgRubricScore > 0.85) return "너무쉬움";
  if (stats.avgRubricScore < 0.35 || stats.followUpRate > 0.5) return "너무어려움_모호함";
  return "정상";
}
```

이 임계값들은 하드코딩된 상수로 파일 상단에 빼서, 나중에 실제 데이터 분포를 보고 튜닝하기
쉽게 할 것.

## 변경 파일

### 1. `src/lib/repository/service.ts` — `getCompetencyWorkspace()` 확장

이 함수가 `WorkspaceData`(`questions: WorkspaceQuestion[]` 포함)를 만드는 곳이다
(`src/app/api/admin/repository/competencies/[id]/workspace/route.ts`가 호출).
**먼저 이 함수 전체를 읽고 현재 `questions` 배열을 만드는 부분을 정확히 찾을 것** — 그 다음
문항 ID 목록에 대해 위 지표를 계산해서 각 문항 객체에 `performance` 필드로 붙인다.

`src/components/admin/repository/CompetencyWorkspace.tsx`의 `WorkspaceQuestion` 타입
(약 45~53번째 줄)에 아래 필드 추가:

```ts
type WorkspaceQuestion = {
  id: string;
  externalId: string;
  template: string;
  level: number;
  rubricCriteria: string[];
  coverage: { kind: QuestionCoverageKind; criteriaCount: number };
  mappedRubric: { id: string; rubricName: string } | null;
  performance: {                          // ← 추가
    sampleSize: number;
    avgRubricScore: number;
    scoreDistribution: { low: number; mid: number; high: number };
    followUpRate: number;
    flag: "표본부족" | "너무쉬움" | "너무어려움_모호함" | "정상";
  };
};
```

### 2. `src/components/admin/repository/CompetencyWorkspace.tsx` — 성과 패널 추가

"quality" 탭(현재 `validation` 요약을 보여주는 부분)에 문항별 성과 테이블을 추가한다.
컬럼: 문항(template 앞부분 축약) · 레벨 · 표본 수 · 평균 점수 · 팔로우업 비율 · 플래그(뱃지).
플래그별 색상: "너무쉬움"/"너무어려움_모호함"은 경고색(기존 `AlertTriangle` 아이콘·
amber/red 톤이 이미 이 파일에서 쓰이고 있음 — 그 톤 그대로 재사용), "정상"은 중립,
"표본부족"은 회색.

표는 기존 `WorkspaceQuestion` 목록(`questions.questions` 또는 이 파일이 이미 쓰는 변수명)을
그대로 순회하며 `q.performance`를 렌더링하면 됨 — 별도 API 호출 불필요(1번에서 이미
workspace 응답에 포함시켰으므로).

정렬 옵션: 기본은 "표본 많은 순", "플래그 있는 문항 먼저" 토글 정도는 있으면 좋음(필수는
아님 — 시간 되면).

### 3. (선택) 역량 목록 레벨에서 요약 배지

`src/components/admin/framework/FrameworkStudio.tsx` 또는 역량 목록을 보여주는 상위
컴포넌트에서, 각 역량 옆에 "플래그 있는 문항 N개" 같은 요약 배지를 붙이면 관리자가 굳이
역량 하나씩 안 들어가도 어디부터 봐야 할지 알 수 있다. 이건 시간이 되면 추가하는 스트레치
목표 — 필수 아님. 하려면 먼저 이 컴포넌트가 받는 props에 이미 문항 수(`questionCount`) 같은
집계가 있는지 확인하고 같은 자리에 추가할 것.

## 건드리지 않는 것 (범위 밖)

- `ChipEvent`에 `questionId` 컬럼을 추가해서 chip 타입(PASS/ATTEMPT/DOWNGRADE) 분포까지
  문항 단위로 보여주는 것 — 이건 스키마 변경이 필요한 별도 작업으로 남겨둔다. 이번엔
  `ResponseRecord` 기반 지표만으로 충분히 유용한 v1을 만드는 게 목표.
- 기존 "저작 완성도" validation 로직/UI — 전혀 건드리지 않는다. 새 성과 패널은 그 옆에
  추가만 한다.
- 조직(ORG) 커스텀 문항까지 이 지표를 적용할지는 Cursor 재량이나, 우선 PLATFORM 소유
  문항부터 적용하고 ORG 커스텀은 표본이 원래 적을 수밖에 없어 "표본부족"으로 자연스럽게
  걸러지므로 로직 자체는 공통으로 써도 무방.

## 인수 조건 (Acceptance criteria)

- [ ] `/admin/content`에서 응답이 많이 쌓인 역량 하나를 열어 "품질" 탭에 들어가면, 문항별
      표본 수·평균 점수·팔로우업 비율·플래그가 보인다.
- [ ] 응답이 거의 없는(또는 아예 없는) 신규 문항은 "표본부족"으로 표시되고 에러 없이
      렌더된다(0으로 나누기 등 엣지 케이스 처리 확인).
- [ ] 평균 점수가 유난히 높거나 낮은 문항, 팔로우업이 자주 붙는 문항이 실제로 "너무쉬움"/
      "너무어려움_모호함"으로 플래그되는지 실제 데이터 몇 건으로 육안 검증.
- [ ] 기존 저작완성도(validation) 패널의 동작·표시는 전혀 바뀌지 않는다.
- [ ] `npx tsc --noEmit`, `npm run build` 통과.

## 참고 — IRT 재보정 작업과의 관계

`CURSOR_TASK_irt_recalibration.md`와 데이터 소스가 겹친다(`ResponseRecord.rubricScore`).
순서는 상관없지만, 두 작업을 같은 사람이 연달아 하면 문항별 통계 계산 로직을 일부 공유할
여지가 있다 — 다만 이번 작업(표시용 요약)과 재보정 작업(파라미터 재추정)은 목적이 달라
코드를 억지로 합치려 하지 말고 각자 독립적으로 구현해도 된다.
