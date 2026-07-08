# AXHRD 권한·메뉴 매뉴얼

> AX-native 역할×모듈(Capability) 권한 — 외부 ATS를 복제하지 않고 면접·역량·코호트 데이터 레이어에 맞춤  
> 최종 업데이트: 2026-07-08

---

## 1. 개요

AXHRD는 **역할(Role)** + **모듈(Capability)** 이중 구조로 권한을 관리합니다.

| 레이어 | AXHRD 설계 |
|--------|------------|
| **플랫폼** | 수퍼 / 회사 / 콘텐츠 어드민 — 운영·영업·CMS |
| **테넌트** | 기관 어드민 / 회사원 / 학생 — 코호트·킷·개인 성장 |
| **제품** | 대시보드·자기발견·면접·연습 — 공통 코어 |

**핵심 원칙**

1. **페이지 = 모듈** — 각 화면은 독립 Next.js 라우트로 lazy-load 됩니다.
2. **네비 = capability 필터** — `buildNavigationForUser()`가 역할별 허용 모듈만 메뉴에 표시합니다.
3. **가드 = 동일 capability** — 페이지·API 모두 같은 capability로 보호합니다.
4. **근거 기반 면접** — 자소서·답변 인용 없이 질문·꼬리질문·점수를 만들지 않습니다 (제품 품질 원칙).

---

## 2. 역할 정의 (6종)

### 플랫폼 역할 (`platformRole`)

| 역할 | DB 값 | 범위 |
|------|-------|------|
| **수퍼어드민** | `SUPERADMIN` | 모든 메뉴·모듈 · 사용량 면제 |
| **회사 어드민** | `ADMIN` | 고객 데모 샌드박스 · 사용량 면제 |
| **콘텐츠 관리자** | `CONTENT_ADMIN` | 역량·문항·루브릭 CMS |
| 일반 | `NONE` | 플랫폼 특권 없음 |

### 기관 역할 (`orgRole`, `organizationId` 필요)

| 역할 | DB 값 | 범위 |
|------|-------|------|
| **기관 어드민** | `ADMIN` | 코호트 + 인터뷰 킷\* |
| **회사원** | `STAFF` | 코호트 대시보드 |
| **학생** | `STUDENT` | 제품 기능만 (원문 기관 비공개) |

\* 인터뷰 킷·기관 설정은 `saasPersonalizationEnabled`가 켜진 기관만.

---

## 3. 모듈(Capability) 목록

`web/src/lib/platform/capabilities.ts`의 `CAPABILITY_REGISTRY`가 단일 소스입니다.
각 모듈의 `designNote`에 AX 차별화 한 줄이 있습니다.

플랫폼 콘솔 (`/admin/*`)은 좌측 사이드바로 모듈을 전환합니다.

---

## 4. 관련 UI

- `/admin/permissions` — 역할×모듈 매트릭스
- `/admin/users` — 사용자 역할 부여
- `/admin/organizations` — 테넌트 허브

---

## 5. 로드맵 메모

- [ ] SSO/SAML 그룹 → 역할 자동 프로비저닝
- [ ] 기관별 capability override (기본 매트릭스 위 예외)
