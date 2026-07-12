# Handoff: AXHRD 홈페이지 리디자인 (v2.0)

## Overview

AXHRD (axhrd.com) — 역량 성장 플랫폼 — 의 새로운 마케팅 홈페이지 디자인입니다.
"쌓이는 역량, 보이는 준비"라는 브랜드 프로미스를 중심으로, **전문성**(precise mono labels, 실제 제품 UI 프리뷰, 데이터 기반 스토리)과 **친근함**(따뜻한 크림톤, editorial 타이포, 한국어 자연스러운 카피)을 동시에 담았습니다.

주요 섹션:
1. **Hero** — 브랜드 태그라인 + 실제 인터뷰 세션 UI 프리뷰
2. **Products** — 6개 모듈 (Discover · Resume · Interview · Practice · Growth · Diagnostic)
3. **Problem** — 4개 페인포인트 (다크 에디토리얼 밴드)
4. **Process** — 4-step 성장 루프 (시각화 포함)
5. **Why AXHRD** — 4가지 원칙
6. **Audiences** — 4개 타겟 (탭 전환, 각 타겟별 실제 대시보드 미니 프리뷰)
7. **Testimony** — 풀-쿼트
8. **CTA + Footer**

---

## About the Design Files

이 번들의 파일들은 **HTML로 만들어진 디자인 레퍼런스**입니다 — 최종 룩앤필과 인터랙션 의도를 보여주는 프로토타입이지, 그대로 프로덕션에 붙여넣을 코드가 아닙니다.

개발자의 임무는 **대상 코드베이스(Next.js / Nuxt / Astro / SwiftUI 등)의 기존 환경 안에서 이 디자인을 재현**하는 것입니다. 코드베이스에 아직 프론트엔드 환경이 없다면, 프로젝트에 가장 적합한 프레임워크를 선택해 구현하세요.

권장 스택: **Next.js 14 (App Router) + Tailwind CSS + Framer Motion** — 이 디자인의 typography-heavy editorial 접근과 마이크로 인터랙션에 적합.

---

## Fidelity

**High-fidelity (hifi).** 이 디자인은 픽셀 퍼펙트 목업입니다:
- 최종 색상 (hex + oklch tokens 확정)
- 최종 타이포그래피 (Inter · Instrument Serif · JetBrains Mono · Pretendard)
- 최종 간격 · 라운드 · 그림자 토큰 (`colors_and_type.css`에 정의됨)
- 최종 인터랙션 명세 (hover · press · transition timings)
- 최종 카피 (그대로 사용 가능)

개발자는 이 디자인을 픽셀 단위로 재현해야 하며, 색상 · 여백 · 폰트 크기 · 애니메이션 타이밍을 임의로 바꾸지 마세요. 브랜드 시스템은 이미 정의되어 있습니다.

---

## Screens / Views

이 디자인은 **단일 페이지 (single-page marketing site)**로, 스크롤로 이어지는 여러 섹션으로 구성됩니다.

### 0. Sticky Navigation (모든 섹션 상단 고정)

- **위치:** `position: sticky; top: 0; z-index: 50`
- **높이:** 약 60px (padding 14px 32px)
- **배경:** `rgba(245, 237, 228, 0.78)` + `backdrop-filter: blur(20px)` (frosted cream)
- **보더:** 하단 `1px solid #D9CFC3` (ink-200)
- **레이아웃:** flex, `justify-content: space-between`, `max-width: 1240px`, `padding: 0 32px`
- **구성:**
  - **좌: Brand** — 로고 아이콘 (26x26px) + `axhrd` (17px, weight 700, tracking -0.03em) + `.` (coral-500)
  - **중: Menu** — Products / 성장 여정 / 기관·기업 / 왜 AXHRD / 가격 (13.5px, weight 500, color ink-500, gap 28px). "Products"는 `has-sub` 화살표 (아래방향 chevron ▾).
  - **우: CTA** — `로그인` (btn-ghost, 8px 14px) + `무료로 시작 →` (btn-primary, 8px 14px)
- **인터랙션:** 메뉴 링크 hover → color transitions to ink-900 (200ms ease)

### 1. Hero

- **위치:** 페이지 최상단, `padding: 88px 0 40px`
- **배경 이펙트:** 우상단 radial glow `radial-gradient(circle, rgba(255,107,71,0.10), transparent 55%)`, 800x800px, top: 0, right: -100px
- **구성 (위→아래):**

  **1-A. Top pill row (마진 40px)**
  - **Live pill:** `padding: 6px 12px`, background `cream-50`, border `1px solid ink-200`, radius 999px, font mono 11px, `letter-spacing 0.12em`, uppercase, color ink-700
    - 좌측 6x6px coral-500 dot with `pulse` 애니메이션 (2s ease-in-out infinite, opacity 1↔0.4)
    - 텍스트: `● 월 3회 무료 면접 · Live`
  - **Caption:** `역량 성장 플랫폼 · v2` (mono 11px, letter-spacing 0.12em, color ink-400)

  **1-B. Headline grid (`1.55fr : 1fr`, gap 64px, align-items: end)**
  - **좌 (h1):** `쌓이는 역량, / 보이는 준비.` — 108px, weight 700, tracking -0.055em, line-height 0.92. "보이는"은 `.serif` (Instrument Serif italic, weight 400, tracking -0.02em). 문장 끝 마침표는 coral-500.
  - **우:** 서브 카피 3줄 (16px, line-height 1.7, ink-500), strong 부분은 ink-900 weight 600.
    ```
    자소서 · 면접 · 진단까지 한 계정에서.
    감정 AI 없이, 같은 루브릭으로 공정하게.
    질문은 자소서 문장을 근거로 인용합니다.
    ```
  - CTA 버튼 2개: `지금 시작하기 →` (btn-primary, 14px 22px, font 14px) + `성장 여정 보기 →` (arrow-link, 화살표는 hover 시 4px translateX 200ms ease)

  **1-C. Product preview card (마진 top 72px)**
  - **컨테이너:** background cream-50, `1px solid ink-200`, radius 20px, padding 6px, `shadow-lg`.
  - **Top bar (브라우저 chrome):** padding 10px 14px, border-bottom ink-200
    - 좌: 3개 회색 dot (10px, ink-200)
    - 중앙: URL pill `axhrd.com/interview · ● session live` (mono 11px, ink-400. "session live"는 coral-500)
  - **Body (2 컬럼 `1.2fr : 1fr`, gap 32px, padding 32px, background cream-100, radius 14px, min-height 360px):**

    **좌 컬럼:**
    - **Question card** (cream-50, border ink-200, radius 14px, padding 20px):
      - Label row: `Q · 03 · 자소서 근거 인용` (mono 10px, letter-spacing 0.15em, uppercase, ink-400. "Q · 03"은 coral-500)
      - Question text (16px, weight 500, line-height 1.55): 인용 부분(`"협업 중 갈등 상황"`, `본인이 먼저 제안한 해결책`)은 Instrument Serif italic + coral-600, padding 0 2px
      - Quote block (12px 10px, background cream-100, left border 2px coral-500, radius 0 6px 6px 0, 13px, ink-500, line-height 1.55): `"…팀원 간 방향이 달랐지만, 저는 세 가지 옵션을 정리해 공유했고…" — 자소서 P.2 · L.14`
    - **Mic recording bar** (ink-900 background, cream-100 text, radius 14px, padding 18px 20px, flex gap 14px):
      - 좌: 44px coral-500 원형 mic icon, box-shadow `0 0 0 6px rgba(214,74,44,0.2)`
      - 중: `답변 녹음 중 · 00:42` (13px weight 600) + `Voice · Follow-up ready` (mono 10px, letter-spacing 0.12em, uppercase, rgba(245,237,228,0.5))
      - 우: 7-bar animated waveform, 2.5px width bars, coral-300 fill, radius 2px, height 24px 컨테이너, 각 bar `wave` 애니메이션 1.2s ease-in-out infinite with staggered delays (0, 0.1s, 0.2s, 0.3s, 0.15s, 0.05s, 0.25s)

    **우 컬럼 (Score panel, cream-50, border ink-200, radius 14px, padding 22px, flex-col gap 18px):**
    - 헤드: `Competency θ` (mono label 10px) + `NCS · 문제해결` (15px weight 600)
    - Big score: `82/100` (56px weight 700 tracking -0.04em ink-900 + 20px weight 500 ink-400)
    - Trend: `↗ +6 · vs. 지난 세션` (mono 10px, letter-spacing 0.12em, color moss-500 #4A6244)
    - 4개 progress bars (구조화 88, 근거 인용 91, 직무 적합도 76, 성장 궤적 84):
      - Row: label (12px, weight 500, ink-500) + value (mono 11px, ink-700)
      - Track: 4px height, background cream-200, radius 999px
      - Fill: height 100%, radius 999px. 색상 배치: default ink-900, "근거 인용"은 coral-500, "성장 궤적"은 moss-500
    - Footer meta: `감정 AI 없음 · 같은 루브릭 · 재현 가능` (mono 10px, letter-spacing 0.12em, uppercase, ink-400, border-top ink-200 padding-top 12px)

  **1-D. Social proof strip (margin-top 80px, padding 56px 0 40px, border-top ink-200)**
  - Flex row, gap 48px
  - 좌 라벨: `국내 대학 취업센터 · / 기업 HR팀에서 사용 중` (mono 10px, letter-spacing 0.2em, uppercase, ink-400, max-width 180px)
  - 우 로고 스트립: opacity 0.7, gap 44px, `justify-content: space-between`. 로고 6개 (텍스트 워드마크로 대체됨):
    - `서울대학교` (sans 20px weight 600)
    - `Yonsei` (serif italic 22px)
    - `KAIST` (sans 20px weight 600)
    - `Korea Univ.` (serif italic)
    - `POSTECH` (sans)
    - `Sungkyunkwan` (serif italic)

  > **Note:** 실제 배포 시 대학/기업 실제 로고 SVG로 교체하세요. 각 대학과의 사용 계약이 확인된 경우에만 로고 사용.

### 2. Products

- **위치:** hero 다음, `padding: 120px 0 100px`, `border-top: 1px solid ink-200`
- **Section head (grid `1.4fr : 1fr`, gap 64px, align-items: end, margin-bottom 56px):**
  - **좌:**
    - Eyebrow: `● Product lineup · 6 modules` (mono 11px, letter-spacing 0.24em, coral-500, with 6px coral dot prefix)
    - Title (h2): `필요한 모듈만 켜고, / 데이터는 하나에.` — 60px weight 700 tracking -0.045em line-height 1.02. "하나"는 serif italic.
  - **우:** 부제 (16px, line-height 1.65, ink-500): `자기탐색 · 자소서 · 면접 · 연습 · 역량 · 조직 진단. / 개인과 기관이 같은 역량 언어를 씁니다.`
- **6-card grid (3 columns, gap 16px):**
  - **Card 컴포넌트:** background cream-50, border ink-200, radius 16px, padding 28px 26px 24px, flex-col gap 12px, min-height 260px, `cursor: pointer`
  - **Hover:** `transform: translateY(-3px)`, `box-shadow: shadow-lg`, `border-color: ink-300`. 화살표는 `translate(4px, -4px)` + color coral-500. Transitions 240ms ease.
  - **Card 내부 구조:**
    1. Head row (space-between): mono label (10px, letter-spacing 0.2em, uppercase, ink-400, 예: `01 · Discover`) + `↗` (20px, ink-400 → coral-500 on hover)
    2. Product name (26px, weight 700, tracking -0.03em, ink-900)
    3. Description (14px, line-height 1.6, ink-500)
    4. Tags row (margin-top auto, padding-top 16px, flex gap 6px flex-wrap): 각 tag는 padding 4px 9px, radius 999px, background cream-100, border ink-200, mono 10px, letter-spacing 0.06em, ink-700. `.tag.coral`는 background coral-100, coral-600 텍스트.
  - **6개 카드 콘텐츠:**
    | # | Label | Name | Desc | Tags |
    |---|---|---|---|---|
    | 01 | Discover | 나를 발견하기 | 강점 · 가치관 카드로 스토리의 뼈대를 만듭니다. | 카드스토리 / 강점 · 가치관 |
    | 02 | Resume | 자소서 리뷰 | JD 키워드와 문장 구조를 맞추고, 면접 질문의 근거를 만듭니다. | JD 맞춤 피드백 (coral) / 키워드 · 82점 |
    | 03 | Interview | AI 면접 | 자소서 인용 질문에 음성으로 답하고, 꼬리질문 1회로 깊이를 봅니다. | 근거 인용 · IRT / 음성 · 꼬리질문 (coral) |
    | 04 | Practice | 질문 덱 | 스와이프로 연습, 직무별로 저장. 짧게 자주, 답변의 근육을 만듭니다. | 스와이프 연습 / 직무별 저장 |
    | 05 | Growth | 역량 트래킹 | θ 스케일과 스킬 트리로 성장을 숫자로 남기고, 인증서로 증명합니다. | θ · 스킬 트리 / NCS 인증서 |
    | 06 | Diagnostic | 조직 진단 | ARC Index로 조직의 강·약점을 진단하고, 웨이브 · 팀 리포트로 축약합니다. | ARC Index / 웨이브 · 팀 리포트 |
  - **Card 03 (Interview)은 다크 카드**: background ink-900, border transparent. label opacity 0.5, arrow는 coral-300. Name은 cream-100, desc는 rgba(245,237,228,0.6). Tags: 첫번째는 rgba(245,237,228,0.08) background, cream-100 텍스트; 두번째는 coral-500 background, 흰 텍스트.

### 3. Problem (Dark Editorial Band)

- **위치:** products 이후, full-bleed (`margin: 0 calc(50% - 50vw)`, `padding: 120px calc(50vw - 50%)`)
- **배경:** ink-900, cream-100 텍스트
- **Overlay:** 상단 좌측 10% 위치, 600x600px, `radial-gradient(circle, rgba(255,107,71,0.12), transparent 60%)`
- **Inner (max-width 1240px, padding 0 32px):**
  - Eyebrow: `● Problem · 이런 고민 있으신가요` (coral-300)
  - Title: `면접·자소서·진단이 / 따로 놀지 않게.` (cream-100, 60px, "따로"는 serif italic, 마침표는 coral-300)
  - Subtitle (17px, line-height 1.65, rgba(245,237,228,0.7), max-width 560px, margin 24px 0 64px): `준비도 운영도 성과가 남지 않을 때, 문제는 도구가 아니라 연결입니다.` ("연결"은 serif italic, cream-100)
  - **4-column pain grid (gap 24px):**
    - 각 pain 카드는 border-top rgba(245,237,228,0.15), padding 28px 4px 20px 0, flex-col gap 12px
    - Structure: mono label (11px, letter-spacing 0.24em, coral-300, uppercase 예: `01 · Verify`), h4 (20px, weight 600, tracking -0.02em, cream-100), p (13.5px, line-height 1.65, rgba(245,237,228,0.65))
    - 4개 pain points:
      - 01 · Verify — 면접만으로 역량 검증이 어려움
      - 02 · Scatter — 준비 도구가 흩어져 있음
      - 03 · Measure — 기관 코호트 성과 측정의 어려움
      - 04 · Bias — 채점 기준의 불투명함
  - **Outro (margin-top 72px, padding-top 40px, border-top rgba cream 0.15, flex space-between align-items end, gap 40px):**
    - 좌: `이제, 명확한 역량 기준과 / 연결된 준비 · 평가로 해결하세요.` — Instrument Serif italic 32px weight 400, "해결하세요."는 coral-300
    - 우: btn on-dark (coral-500 bg, white text, 14px 22px), 텍스트 `해결책 보기 →`

### 4. Process (Growth Loop)

- **위치:** `padding: 120px 0`, `border-top: 1px solid ink-200`
- Section head 구조는 Products와 동일:
  - Eyebrow: `● Growth loop · 4 steps` (coral-500)
  - Title: `탐색에서 면접까지, / 끊기지 않는 여정.` ("여정"은 serif italic)
- **4-step container:** margin-top 64px, `1px solid ink-200`, radius 16px, background cream-50, `overflow: hidden`
- **Grid 4 columns, gap 0.** 각 step 사이에는 `border-left 1px solid ink-200` (첫번째 제외).
- **각 step (padding 32px 28px 36px):**
  - Idx row: `STEP 01 · Discover` (mono 10px, letter-spacing 0.2em, ink-400. "STEP 01"은 coral-500 weight 600). margin-bottom 40px.
  - Visual (aspect-ratio 1.4/1, margin-bottom 24px, radius 10px, cream-100, border ink-200, centered content):
    - **STEP 01 Card stack:** 3장의 카드를 회전시켜 겹침. 위치 inset 20% 15%.
      - c1: left 0, top 6%, rotate -6deg, background coral-100
      - c2: left 20%, top 0, rotate 2deg, background cream-50
      - c3: left 40%, top 4%, rotate 8deg, background ink-900 (라인은 coral-300)
      - 각 카드는 width 60%, height 100%, border ink-200, radius 8px, shadow-sm. 카드 내부에 2개의 line 요소 (5px height, ink-300 background, opacity 0.5, radius 3px): line.a top 20% left 15% width 40%, line.b top 40% left 15% width 70%.
    - **STEP 02 Resume doc:** width 78%, height 82%, cream-50 background, border ink-200, radius 6px, padding 14px 12px, flex-col gap 4px, shadow-sm.
      - 6개 rline (4px height, ink-200 background, radius 3px). 2번째와 5번째는 `.hl` (coral-500 background). 3번째와 5번째는 `.short` (width 45%).
      - Score row (margin-top 6px, baseline flex gap 4px): `82 /100 · JD 매칭` (22px weight 700 ink-900 + mono 9px letter-spacing 0.15em uppercase ink-400)
    - **STEP 03 Mic:** flex-col centered gap 14px.
      - Disc: 64x64 circle, ink-900 background, box-shadow `0 0 0 6px rgba(214,74,44,0.15), 0 0 0 12px rgba(214,74,44,0.06)`. Mic icon SVG (24px, stroke coral-300 2px, round caps).
      - Wave: 20px height, 7 bars with ink-700 fill (same wave animation as hero).
    - **STEP 04 Skill tree:** 3x3 grid, gap 8px, width 78%, padding 0 6px.
      - 9 nodes (aspect-ratio 1, radius 8px, mono 9px letter-spacing 0.05em ink-500, centered). Default cream-50 with ink-200 border.
      - `.on` state (coral-500 bg, white text, transparent border) applied to positions: [0,1] (A2), [1,0] (B1), [2,1] (C2)
      - `.ink` state (ink-900 bg, cream-100 text, transparent border) at center [1,-1]. Contains `θ` in Instrument Serif italic 16px.
      - Cells: A1 A2 A3 / θ B1 B2 / C1 C2 C3
  - h4 (20px, weight 700, tracking -0.02em, margin-bottom 10px):
    - STEP 01: 나를 발견하기
    - STEP 02: 자소서 리뷰
    - STEP 03: 구조화 AI 면접
    - STEP 04: 질문 덱 · 역량 트래킹
  - p (13.5px, line-height 1.6, ink-500): (Products 섹션과 동일한 카피 사용, README 위쪽 참고)

### 5. Why AXHRD

- **위치:** full-bleed cream-50 band, `padding: 120px 0`, border-top ink-200
- Section head:
  - Eyebrow: `● Why AXHRD · 4 principles`
  - Title: `공정한 채점, 맞는 난이도, / 눈에 보이는 성장.` ("눈에 보이는"은 serif italic)
  - Subtitle: `감정 AI 없이 루브릭 기반으로 채점합니다. / 기준은 문서로, 결과는 인용 문장과 함께 제공됩니다.`
- **4-card grid (gap 20px), margin-top 56px:**
  - Card: padding 32px 24px, cream-100 background, ink-200 border, radius 16px, flex-col gap 12px, min-height 260px.
  - Icon box (36x36 radius 8px, ink-900 bg, cream-100 text, centered, margin-bottom 12px). 첫번째 카드는 `.hero-p` → icon bg는 coral-500.
  - h4 (19px, weight 700, tracking -0.02em, line-height 1.2)
  - p (13.5px, line-height 1.6, ink-500)
  - Foot (margin-top auto, padding-top 16px, border-top ink-200): mono 10px letter-spacing 0.15em uppercase ink-400
  - **4개 principle:**
    1. **투명한 채점** (hero-p, coral icon): 감정 AI 없이, 같은 루브릭으로 세션을 공정하게 비교합니다. — Same rubric · Repeatable
    2. **맞춤 난이도**: 실력에 맞는 문항을 고르고, 왜 이 질문인지도 함께 알려 줍니다. — IRT · Adaptive
    3. **성장이 남습니다**: 개인 역량 점수와 기관 코호트 지표를 숫자로 남깁니다. — θ score · Cohort
    4. **NCS 공식 역량**: 직업기초능력 정의를 루브릭에 반영한 한국형 기준입니다. — NCS · Korea standard
  - **아이콘 SVG** (24px viewBox, stroke 1.75, round caps/joins) — colors_and_type.css의 Lucide-alike:
    1. Chart 아이콘 (line path): `M3 6l3 12 6-3 6 3 3-12`
    2. Grid 2x2: 네 개의 사각형 `M4 4h6v6H4z` 등
    3. Pulse line: `polyline 22 12 18 12 15 21 9 3 6 12 2 12`
    4. Connection: `M20 7h-9`, `M14 17H5`, `circle 17 17 r=3`, `circle 7 7 r=3`

### 6. Audiences (Tabbed)

- **위치:** `padding: 120px 0`, border-top ink-200
- Section head:
  - Eyebrow: `● Platform · 4 audiences`
  - Title: `개인 성장과 기관 운영, / 같은 데이터 위에서.` ("같은"은 serif italic)
- **Tabs (margin-top 40px, margin-bottom 32px):** pill container — cream-50 bg, ink-200 border, radius 999px, padding 5px, `width: fit-content`.
  - 4 tabs, gap 4px. 각 탭: padding 10px 20px, radius 999px, 13.5px weight 500 ink-500.
  - Active tab: ink-900 background, cream-100 텍스트.
  - Hover: color to ink-900.
  - Transition: 200ms ease.
- **Panel (display: none, `.active`이면 grid `1fr 1fr` gap 48px):** padding 40px, cream-50 background, ink-200 border, radius 20px, align-items center.
  - **좌:**
    - h3 (40px weight 700 tracking -0.035em line-height 1.05, margin-bottom 20px). 한 단어를 serif italic로 강조.
    - p (15px, line-height 1.65, ink-500, margin-bottom 24px)
    - `.aud-checks` (ul, flex-col gap 12px):
      - 각 li는 flex align-start gap 10px, 14px ink-900 line-height 1.55.
      - Before: 6x6 원, coral-500 background, margin-top 8px.
  - **우 (Mock data card):** cream-100 background, ink-200 border, radius 14px, padding 24px, min-height 320px, flex-col gap 14px.
    - Head row (border-bottom ink-200 padding-bottom 12px): title (13px weight 600 ink-900) + label (mono 10px letter-spacing 0.15em uppercase ink-400)
    - Stat row (3 columns, padding 8px 0): 각 stat — 24px weight 700 tracking -0.02em value with 13px ink-400 unit, mono 9px letter-spacing 0.12em uppercase ink-400 label.
    - Chart 또는 리스트 (섹션별로 다름).
- **4개 audience:**

  #### 6-A. 취업준비생 (Student, default active)
  - h3: `혼자 연습해도 / 기록은 남는다.` ("기록"은 serif italic)
  - p: 월 3회 무료 면접, 자소서 리뷰, 스와이프 연습 덱. 준비의 모든 순간이 θ 점수와 스킬 트리에 쌓입니다.
  - Checks: 회원가입 후 월 3회 무료 면접 / 자소서 → 질문 → 역량 점수가 한 계정에 연결 / 답변 원문은 나만 · 인용 근거는 항상 함께
  - Mock: Personal · Last 30 days. Stats: `14회` Sessions / `+6θ` Growth / `82/100` JD match.
  - Chart (mock-chart, 120px height, cream-50 background, border ink-200, radius 8px, padding 12px, flex-end gap 6px): 8개 바 with heights [40, 55, 45, 65, 58, 72, 68, 88] percent. 마지막 바는 coral-500 (`.bar.coral`), 나머지는 ink-900 with opacity 0.85. 각 bar `flex: 1`, radius 3px 3px 0 0.
  - Chart caption (mono 10px letter-spacing 0.12em uppercase ink-400, text-align right): `역량 궤적 · Weekly`

  #### 6-B. 대학 취업센터 (Uni)
  - h3: `진단 웨이브를 / 한번에 배포.` ("한번에"은 serif italic)
  - p: 취업센터는 인터뷰 킷을 설계하고, 학생은 링크만 열면 됩니다. 완료율·역량 평균·팀별 리포트를 자동으로 받아보세요.
  - Checks: 기관 킷 · 공유 링크로 대규모 배포 / 완료율 · 역량 평균 · 학과별 격차 리포트 / 개인 답변 원문은 지키고, 집계 지표만 확인
  - Mock: Cohort · 2026 여름 웨이브 · N=428. Stats: `92%` 완료율 / `74θ` 평균 / `12팀` Active.
  - Cohort list (4 rows). Each row: flex align-center gap 10px, 12px, padding 6px 0, border-bottom 1px dashed ink-200 (last: none). 좌 6x6 dot (moss-500 or ochre-500 for warn) + name (flex 1, ink-700, weight 500) + val (mono, ink-500).
    - 경영학과 · 3학년 — 78 θ · 96% (moss)
    - 컴공 · 4학년 — 81 θ · 94% (moss)
    - 인문 · 3학년 — 68 θ · 82% (ochre warn)
    - 디자인 · 4학년 — 76 θ · 90% (moss)

  #### 6-C. 기업 채용 · HR (Corp)
  - h3: `같은 루브릭으로 / 공정하게 비교.` ("공정하게"은 serif italic)
  - p: 지원자 풀이 커져도 평가자별 편차 없이. 자소서 인용 질문과 재현 가능한 채점 기준으로 감이 아닌 증거로 결정하세요.
  - Checks: JD 업로드 → 자동 질문 세트 생성 / 평가자 간 재현성 · 감정 AI 없이 / ATS · 사내 HRIS와 연동 가능
  - Mock: Corp · 지원자 랭킹 · JD-004. Stats: `1,240` 지원자 / `96%` 재현성 / `3.2일` 평가 리드타임.
  - Ranking list (4 rows): 랭킹 번호 (mono 11px weight 600, 1위는 coral-500, 나머지는 ink-500) + 이름 + val
    - 01 이○윤 — 91 θ · 매치 A
    - 02 김○호 — 88 θ · 매치 A
    - 03 박○수 — 85 θ · 매치 B
    - 04 최○아 — 83 θ · 매치 B

  #### 6-D. 조직 진단 · 코호트 (Org)
  - h3: `ARC Index로 / 조직을 읽습니다.` ("읽습니다"은 serif italic)
  - p: 웨이브 · 팀 리포트로 조직 진단을 축약. 팀별 강·약점과 성장 궤적을 한눈에 확인하고, 개입 시점을 놓치지 않습니다.
  - Checks: ARC Index · 조직 역량 3축 진단 / 팀별 리포트 · 개입 시점 알림 / 익명 집계 · 개인 지목 없음
  - Mock: Org · ARC Index · Q2 2026. Stats: `A · 78` Adapt / `R · 82` Resilience / `C · 71` Cohesion.
  - Chart: 6 bars [78, 82, 71, 65, 74, 79]%. 두번째 bar (R) 는 coral-500.
  - Chart caption: `팀별 · Q2 → Q3 변화`

### 7. Testimony (Pull Quote)

- **위치:** `padding: 140px 0`, border-top ink-200, `text-align: center`, position relative overflow hidden.
- **배경 이펙트:** 중앙 900x900px radial `rgba(255,107,71,0.06)`, translate(-50%,-50%)
- **Quote mark:** `"` (Instrument Serif 120px coral-500, line-height 0.3, height 60px, margin-bottom 24px)
- **Quote text (Instrument Serif italic 48px weight 400 tracking -0.025em line-height 1.2, max-width 900px, margin 0 auto 40px, ink-900):**
  ```
  질문이 자소서에서 나오니까,
  학생들이 진짜 자기 이야기를 하기 시작했어요.
  ```
  ("진짜 자기 이야기"는 coral-500)
- **Author (mono 11px, letter-spacing 0.24em, uppercase, ink-400):** `이지현 · 서울권 A대학 취업센터장 · 누적 응시 1,200명` (이름은 ink-900 weight 600)

  > **Note:** 프로덕션 배포 전 실제 고객 인용문 · 실명 사용 동의 확보 필요.

### 8. CTA (Dark, Full-bleed)

- **위치:** full-bleed, `padding: 100px calc(50vw - 50%)`, ink-900 background, cream-100 text
- **Overlay:** 상단 우측 -100px, 700x700px, `radial-gradient rgba(255,107,71,0.18)`
- **Inner:** max-width 1240px, padding 0 32px, grid `1.3fr : 1fr`, gap 64px, align-items: end
- **좌 (h2):** `지금, / 시작.` — 72px weight 700 tracking -0.05em line-height 0.95 cream-100. "시작"은 serif italic coral-300. 마침표는 coral-300.
- **우:**
  - p (15px, rgba(245,237,228,0.7), line-height 1.7): `개인은 홈에서, 기관은 설정에서. / 신용카드 없이 시작. 월 3회 면접은 무료입니다. / 기관 웨이브 · 킷 설계는 세일즈에 문의해 주세요.`
  - CTA row: `지금 시작하기 →` (btn.on-dark, coral-500 background, white text) + `세일즈에 문의` (btn.on-dark-ghost, transparent, cream-100 text, `1px solid rgba(245,237,228,0.2)`)

### 9. Footer

- **위치:** `padding: 72px 0 40px`, grid `1.4fr : 3fr`, gap 60px
- **좌 (foot-brand):**
  - Brand mark (22px + logo icon 30x30) with coral dot
  - `역량 성장 플랫폼. / 자소서 · 면접 · 진단, 한곳에서.` (13px, line-height 1.6, ink-500, max-width 280px)
- **우 (foot-cols, grid 4 columns, gap 40px):**
  - **Product:** Discover / Resume / Interview / Practice / Growth / Diagnostic
  - **For:** 개인 / 대학 취업센터 / 기업 채용 · HR / 조직 진단
  - **Company:** 회사 소개 / 블로그 / 채용 / 보도자료
  - **Support:** 고객센터 / 이용약관 / 개인정보처리방침 / 보안
  - 각 컬럼 h4: mono 10px letter-spacing 0.2em uppercase ink-400 margin-bottom 16px weight 500
  - Links: 13.5px ink-700, hover → coral-500 (200ms ease), margin-bottom 10px
- **Copy row (padding 24px 0, margin-top 32px, border-top ink-200, flex space-between align-center, mono 10px letter-spacing 0.15em uppercase ink-400):**
  - 좌: `© 2026 AXHRD Inc. · Seoul → Global`
  - 우 (status): `● All systems operational · v2.0` (6px moss-500 dot with box-shadow ring, text ink-700)

---

## Interactions & Behavior

### Global transitions
- **Default ease:** `cubic-bezier(0.32, 0.72, 0, 1)` (Linear-style ease-out) — `--ease` token
- **Alt strong ease:** `cubic-bezier(0.16, 1, 0.3, 1)` — `--ease-out` token
- **Durations:** 120ms (fast), 200ms (default), 400ms (deliberate)

### Hover states
| Element | Change | Duration |
|---|---|---|
| Menu link | color → ink-900 | 200ms ease |
| btn-primary | background ink-900 → ink-700 | 200ms ease |
| btn-accent / on-dark | coral-500 → coral-600 | 200ms ease |
| btn-ghost | background → cream-200, border → ink-300 | 200ms ease |
| btn.on-dark-ghost | background → rgba(cream,0.06), border → rgba(cream,0.35) | 200ms ease |
| Product card | translateY(-3px), shadow-md → shadow-lg, border ink-200 → ink-300 | 240ms ease |
| Product card arrow (↗) | translate(4px, -4px), color ink-400 → coral-500 | 240ms ease |
| Footer link | color ink-700 → coral-500 | 200ms ease |
| Arrow link (→) | icon translateX(4px) | 200ms ease |

### Press
- All buttons: `transform: scale(0.98)` for 120ms on `:active`.

### Animations (looping)
1. **Live pill dot** (`.pulse`): 2s ease-in-out infinite, opacity 1 ↔ 0.4.
2. **Waveform** (`.wave span`): 1.2s ease-in-out infinite, transform scaleY 0.5 ↔ 1. 7 bars have staggered delays [0, 0.1s, 0.2s, 0.3s, 0.15s, 0.05s, 0.25s].

### Audience tab switching (JS)
- Click `.aud-tab[data-aud]` → toggle `.active` on all tabs (only clicked one gets it) → toggle `.active` on `.aud-panel[data-panel]` matching the `data-aud`.
- Only one panel visible at a time (display: grid vs. none).
- No enter/exit animation (instant switch — 최소 관성).

### Smooth scroll
- All `a[href^="#"]` links intercept click, scroll to target with offset -80px (nav 높이 보정), behavior `smooth`.

### Responsive breakpoint
- `max-width: 960px`:
  - Nav menu hidden
  - Hero h1 → 64px
  - Grids collapse to 1 column (hero grid, section head, CTA inner, preview body, audience panel, footer, footer cols)
  - Products/Why/Problem → 2 columns
  - Process → 2 columns (right border every 2nd)
  - Section titles → 42px
  - Quote text → 30px

---

## State Management

**Client-side only.** No server state needed for the marketing page.

### State variables (React 예시)
```typescript
type Audience = 'student' | 'uni' | 'corp' | 'org';

const [activeAudience, setActiveAudience] = useState<Audience>('student');
```

### 서버 데이터 (optional, 향후 확장)
- 로고 스트립 대학/기업 리스트 — CMS에서 관리 시
- Testimony quote — CMS에서 A/B 테스트 가능
- Live pill 텍스트 (`월 3회 무료 면접`) — 프로모션 관리
- Stat 카드의 mock 데이터 (`14회`, `92%` 등) — 현재는 정적. 실 데이터 연동 시 API 필요.

### 향후 인터랙션 (개발 시 고려)
- **CTA 클릭 → `/auth/register` 이동** (Header + Hero + CTA 섹션 · 총 4개 primary CTAs)
- **세일즈 문의 → `/contact/sales` 또는 modal**
- **Product 카드 클릭 → `/products/<slug>` 이동** (실제 URL: axhrd.com/products/discover, resume, interview, practice, growth, diagnostic)
- **Nav 메뉴 `Products` → 드롭다운 (mega menu)** — 현재 mock에는 chevron만. 실제로는 6개 제품 미니 그리드 표시 권장.

---

## Design Tokens

전체 토큰은 `colors_and_type.css`에 정의되어 있습니다. 아래는 주요 값 발췌.

### Colors — Ink (warm charcoal, not pure black)
| Token | Hex | Use |
|---|---|---|
| `--ink-900` | `#17120F` | Primary text on cream, dark surfaces |
| `--ink-700` | `#2A221D` | Dark card surfaces |
| `--ink-500` | `#6B5D54` | Secondary text |
| `--ink-400` | `#8B7D73` | Captions, mono labels |
| `--ink-300` | `#B3A69B` | Strong borders |
| `--ink-200` | `#D9CFC3` | Hairline dividers |

### Colors — Cream (backgrounds)
| Token | Hex | Use |
|---|---|---|
| `--cream-50` | `#FBF7F1` | Elevated cards |
| `--cream-100` | `#F5EDE4` | **Page background (signature)** |
| `--cream-200` | `#EFE4D5` | Inset panels |
| `--cream-300` | `#E5D6C2` | Pressed states |

### Colors — Coral (accent)
| Token | Hex | Use |
|---|---|---|
| `--coral-600` | `#B83A1F` | Coral text on cream (hover) |
| `--coral-500` | `#D64A2C` | **Primary CTA, brand mark** |
| `--coral-400` | `#E85A38` | Legacy hover |
| `--coral-300` | `#FF6B47` | Accent on dark surfaces |
| `--coral-100` | `#FCE4DA` | Tag / highlight background |

### Colors — Editorial secondaries (data-viz safe)
| Token | Hex | Use |
|---|---|---|
| `--plum-500` | `#6B3F5C` | Muted plum · charts |
| `--moss-500` | `#4A6244` | Positive / growth |
| `--ochre-500` | `#B8842A` | Warning / highlight |
| `--navy-500` | `#2A3F5C` | Info / tech |

### Typography
- **Sans (body + display):** Inter · Pretendard (Korean) — 400/500/600/700/800
- **Editorial italic:** Instrument Serif — 400 italic (only for emphasis words like `보이는`, `여정`, `기록`)
- **Mono (labels + data):** JetBrains Mono — 400/500

| Token | Size | Weight | Tracking | Line-height | Use |
|---|---|---|---|---|---|
| Hero h1 | 108px | 700 | -0.055em | 0.92 | Section 1 |
| Section title (h2) | 60px | 700 | -0.045em | 1.02 | Products, Process, Audience |
| Dark band title | 60px | 700 | -0.045em | 1.02 | Problem |
| CTA h2 | 72px | 700 | -0.05em | 0.95 | Section 8 |
| Quote text | 48px | 400 | -0.025em | 1.2 | Testimony (italic serif) |
| h3 (aud) | 40px | 700 | -0.035em | 1.05 | Audience panels |
| Product name | 26px | 700 | -0.03em | 1.1 | Product cards |
| Step title (h4) | 20px | 700 | -0.02em | 1.2 | Process, Why |
| Body sub | 16px | 400 | 0 | 1.65 | Hero sub, section sub |
| Body | 14–15px | 400 | 0 | 1.6 | Product desc, principle p |
| Mono label | 10–11px | 500 | 0.12–0.24em | — | uppercase everywhere |

### Spacing (8-multiples)
| Token | px | Token | px |
|---|---|---|---|
| `--sp-1` | 4 | `--sp-8` | 32 |
| `--sp-2` | 8 | `--sp-10` | 40 |
| `--sp-3` | 12 | `--sp-12` | 48 |
| `--sp-4` | 16 | `--sp-16` | 64 |
| `--sp-5` | 20 | `--sp-20` | 80 |
| `--sp-6` | 24 | `--sp-24` | 96 |

- Container max-width: `1240px`, gutter `32px`
- Section vertical padding: `120px` (default), `140px` (testimony), `100px` (CTA), `88px 0 40px` (hero)

### Radius
| Token | px | Use |
|---|---|---|
| `--r-xs` | 4 | Inputs |
| `--r-sm` | 6 | Buttons |
| `--r-md` | 10 | Fields, step visual |
| `--r-lg` | 16 | **Cards (signature)** |
| `--r-xl` | 24 | (unused here) |
| `--r-2xl` | 28 | App icons |
| `--r-full` | 999 | Pills, badges, tab pill |

### Shadow (warm-tinted, never pure black)
```css
--shadow-xs:  0 1px 2px rgba(31,26,23,0.06);
--shadow-sm:  0 1px 3px rgba(31,26,23,0.05), 0 4px 12px rgba(31,26,23,0.03);
--shadow-md:  0 1px 3px rgba(31,26,23,0.05), 0 12px 32px rgba(31,26,23,0.04);
--shadow-lg:  0 4px 8px rgba(31,26,23,0.06), 0 20px 60px rgba(31,26,23,0.10);
--shadow-xl:  0 8px 16px rgba(31,26,23,0.08), 0 32px 80px rgba(31,26,23,0.15);
```

### Motion
```css
--ease: cubic-bezier(0.32, 0.72, 0, 1);       /* default */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);    /* strong */
--dur-fast: 120ms;  --dur: 200ms;  --dur-slow: 400ms;
```

---

## Assets

### 로컬 (번들에 포함)
- `assets/logo-icon.svg` — 26–30px 컴팩트 마크 (nav, footer)
- `assets/logo-primary.svg` — 80x80 풀 마크
- `assets/logo-wordmark.svg` — 워드마크 lockup
- `assets/logo-mono-black.svg` / `assets/logo-mono-cream.svg` — 모노 버전

### 폰트 (Google Fonts CDN)
`colors_and_type.css` 상단 `@import`로 로드:
- Inter (400,500,600,700,800,900)
- Instrument Serif (0,1 = regular + italic)
- JetBrains Mono (400,500)
- Pretendard (400,500,600,700,800)

프로덕션 배포 시:
- Google Fonts는 `<link>` preconnect + display=swap 권장
- Pretendard는 self-host 권장 (한글 CDN 안정성)
- 라이선스 브랜드 폰트가 있다면 `--font-sans` swap

### 외부 (미포함)
- **대학/기업 로고** — 소셜 프루프 스트립. 현재는 텍스트 워드마크. 사용 계약 확인 후 SVG 교체.
- **고객 인용 인물** — Testimony 섹션. 현재는 placeholder 이름. 실 사용 동의 확보 필요.

### 아이콘
- **Lucide** 스타일 SVG를 인라인으로 그림. 개발 시 [lucide.dev](https://lucide.dev) 또는 `lucide-react` 패키지 사용 권장. Stroke 1.5–1.75, 24px viewBox, round caps + joins.

---

## Files

번들에 포함된 파일:
- `README.md` — 이 문서
- `index.html` — 전체 홈페이지 프로토타입 (single file, 인터랙션 포함)
- `colors_and_type.css` — 디자인 토큰 (색상, 타이포, 간격, 라운드, 그림자, 모션)
- `assets/logo-icon.svg`, `assets/logo-primary.svg`, `assets/logo-wordmark.svg`, `assets/logo-mono-black.svg`, `assets/logo-mono-cream.svg` — 로고 자산 5종

---

## Recommended Implementation Approach

### 1. 프레임워크 선택
Next.js 14 (App Router) + Tailwind CSS + Framer Motion 권장.
- Tailwind config에서 `theme.extend`로 위 디자인 토큰 이식
- Framer Motion으로 waveform / pulse dot / arrow hover 처리

### 2. 컴포넌트 분해
```
<Nav />
<Hero>
  <HeroPill />
  <HeroHeadline />
  <ProductPreviewCard />
  <SocialProofStrip />
</Hero>
<ProductsSection>
  <ProductCard × 6 />
</ProductsSection>
<ProblemBand>
  <PainPoint × 4 />
</ProblemBand>
<ProcessSection>
  <StepCard × 4 (with unique visual per step) />
</ProcessSection>
<WhySection>
  <PrincipleCard × 4 />
</WhySection>
<AudiencesSection>
  <AudienceTabs />
  <AudiencePanel × 4 />
</AudiencesSection>
<TestimonyQuote />
<CTASection />
<Footer />
```

### 3. 우선순위
1. **디자인 토큰 세팅** (colors_and_type.css → Tailwind config)
2. **Nav + Hero** (첫 인상 담당)
3. **Products grid** (핵심 CTA 진입)
4. **Audience tabs** (인터랙션 있음)
5. **Problem / Process / Why** (스크롤 콘텐츠)
6. **Testimony + CTA + Footer** (마무리)

### 4. 접근성 체크
- 모든 인터랙티브 요소: 키보드 tab 가능, focus-visible outline
- `aud-tab`: `role="tab"`, `aria-selected`, `aria-controls`
- 이미지 alt 텍스트 확인
- 색 대비: cream-100 위 ink-900 = AAA (16.5:1), ink-500 = AA (5.8:1) — 문제없음
- 다크 밴드: cream-100 위 rgba(0.65) = 최소 4.5:1 유지 필요

### 5. 성능
- 폰트: `font-display: swap`, preconnect Google Fonts
- 이미지: WebP + `loading="lazy"`
- CSS: Tailwind purge / PostCSS로 사용된 클래스만 번들
- 애니메이션: `prefers-reduced-motion` 감지 시 waveform · pulse 중단 권장
