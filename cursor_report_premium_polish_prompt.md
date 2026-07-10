# 면접 리포트 프리미엄 폴리시 배치 — 커서용 스크립트

## 이미 직접 고친 것 (참고용, 다시 안 해도 됨)
- `CertificateView.tsx`: "HR_IN Competency Certificate" → "AXHRD Competency Certificate" 브랜드명 오타 수정 완료.
- `CompetencyDashboard.tsx`: 레이더/라인 차트 하드코딩 hex(`#3d7ea6`, `#c9a227`, `#e8e4dc`, `#64748b`, `#fff`) → CSS 커스텀 프로퍼티(`var(--color-primary)`, `var(--color-gold)`, `var(--color-card-border)`, `var(--color-muted)`, `var(--color-card)`)로 교체 완료.

아래는 나머지 항목. 전부 **스키마 변경 없음**, 새 의존성도 없음(`recharts`/`framer-motion` 이미 설치돼 있음).

## 1. 리포트 페이지에 인증서 비주얼 언어 백포트

`/profile/certificate`의 `CertificateView.tsx`가 리포트 페이지(`/interview/[sessionId]/report/page.tsx`)보다 훨씬 고급스러운데 서로 스타일이 따로 놀고 있음. 리포트 페이지의 **요약 카드**(현재 `card-luxe flex ... p-6` 안에 `ScoreGauge` + 텍스트) 섹션에:
- 상단에 인증서와 같은 eyebrow 라벨 스타일(`text-xs font-semibold uppercase tracking-[0.3em] text-gold`) 추가 — 예: "AXHRD Interview Report"
- 요약 카드 테두리를 인증서와 통일감 있게(`border-double border-gold/40` 정도로 톤 낮춰서 — 인증서만큼 진하면 리포트가 너무 무거워지니 약하게).
- `ScoreGauge` 주변 톤을 인증서 페이지와 동일한 골드 포인트로 맞춤.

## 2. 역량별 분석에 레이더 차트 추가

`report.sections[]`의 `{title, score}`를 `CompetencyDashboard.tsx`에서 이미 쓰는 것과 같은 `RadarChart`(recharts) 패턴으로 시각화. "역량별 분석" 섹션 최상단에 작은 레이더 차트 하나 배치(높이 220~260px 정도, 대시보드보다 작게) — 그 아래 기존 텍스트 카드들은 그대로 유지. 색상은 반드시 CSS 변수(`var(--color-primary)` 등) 사용, 하드코딩 금지(위 1번 수정과 일관되게).

## 3. `mockReport()` 폴백 품질 개선

`lib/claude/report.ts`의 `mockReport()`가 DeepSeek 장애/미설정 시 모든 사용자에게 **완전히 동일한** 문구(`"구체적 수치와 본인 역할을 포함하세요."` 등)와 원시 `θ=0.32` 텍스트를 그대로 노출하고 있음. 새 LLM 호출 추가 없이, 코드 분기만으로 개선:
- `sections[].content`에서 `θ=${theta}` 원시 수치 노출 제거하고, 레벨/백분위 기준 자연어 문장으로 치환(예: `percentile >= 70` → `"상위권 역량으로 안정적인 답변을 보였습니다."`, `percentile < 40` → `"기초 역량부터 다시 다지면 좋겠습니다."` 등 3~4단계 구간 분기).
- `sections[].suggestions`도 점수 구간별로 2~3개 템플릿을 미리 준비해서 순환 배정(완전 동일 문구 노출 방지) — 역량 코드를 시드로 써서 결정론적으로 고르면 됨(랜덤 아님, 같은 세션 다시 봐도 같은 문구 나오게).
- `nextSteps`도 최약체 역량 이름을 문장에 삽입하는 정도로만 개인화(예: `"${weakest} 영역 L1~L2 문항 반복 연습"`) — 이미 `strengths`/`improvements`에서 하듯 최소한의 삽입만.

## 4. 역량별 분석 아코디언(펼치기/접기)

"역량별 분석" 섹션의 각 역량 카드를 기본은 요약(제목+점수%+`highlight` 인용문)만 보이게 하고, `content`/`suggestions` 상세는 클릭 시 펼쳐지는 구조로. 새 데이터 불필요 — 기존 `ReportSection` 그대로, 클라이언트 컴포넌트로 감싸서 `useState` 토글만 추가(`framer-motion`의 `AnimatePresence`로 펼침 애니메이션, 이미 설치돼 있음). 레이더 차트(2번)는 항상 보이고, 텍스트 상세만 접힘.

## 5. 세션 타임라인 카드 통일

"세션 타임라인" 섹션만 유일하게 `card-luxe` 래핑이 없어서 배경에 붕 떠 보임. `<section>`을 `card-luxe p-6`로 감싸서 다른 섹션들과 통일.

## 6. "왜 이 질문인가요?" 노출 방식 고급화

`lib/interview/rationale.ts`가 생성하는 한 줄 설명이 지금은 평범한 본문 텍스트로만 노출됨(정확한 노출 위치는 `InterviewSession.tsx`에서 확인). `lucide-react`의 `Info` 아이콘 + 짧은 라벨("질문 근거") + 클릭/호버 시 나타나는 말풍선(툴팁) 형태로 교체. 로직 변경 없이 UI 컴포넌트만 — 이게 "AI가 근거를 투명하게 보여준다"는 인상을 주는 장치이므로 존재감을 키우는 게 핵심.

## 7. 대시보드 레이더 차트 — 미시도 역량 시각적 구분

`CompetencyDashboard.tsx`의 레이더 차트에서 미시도 역량이 0%로 찍혀 마치 낙제한 것처럼 보임. `latestByCompetency[code].assessed === false`인 축은 점선 스타일(`strokeDasharray`)이나 낮은 opacity로 구분 처리 — recharts `Radar` 컴포넌트 자체는 축 단위 스타일링이 제한적이니, 데이터 포인트에 `assessed` 플래그를 같이 넘기고 커스텀 dot 렌더러(`dot={<CustomDot />}`)로 미시도 포인트만 다른 색(`var(--color-muted)`, 투명도 낮게)으로 그리는 방식 사용.

## 8. PDF 프린트 전용 레터헤드

`@media print` 규칙에, 리포트 페이지 인쇄 시에만 상단에 로고+"AXHRD Interview Report"+발급일이 들어간 헤더 바를 추가(화면에는 안 보이고 `print:block`류로 인쇄시에만 노출). 인증서 페이지의 더블 골드 보더 느낌을 리포트 인쇄본에도 살짝(얇게) 적용해서, 커리어센터 상담사 등에게 출력물로 전달될 때도 격식 있어 보이게.

## 원칙

- 스키마 변경 없음, 새 LLM 호출 추가 없음, 새 npm 의존성 없음.
- 모든 색상은 `globals.css`의 CSS 커스텀 프로퍼티(`var(--color-*)`)만 사용 — 하드코딩 hex 금지.
- 아코디언/애니메이션은 기존 `framer-motion` 재사용.
- `mockReport()` 개선은 랜덤이 아니라 결정론적 분기(같은 세션 다시 열어도 같은 문구).
- 작업 끝나면 `npm run build` 확인하고 `docs/STATUS.md`에 변경 파일 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_report_premium_polish_prompt.md)에 정리된 면접 리포트 프리미엄
폴리시 배치를 구현해줘. 문서 맨 위에 적힌 "이미 직접 고친 것" 2개는 건드리지
말고, 1~8번 항목을 구현하면 돼.

핵심 원칙:
1. 스키마 변경 없음, 새 LLM 호출 추가 없음, 새 npm 패키지 설치 없음 — 전부
   recharts/framer-motion 등 이미 있는 것만 재사용.
2. 색상은 반드시 globals.css의 CSS 변수(var(--color-*))만 써 — 하드코딩 hex
   쓰지 마.
3. mockReport() 개선은 랜덤이 아니라 점수/역량 기준 결정론적 분기여야 해(같은
   세션 다시 열어도 같은 문구 나와야 함).
4. 아코디언은 레이더 차트는 항상 보이고 텍스트 상세만 접히는 구조로.
5. "왜 이 질문인가요?" 노출은 로직 변경 없이 UI(아이콘+툴팁)만 바꿔.

끝나면 npm run build 확인하고 docs/STATUS.md에 정리해줘.
```
