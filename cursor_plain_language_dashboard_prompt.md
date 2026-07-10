# 원점수 없이 강점/약점이 보이는 개인 대시보드 — 커서용 스크립트

## 방향 요약

CliftonStrengths(원점수 비노출, Top N 랭킹만 제시) + CEFR(can-do statement,
"~할 수 있어요" 문장으로 레벨 설명) 두 표준 패턴을 결합. θ/percentile 원값은
1차 화면에서 숨기고 "상세보기" 뒤로 옮긴다(완전 삭제 아님 — 조직 비교 화면엔
여전히 필요). 새 LLM 호출 없이, 이미 있는 `Competency.rubricByLevel` 텍스트를
1회성 콘텐츠 작업으로 candidate-facing can-do 문장으로 옮겨 쓰는 것만으로
해결한다.

## 1. 스키마 — 콘텐츠 필드 추가

```prisma
model Competency {
  // ...기존 필드...
  /** 후보자용 1인칭 "할 수 있어요" 문장, 레벨별 1개. rubricByLevel(채점 기준)을
   *  후보자가 재해석 없이 읽을 수 있게 옮겨 쓴 것 — 콘텐츠 작업, 런타임 생성 아님. */
  canDoStatements Json?  // { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." }
}
```
6개 역량 × 5레벨 = 30개 문장을 콘텐츠로 작성(기존 `rubricByLevel`을 기반으로
사람이 다듬거나, 1회성 배치 스크립트로 생성 — 매 요청마다 호출되는 구조 아님).
없는 역량/레벨은 기존처럼 `"L{n}"` 라벨만 폴백 표시.

## 2. `lib/dashboard/plain-language.ts` (신규)

```ts
export function levelCanDoStatement(
  competencyCode: string,
  level: number,
  canDoStatements?: Record<string, string> | null
): string {
  return canDoStatements?.[String(level)] ?? `L${level} 수준입니다.`; // 폴백
}

/** theta 시계열을 코드로만 분기해 추세 문장 생성 — LLM 호출 없음 */
export function growthNarrative(thetaSeries: number[]): string {
  // 최소 2개 필요. 델타/변동성 기준 3~4개 템플릿 중 결정론적으로 선택:
  // 예) 꾸준히 상승(연속 상승) / 최근 상승 전환 / 정체(변화 미미) / 기복(상승-하락 반복)
}

export interface RankedCompetency {
  code: string;
  level: number;
  canDo: string;
  tone: "strength" | "growth"; // 신호등 태그 — success/warning만 사용, danger 금지
}

/** 상위 3개는 강점, 하위 3개는 성장 포인트로 랭킹만 — 원점수 노출 없음 */
export function rankStrengthsAndWeaknesses(
  latestByCompetency: Record<string, { levelEst: number; percentile: number; assessed: boolean }>,
  competencyMeta: Record<string, { canDoStatements?: Record<string, string> | null }>
): { strengths: RankedCompetency[]; growthAreas: RankedCompetency[] }
```
- 미시도 역량은 랭킹에서 제외(강점도 개선영역도 아님 — "아직 측정 전"으로 별도 처리).
- 개인 대시보드에서는 `danger`(빨강) 색상 절대 사용 금지 — 위축감 방지 원칙.
  성장 포인트는 `warning`(주황/노랑)까지만.

## 3. `CompetencyDashboard.tsx` 재구성

- 기존 "역량 스킬 트리" 카드(θ/percentile 숫자 나열)를 **"나의 강점 Top 3" /
  "성장 포인트 Top 3"** 두 카드로 교체. 각 항목: 역량명 + `canDo` 문장 1줄 +
  신호등 배지(`success`/`warning`). 레이더 차트는 그대로 유지(형태 파악용 시각
  요소로는 유효) — 단, 툴팁/라벨은 percentile 숫자 대신 레벨+can-do 1줄로 교체.
- 성장 스탯카드의 `"θ +0.34"` 표기를 `growthNarrative()` 결과 문장으로 교체.
- θ/percentile 원값은 각 카드에 작은 "상세" 토글(아이콘 버튼)로 감춰서, 누르면
  펼쳐지는 형태로만 노출 — 완전히 없애지 않음(궁금해하는 사용자를 위한 옵션,
  조직 비교 시나리오에서도 이 값이 필요하니 데이터 자체는 유지).

## 원칙

- 새 LLM 호출 없음 — 전부 정적 콘텐츠(`canDoStatements`) + 코드 분기
  (`growthNarrative`, `rankStrengthsAndWeaknesses`)로 해결.
- θ/percentile은 삭제가 아니라 기본 화면에서 우선순위만 낮춤(상세보기 뒤로).
- 개인 대시보드에는 `danger`(빨강) 색상 사용 금지 — 강점=success, 성장포인트=
  warning까지만. 위축감을 주는 대신 "할 수 있는 것"에 초점.
- 스키마 변경 있음(`canDoStatements Json?` 추가) — 마이그레이션 필요, 기존
  세션/리포트 데이터는 건드리지 않음(순수 추가 필드).
- 작업 끝나면 `npm run build` 확인, `docs/STATUS.md`에 변경 파일 + 콘텐츠 작성
  현황(30개 문장 중 몇 개 작성했는지) 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_plain_language_dashboard_prompt.md)에 정리된 "원점수 없이
강점/약점이 보이는 개인 대시보드"를 구현해줘.

핵심 원칙:
1. Competency.canDoStatements Json? 필드 추가하고, 기존 rubricByLevel 텍스트를
   기반으로 6개 역량 × 5레벨 = 30개의 1인칭 "~할 수 있어요" 문장을 채워줘(콘텐츠
   작업, 새 LLM 호출 아님).
2. CompetencyDashboard.tsx의 "역량 스킬 트리"를 "나의 강점 Top 3" / "성장 포인트
   Top 3" 두 카드로 재구성 — θ/percentile 숫자는 기본 화면에서 빼고 상세보기
   토글 뒤로만.
3. 성장 추이는 θ 델타 숫자 대신 growthNarrative()로 만든 문장으로.
4. 개인 대시보드에는 danger(빨강) 색상 쓰지 마 — success/warning까지만.
5. 새 LLM 호출 추가하지 마 — 전부 정적 콘텐츠 + 코드 분기로.

스키마 변경 있으니 npx prisma migrate dev + npm run build 확인하고
docs/STATUS.md에 정리해줘.
```
