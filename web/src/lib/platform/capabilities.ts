/**
 * AXHRD 플랫폼 모듈(Capability) 레지스트리
 *
 * AX-native 권한 스트라이프: 페이지=모듈, 역할=capability 집합.
 * 외부 ATS를 복제하지 않고, 면접·역량·코호트를 한 데이터 레이어로 묶는다.
 * 각 페이지는 독립 모듈로 등록되며, 네비·가드는 capability로 필터링한다.
 */

export type CapabilityCategory =
  | "product"
  | "tenant"
  | "platform_content"
  | "platform_sales"
  | "platform_ops";

export type CapabilityId =
  | "product.dashboard"
  | "product.discover"
  | "product.interview"
  | "product.resume_review"
  | "product.practice"
  | "product.profile"
  | "tenant.cohort"
  | "tenant.settings"
  | "tenant.interview_kit"
  | "platform.permissions"
  | "platform.users"
  | "platform.organizations"
  | "platform.content"
  | "platform.demo"
  | "platform.subscriptions"
  | "platform.audit"
  | "platform.sessions"
  | "platform.benchmark";

export type CapabilityDef = {
  id: CapabilityId;
  category: CapabilityCategory;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  /** 모듈 라우트 — App Router가 페이지 단위로 lazy-load */
  href?: string;
  /** AXHRD 모듈 설계 의도 (차별화 한 줄) */
  designNote: string;
};

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDef> = {
  "product.dashboard": {
    id: "product.dashboard",
    category: "product",
    labelKo: "역량 트래킹",
    labelEn: "Dashboard",
    descriptionKo: "개인 역량·면접 기록 대시보드",
    href: "/dashboard",
    designNote: "IRT θ·백분위 스킬트리 — 미측정은 0%로 정직 노출",
  },
  "product.discover": {
    id: "product.discover",
    category: "product",
    labelKo: "나를 발견하기",
    labelEn: "Self-discovery",
    descriptionKo: "자기발견 인터뷰",
    href: "/discover",
    designNote: "자기발견→면접 역량으로 연결되는 AX 인터뷰 루프",
  },
  "product.interview": {
    id: "product.interview",
    category: "product",
    labelKo: "면접",
    labelEn: "Interview",
    descriptionKo: "모의면접 세션",
    href: "/interview/setup",
    designNote: "자소서 근거 인용 · 세션당 1회 꼬리질문 · STAR 인용 채점",
  },
  "product.resume_review": {
    id: "product.resume_review",
    category: "product",
    labelKo: "자소서 첨삭",
    labelEn: "Resume review",
    descriptionKo: "공고 대사·첨삭 리포트",
    href: "/resume-review",
    designNote: "JD/프리셋 대사 → 부족 역량을 모의면접으로 이어짐",
  },
  "product.practice": {
    id: "product.practice",
    category: "product",
    labelKo: "질문 카드",
    labelEn: "Practice",
    descriptionKo: "질문 연습",
    href: "/practice/swipe",
    designNote: "스와이프 덱으로 실전 질문 민감도 훈련",
  },
  "product.profile": {
    id: "product.profile",
    category: "product",
    labelKo: "프로필",
    labelEn: "Profile",
    descriptionKo: "계정·소속 설정",
    href: "/profile",
    designNote: "계정·소속·선호를 한 프로필 레이어로",
  },
  "tenant.cohort": {
    id: "tenant.cohort",
    category: "tenant",
    labelKo: "코호트 대시보드",
    labelEn: "Cohort",
    descriptionKo: "기관 담당자용 학생·면접 현황",
    href: "/org/dashboard",
    designNote: "코호트 완료율·역량 평균 — 개인 원문 비공개",
  },
  "tenant.settings": {
    id: "tenant.settings",
    category: "tenant",
    labelKo: "기관 면접 설정",
    labelEn: "Tenant settings",
    descriptionKo: "인터뷰 킷·개인화 허브",
    href: "/org/settings",
    designNote: "테넌트 허브: 킷·개인화·권한을 모듈로 분리",
  },
  "tenant.interview_kit": {
    id: "tenant.interview_kit",
    category: "tenant",
    labelKo: "인터뷰 킷 빌더",
    labelEn: "Interview kit",
    descriptionKo: "문항 선택·루브릭 커스터마이즈",
    href: "/org/settings/interview-kit",
    designNote: "기관 맞춤 루브릭·문항 조립 (AX 인터뷰 킷)",
  },
  "platform.permissions": {
    id: "platform.permissions",
    category: "platform_ops",
    labelKo: "권한 설정",
    labelEn: "Permissions",
    descriptionKo: "역할·모듈 접근 매트릭스 (Configure > Permissions)",
    href: "/admin/permissions",
    designNote: "역할×모듈 매트릭스 — AX Configure 허브",
  },
  "platform.users": {
    id: "platform.users",
    category: "platform_ops",
    labelKo: "사용자 권한",
    labelEn: "Users",
    descriptionKo: "플랫폼·기관 역할 부여",
    href: "/admin/users",
    designNote: "플랫폼·기관 역할 부여",
  },
  "platform.organizations": {
    id: "platform.organizations",
    category: "platform_ops",
    labelKo: "기관 관리",
    labelEn: "Organizations",
    descriptionKo: "테넌트 승인·허브·개인화",
    href: "/admin/organizations",
    designNote: "테넌트 승인·데모·SaaS 개인화 허브",
  },
  "platform.content": {
    id: "platform.content",
    category: "platform_content",
    labelKo: "문항 뱅크",
    labelEn: "Content bank",
    descriptionKo: "운영 역량·문항·루브릭 CMS",
    href: "/admin/content",
    designNote: "역량·문항·루브릭 CMS",
  },
  "platform.demo": {
    id: "platform.demo",
    category: "platform_sales",
    labelKo: "고객 데모",
    labelEn: "Demo workspaces",
    descriptionKo: "영업 미팅용 샌드박스",
    href: "/admin/demo",
    designNote: "영업용 샌드박스 — 역량·질문·루브릭 격리",
  },
  "platform.subscriptions": {
    id: "platform.subscriptions",
    category: "platform_ops",
    labelKo: "구독 관리",
    labelEn: "Subscriptions",
    descriptionKo: "플랜·결제",
    href: "/admin/subscriptions",
    designNote: "플랜·사용량 (슈퍼/회사 관리자 면제)",
  },
  "platform.audit": {
    id: "platform.audit",
    category: "platform_ops",
    labelKo: "감사 로그",
    labelEn: "Audit log",
    descriptionKo: "CMS 변경·롤백",
    href: "/admin/audit",
    designNote: "CMS 변경 감사·롤백",
  },
  "platform.sessions": {
    id: "platform.sessions",
    category: "platform_ops",
    labelKo: "면접 세션",
    labelEn: "Interview sessions",
    descriptionKo: "실행 면접 로그·응답 DB",
    href: "/admin/sessions",
    designNote: "후보 면접 실행 기록·응답 원문 조회",
  },
  "platform.benchmark": {
    id: "platform.benchmark",
    category: "platform_ops",
    labelKo: "기관 비교",
    labelEn: "Benchmark",
    descriptionKo: "테넌트 간 지표 비교",
    href: "/admin/organizations/benchmark",
    designNote: "테넌트 간 지표 비교 (AX 벤치마크)",
  },
};

export const CATEGORY_LABEL: Record<CapabilityCategory, { ko: string; en: string }> = {
  product: { ko: "제품 (Product)", en: "Product" },
  tenant: { ko: "테넌트 (Tenant)", en: "Tenant" },
  platform_content: { ko: "콘텐츠 운영", en: "Content ops" },
  platform_sales: { ko: "영업·데모", en: "Sales & demo" },
  platform_ops: { ko: "플랫폼 운영", en: "Platform ops" },
};

export const ALL_CAPABILITY_IDS = Object.keys(CAPABILITY_REGISTRY) as CapabilityId[];

export type PlatformRoleKey =
  | "SUPERADMIN"
  | "ADMIN"
  | "CONTENT_ADMIN"
  | "ORG_ADMIN"
  | "ORG_STAFF"
  | "STUDENT";

/** 역할별 기본 capability (테넌트 플래그는 resolve 시 병합) */
export const ROLE_CAPABILITY_MATRIX: Record<PlatformRoleKey, CapabilityId[]> = {
  SUPERADMIN: ALL_CAPABILITY_IDS,
  ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.profile",
    "platform.demo",
  ],
  CONTENT_ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.profile",
    "platform.content",
  ],
  ORG_ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.profile",
    "tenant.cohort",
    "tenant.settings",
    "tenant.interview_kit",
  ],
  ORG_STAFF: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.profile",
    "tenant.cohort",
  ],
  STUDENT: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.profile",
  ],
};

export const PLATFORM_ROLE_ROWS: {
  key: PlatformRoleKey;
  labelKo: string;
  /** AXHRD 역할 한 줄 — 외부 ATS 비유 대신 제품 권한 범위 */
  scopeNote: string;
}[] = [
  {
    key: "SUPERADMIN",
    labelKo: "수퍼어드민",
    scopeNote: "플랫폼 전체 · 권한·기관·콘텐츠·데모 무제한",
  },
  {
    key: "ADMIN",
    labelKo: "회사 어드민",
    scopeNote: "영업·데모 워크스페이스 · 사용량 면제",
  },
  {
    key: "CONTENT_ADMIN",
    labelKo: "콘텐츠 관리자",
    scopeNote: "역량·문항·루브릭 CMS 운영",
  },
  {
    key: "ORG_ADMIN",
    labelKo: "기관 어드민",
    scopeNote: "코호트·인터뷰 킷·기관 설정",
  },
  {
    key: "ORG_STAFF",
    labelKo: "회사원",
    scopeNote: "코호트 조회 중심 · 제한된 설정",
  },
  {
    key: "STUDENT",
    labelKo: "학생",
    scopeNote: "자기발견·면접·스킬트리 · 개인 성장",
  },
];
