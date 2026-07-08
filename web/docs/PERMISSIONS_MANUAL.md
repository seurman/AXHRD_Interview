# HR_IN 권한·메뉴 매뉴얼

> Greenhouse **Configure → Permissions** · HireVue **Admin → Roles** 패턴을 참고한 HR_IN 플랫폼 권한 가이드  
> 최종 업데이트: 2026-07-08

---

## 1. 개요

HR_IN은 **역할(Role)** + **모듈(Capability)** 이중 구조로 권한을 관리합니다.

| 경쟁 솔루션 | 구조 | HR_IN 대응 |
|-------------|------|------------|
| **Greenhouse** | Site Admin / Job Admin / Basic + Permission Stripes | 수퍼어드민 / 기관 어드민 / 학생 + capability 모듈 |
| **HireVue** | Admin / Recruiter / Evaluator / Candidate | 회사·콘텐츠 어드민 / 회사원 / 학생 |
| **Workday** | Tenant hub + 모듈별 앱 | `/admin/organizations` 테넌트 허브 |

**핵심 원칙**

1. **페이지 = 모듈** — 각 화면은 독립 Next.js 라우트로 lazy-load 됩니다.
2. **네비 = capability 필터** — `buildNavigationForUser()`가 역할별 허용 모듈만 메뉴에 표시합니다.
3. **가드 = 동일 capability** — 페이지·API 모두 같은 capability로 보호합니다.

---

## 2. 역할 정의 (6종)

### 플랫폼 역할 (`platformRole`)

| 역할 | DB 값 | Greenhouse | HireVue | 설명 |
|------|-------|------------|---------|------|
| **수퍼어드민** | `SUPERADMIN` | Site Admin | Admin (full) | **모든 메뉴·모듈** 접근 |
| **회사 어드민** | `ADMIN` | — | Admin (sales) | 고객 데모, 무제한 테스트 |
| **콘텐츠 관리자** | `CONTENT_ADMIN` | Content stripe | Question sets | 운영 문항 뱅크 CMS |
| 일반 | `NONE` | Basic | Candidate | 플랫폼 특권 없음 |

### 기관 역할 (`orgRole`, `organizationId` 필요)

| 역할 | DB 값 | Greenhouse | HireVue | 설명 |
|------|-------|------------|---------|------|
| **기관 어드민** | `ADMIN` | Job Admin (Standard) | Recruiter / HM | 코호트 + 인터뷰 킷* |
| **회사원** | `STAFF` | Job Admin (limited) | Collaborator | 코호트 대시보드 |
| **학생** | `STUDENT` | Basic | Candidate | 제품 기능만 |

\* 인터뷰 킷·기관 설정은 `saasPersonalizationEnabled`가 켜진 기관만.

---

## 3. 모듈(Capability) 목록

코드: `web/src/lib/platform/capabilities.ts`

### 제품 (Product) — 모든 로그인 사용자

| 모듈 | 경로 |
|------|------|
| 역량 트래킹 | `/dashboard` |
| 나를 발견하기 | `/discover` |
| 면접 | `/interview/setup` |
| 질문 카드 | `/practice/swipe` |
| 프로필 | `/profile` |

### 테넌트 (Tenant) — 기관 소속

| 모듈 | 경로 | 역할 |
|------|------|------|
| 코호트 대시보드 | `/org/dashboard` | 기관 어드민·회사원 |
| 기관 면접 설정 | `/org/settings` | 기관 어드민 (개인화 ON) |
| 인터뷰 킷 | `/org/settings/interview-kit` | 기관 어드민 (개인화 ON) |

수퍼어드민은 테넌트 메뉴에서 **기관 관리** (`/admin/organizations`)로 모든 테넌트에 접근합니다.

### 플랫폼 (Platform) — 운영 콘솔

| 모듈 | 경로 | 역할 |
|------|------|------|
| **권한 설정** | `/admin/permissions` | 수퍼어드민 |
| 사용자 권한 | `/admin/users` | 수퍼어드민 |
| 기관 관리 | `/admin/organizations` | 수퍼어드민 |
| 문항 뱅크 | `/admin/content` | 수퍼어드민, 콘텐츠 관리자 |
| 고객 데모 | `/admin/demo` | 수퍼어드민, 회사 어드민 |
| 구독 관리 | `/admin/subscriptions` | 수퍼어드민 |
| 감사 로그 | `/admin/audit` | 수퍼어드민 |
| 기관 비교 | `/admin/organizations/benchmark` | 수퍼어드민 |

---

## 4. 수퍼어드민 — 전체 메뉴

수퍼어드민은 위 **모든 capability**를 갖습니다.

### 헤더 네비게이션

- **제품** 5개 링크 (역량, 발견, 면접, 카드, 프로필)
- **기관** 드롭다운: 코호트(→ 기관 관리), 면접 설정(→ 기관 관리)
- **관리** 드롭다운: 권한 설정, 사용자, 기관, 문항, 데모, 구독, 감사, 비교 (8개 전체)

### 플랫폼 콘솔 사이드바

`/admin/*` 하위 모든 페이지에 좌측 사이드바가 표시됩니다 (Greenhouse Configure 스타일).

---

## 5. 역할 부여 방법

1. 수퍼어드민으로 로그인
2. **관리 → 사용자 권한** (`/admin/users`)
3. 사용자 행에서:
   - **소속 기관** + **기관 역할** (학생 / 회사원 / 기관 어드민)
   - **플랫폼 역할** (일반 / 회사 어드민 / 콘텐츠 관리자 / 수퍼어드민)

`SUPERADMIN`은 `SUPERADMIN_EMAILS` 환경변수에 등록된 이메일만 부여 가능합니다.

---

## 6. 모듈형 아키텍처 (페이지별 로딩)

```
web/src/lib/platform/
  capabilities.ts   ← 모듈 레지스트리 (단일 진실 공급원)
  access.ts         ← resolveUserCapabilities()
  nav-registry.ts   ← buildNavigationForUser()

web/src/app/
  dashboard/page.tsx          ← product.dashboard
  org/dashboard/page.tsx      ← tenant.cohort
  admin/content/page.tsx      ← platform.content
  admin/demo/page.tsx         ← platform.demo
  ...
```

**새 모듈 추가 절차**

1. `capabilities.ts`에 capability + `href` 등록
2. `ROLE_CAPABILITY_MATRIX`에 역할별 허용 여부 추가
3. `app/.../page.tsx` 생성 + `require*` 가드
4. (선택) `PLATFORM_NAV_ORDER`에 사이드바 순서 추가

App Router가 라우트 단위로 코드를 분할하므로, 플랫폼 확장 시 **페이지를 추가 등록**하는 방식으로 성장합니다.

---

## 7. 경쟁사 비교 요약

### Greenhouse

- 3단계: Basic → Job Admin → Site Admin
- Job Admin **레벨**(Standard / Private / Custom)을 채용별로 부여
- Configure > Permissions에서 **permission stripes** 토글

**HR_IN 적용:** `PermissionMatrix` UI, 역할별 stripe 시각화, 테넌트별 개인화 플래그

### HireVue

- Admin / Recruiter / Hiring Manager / Evaluator / Candidate
- 포지션( job ) 단위 데이터 격리
- 2025 SSO: SAML 그룹 → 역할 자동 매핑

**HR_IN 적용:** 기관 = tenant, 코호트 = pipeline, 데모 워크스페이스 = sales sandbox  
**로드맵:** SAML/OIDC 그룹 → `platformRole` 매핑

---

## 8. FAQ

**Q. 회사 어드민이 문항 뱅크를 못 보는 이유?**  
A. 운영 CMS는 콘텐츠 관리자 전용입니다. 영업 시연은 **고객 데모** (`/admin/demo`)를 사용하세요.

**Q. 기관 어드민인데 면접 설정 메뉴가 없어요.**  
A. 수퍼어드민이 해당 기관 허브에서 **SaaS 개인화**를 켜야 합니다.

**Q. 수퍼어드민인데 `/org/settings`가 안 열려요.**  
A. 정상입니다. 수퍼어드민은 `/admin/organizations/[id]`에서 테넌트를 선택해 관리합니다.

---

## 9. 관련 파일

| 파일 | 용도 |
|------|------|
| `web/src/lib/platform/capabilities.ts` | 모듈·역할 매트릭스 |
| `web/src/lib/platform/nav-registry.ts` | 헤더 메뉴 생성 |
| `web/src/app/admin/permissions/page.tsx` | 권한 설정 UI |
| `web/src/components/admin/PermissionMatrix.tsx` | 역할×모듈 매트릭스 |
| `web/src/lib/auth/roles.ts` | 역할 헬퍼 |
| `web/src/lib/auth/guards.ts` | 페이지 가드 |

---

## 10. 로드맵

- [ ] SSO/SAML 그룹 → 역할 자동 프로비저닝 (HireVue Q1 2025 패턴)
- [ ] Custom Job Admin level — 기관별 커스텀 capability 세트
- [ ] User-specific permissions — 역할 위 개별 stripe 부여
- [ ] Capability 기반 API 미들웨어 통합
