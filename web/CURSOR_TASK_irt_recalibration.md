# Cursor 작업 스펙 — 실측 응답 데이터로 IRT 문항 파라미터 재보정

## 배경 / 실제로 확인된 문제

`Question.difficulty`(b파라미터)/`discrimination`(a파라미터)는 문항 등록 시 관리자가 입력한
값에서 **한 번도 자동으로 안 바뀐다.** `services/irt-engine/app/core/irt_2pl.py`는 theta(응시자
능력)만 매 응답마다 갱신하고(`update_theta_eap`), 문항 파라미터를 실제 응답 데이터로 재추정하는
로직은 이 서비스 어디에도 없다. 수정 경로는 관리자가 `/admin/content` → 문항 편집에서 숫자를
손으로 바꾸는 것(`PATCH /api/admin/questions/[id]`)뿐이다. IRT의 핵심 가치("데이터가 쌓일수록
정교해진다")가 지금은 사실이 아니다.

**중요한 구조 확인**: `services/irt-engine`(FastAPI, Render 배포)는 완전히 stateless다 —
자체 DB 연결이 없고, 매 요청마다 Next.js가 문항 풀(item_pool)을 통째로 실어 보낸다
(`app/api/routes.py`의 `session/init`, `session/respond`). 따라서 이번 재보정 작업은
**Python IRT 서비스를 건드릴 필요가 없다** — Next.js 쪽에서 Prisma로 직접 데이터를 읽고 계산해서
`Question.difficulty`/`discrimination`을 갱신하면 된다. 새 DB 크리덴셜을 다른 서비스에 추가할
필요도 없다.

## 목표

1. 실제 응답 데이터(`ResponseRecord.rubricScore` + 응시자의 그 시점 능력 추정치)로 문항별
   difficulty/discrimination을 다시 추정한다.
2. 표본이 부족한 문항은 건드리지 않는다(과적합 방지).
3. 결과는 기본적으로 **드라이런(dry-run) 리포트만 생성**하고, 관리자가 검토 후 명시적으로
   승인(`apply`)해야 실제 DB에 반영되게 한다 — 실면접 채점에 쓰이는 값이라 자동 일괄 적용은
   위험하다.
4. 기존 감사 로그(`AdminAudit`) 패턴을 그대로 재사용해 "무엇이 왜 바뀌었는지" 추적 가능하게
   한다.

## 알고리즘 설계 (그대로 구현할 것 — 새로 설계하지 말고 아래 사양을 따를 것)

### 1단계 — 응시자 능력(theta) 추정치 확보

새로 계산하지 않는다. 세션 완료 시 이미 저장되는 `CompetencySnapshot`(모델: `userId`,
`sessionId`, `competency`, `theta`, `se`, `levelEst`, `percentile`)을 그대로 쓴다.

- 각 `ResponseRecord`(단, `isBonusQuestion = false`, `questionId`가 not null인 것만)에 대해
  `CompetencySnapshot`을 **`sessionId` + `competency`가 정확히 일치하는 행**으로 조인한다.
  (전체 세션 모드든 단일 역량 모드든, 완료된 세션에는 관련된 `CompetencySnapshot`이 항상
  세션당·역량당 1건 존재한다 — `finalizeCompetencySession`/`finalizeFullSession`,
  `src/app/api/interview/respond/route.ts` 참고.)
- 매칭되는 스냅샷이 없는 응답(세션이 아직 안 끝났거나 비정상 종료된 경우)은 **제외**한다.
- 이렇게 얻은 `theta`를 그 응답의 응시자 능력치로 취급한다. (엄밀한 joint MLE는 아니지만,
  이미 계산되어 있는 값을 재사용하는 합리적 근사치다 — 매 응답마다 순차 EAP를 다시 재현할
  필요 없음.)

### 2단계 — 문항별 (a, b) 재추정

문항(`questionId`)별로 그룹핑한 `(theta_i, u_i)` 쌍의 리스트를 만든다.
`u_i = rubricScore >= 0.55 ? 1 : 0` (Python `score_to_binary`의 threshold 0.55와 반드시
동일하게 맞출 것 — `services/irt-engine/app/core/irt_2pl.py:48-50`).

**최소 표본 기준**: 그룹 크기(`n`)가 `MIN_SAMPLE_SIZE = 25` 미만인 문항은 재보정 대상에서
제외하고 리포트에 "표본 부족(n=X)"으로만 표시한다.

표본이 충분한 문항에 대해, 아래 2파라미터 로지스틱 모델을 최대우도로 적합시킨다:

```
p_i = 1 / (1 + exp(-a * (theta_i - b)))
LL(a, b) = Σ [ u_i * ln(p_i) + (1 - u_i) * ln(1 - p_i) ]
```

**최적화는 다음 그래디언트를 이용한 경사 상승법(gradient ascent)으로 구현한다** (외부
최적화 라이브러리 없이 순수 TS로 충분히 안정적으로 수렴함):

```
∂LL/∂a = Σ (u_i - p_i) * (theta_i - b)
∂LL/∂b = Σ (u_i - p_i) * (-a)
```

- 초기값: **현재 DB에 저장된 `difficulty`/`discrimination` 값으로 워밍스타트**한다(무작위
  초기화 금지 — 이미 대체로 합리적인 값이므로 여기서 시작하는 게 더 안정적이고, 결과가
  기존 값에서 크게 벗어나지 않게 만드는 효과도 있음).
- 학습률: `a`에 대해 `lr_a = 0.01`, `b`에 대해 `lr_b = 0.05` 정도로 시작(응답 수에 따라
  그래디언트 스케일이 다르므로, 실제로는 `Σ`를 표본 수 `n`으로 나눠 평균 그래디언트를 쓰고
  학습률을 고정하는 편이 안정적임 — 배치 크기에 무관하게 스텝 크기가 일정해짐).
- 반복 횟수: 500 iteration, 또는 파라미터 변화량이 1e-5 미만이면 조기 종료.
- **가드레일(반드시 적용)**:
  - `discrimination(a)`는 `[0.3, 3.0]` 범위로 클램프(0에 가까워지면 그 문항은 변별력이
    없다는 뜻이라 극단값 방지 필요).
  - `difficulty(b)`는 `[-3.5, 3.5]` 범위로 클램프(Python `update_theta_eap`의 grid 범위와
    동일하게 맞춤).
  - **한 번의 재보정 실행으로 기존 값 대비 변화 폭을 제한**: `difficulty` 변화는 기존값
    ±0.5 이내로, `discrimination` 변화는 기존값의 0.7배~1.4배 이내로 클램프. (한 배치의
    노이즈로 문항이 한 번에 확 바뀌는 걸 막고, 여러 번 실행에 걸쳐 점진적으로 수렴하게
    한다 — 반복 실행을 전제로 한 설계다.)

### 3단계 — 리포트 생성

문항별로 다음을 담은 리포트 레코드를 만든다: `questionId`, `externalId`, `competencyCode`,
`sampleSize`, `oldDifficulty`, `newDifficulty`, `oldDiscrimination`, `newDiscrimination`,
`avgRubricScore`(참고용). 표본 부족 문항은 `skipped: true`와 사유만 담아 별도로 표시.

## 새로 만들 파일

### 1. `src/lib/admin/irt-recalibration.ts` (신규)

핵심 로직 전부. 함수 시그니처 예시:

```ts
export type RecalibrationItemResult = {
  questionId: string;
  externalId: string;
  competencyCode: string;
  sampleSize: number;
  oldDifficulty: number;
  newDifficulty: number;
  oldDiscrimination: number;
  newDiscrimination: number;
  avgRubricScore: number;
  skipped: boolean;
  skipReason?: string;
};

export async function computeIrtRecalibration(): Promise<RecalibrationItemResult[]>;

export async function applyIrtRecalibration(
  results: RecalibrationItemResult[],
  actor: { id: string; email: string; platformRole: string },
): Promise<{ appliedCount: number }>;
```

`computeIrtRecalibration`은 순수 계산(DB read만). `applyIrtRecalibration`은 `skipped: false`인
항목만 `prisma.question.update`로 반영하고, 문항 하나당 `logAdminAudit()`을 호출한다
(`src/lib/admin/audit.ts`, 기존 `src/app/api/admin/questions/[id]/route.ts`의 PATCH 핸들러가
쓰는 것과 정확히 같은 함수). `action: "UPDATE"`, `entityType: "question"`,
`summary: "IRT 재보정(자동): 응답 N건 기반"`, `beforeState`/`afterState`는 기존 라우트의
`snapshotQuestion()` 헬퍼를 그대로 재사용할 것.

### 2. `src/app/api/admin/irt/recalibrate/route.ts` (신규)

```ts
export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const results = await computeIrtRecalibration();

  if (body.apply === true) {
    const { appliedCount } = await applyIrtRecalibration(results, auditActor(auth));
    return NextResponse.json({ results, applied: true, appliedCount });
  }

  return NextResponse.json({ results, applied: false });
}
```

`requirePlatformAdminApi`/`isAdminResponse`/`auditActor`는 `src/lib/admin/auth.ts` — 기존
questions 라우트와 동일한 import.

### 3. 관리자 화면(신규 페이지 또는 기존 화면에 진입점 추가)

가장 간단한 형태: `src/app/admin/content/page.tsx`의 `AdminPageHeader`의 `links` 배열
(현재 "기관 관리 · 테넌트 허브 →" 등이 있는 곳, 약 78~86번째 줄)에 "IRT 재보정 →" 링크를
추가하고, 새 페이지 `src/app/admin/irt-recalibration/page.tsx`를 만든다:

- 버튼 하나로 위 POST 라우트를 `apply: false`로 호출해 리포트 테이블 렌더(문항별
  기존값→새값, 표본 크기, 표본 부족 문항은 회색으로 구분 표시).
- 리포트 확인 후 "적용" 버튼을 누르면 같은 라우트를 `apply: true`로 재호출.
- 페이지 컨테이너/헤더 스타일은 기존 admin 페이지들이 쓰는 공통 컴포넌트를 그대로 따를 것
  — `ADMIN_CONTAINER`(`src/lib/admin/page-shell.ts`), `AdminPageHeader`
  (`src/components/admin/AdminPageHeader.tsx`), `PLATFORM_EYEBROW`(`src/lib/admin/eyebrow.ts`).
  정확한 사용법은 `src/app/admin/content/page.tsx` 상단을 그대로 참고할 것.
- `requireContentConsoleViewer` 또는 `requirePlatformAdminApi`와 동급의 서버 가드를 페이지
  진입 시에도 적용(다른 admin 페이지들의 패턴 확인 후 동일하게).

## 건드리지 않는 것 (범위 밖)

- `services/irt-engine`(Python) — 전혀 수정하지 않는다. 이 서비스는 여전히 stateless로
  매 세션마다 Next.js가 넘겨주는 문항 파라미터를 그대로 쓴다. 재보정된 값은 다음 세션부터
  자동으로 반영된다(문항 조회 시 이미 `Question.difficulty`/`discrimination`을 읽어서
  IRT 서비스로 넘기는 기존 경로를 그대로 타기 때문 — 새 연동 코드 불필요).
- Prisma 스키마 변경 없음 — 이번 작업은 마이그레이션이 필요 없다.
- 자동 스케줄링(cron)은 이번 범위에 넣지 않는다. 관리자가 수동으로 버튼을 눌러 실행하는
  V1으로 시작하고, 안정성이 확인되면 나중에 월간 cron으로 승격을 고려한다.

## 인수 조건 (Acceptance criteria)

- [ ] `POST /api/admin/irt/recalibrate`(apply 없이)를 호출하면 문항별 리포트가 반환되고,
      DB 값은 전혀 바뀌지 않는다.
- [ ] 표본이 `MIN_SAMPLE_SIZE` 미만인 문항은 `skipped: true`로 표시되고 새 값이 계산되지
      않는다.
- [ ] `apply: true`로 재호출하면 표본 충분한 문항만 `Question.difficulty`/`discrimination`이
      갱신되고, 문항 수만큼 `AdminAudit` 로우가 새로 생긴다(`/admin/audit`에서 확인 가능).
- [ ] 재보정 후 새 값이 가드레일 범위(`discrimination: 0.3~3.0`, `difficulty: -3.5~3.5`,
      기존값 대비 변화 폭 제한)를 벗어나지 않는다 — 극단적인 문항 하나를 수동으로 확인해서
      검증할 것.
- [ ] `npx tsc --noEmit`, `npm run build` 통과.
- [ ] 관리자 화면에서 실제로 재보정을 한 번 실행해보고, 표본이 충분한 문항 몇 개의
      difficulty가 실제 응답 난이도 체감과 방향이 맞는지(예: 다들 잘 맞히던 문항이면
      difficulty가 낮아지는 방향인지) 육안으로 확인.

## 참고 — 왜 이 설계가 안전한가

- Python IRT 엔진의 수학(확률 함수, threshold)과 완전히 동일한 공식을 TS에서 재구현하므로
  두 시스템 간 불일치가 없다.
- 워밍스타트 + 변화 폭 클램프 덕분에, 노이즈 많은 배치 하나가 문항을 망가뜨릴 수 없다 —
  여러 번 실행에 걸쳐 점진적으로 실제 값에 수렴하는 구조.
- dry-run 기본값 + 관리자 수동 승인이라, 배포 즉시 실면접 채점에 영향을 주지 않는다.
