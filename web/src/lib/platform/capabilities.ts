/**
 * HR_IN 플랫폼 모듈(Capability) 레지스트리
 *
 * Greenhouse의 Permission Stripe / HireVue의 Role Matrix 패턴을 참고.
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
  | "platform.benchmark";

export type CapabilityDef = {
  id: CapabilityId;
  category: CapabilityCategory;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  /** 모듈 라우트 — App Router가 페이지 단위로 lazy-load */
  href?: string;
  /** Greenhouse Site Admin / HireVue Admin 등 대응 참고 */
  competitorRef: string;
};

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDef> = {
  "product.dashboard": {
    id: "product.dashboard",
    category: "product",
    labelKo: "역량 트래킹",
    labelEn: "Dashboard",
    descriptionKo: "개인 역량·면접 기록 대시보드",
    href: "/dashboard",
    competitorRef: "HireVue — Candidate/Recruiter home",
  },
  "product.discover": {
    id: "product.discover",
    category: "product",
    labelKo: "나를 발견하기",
    labelEn: "Self-discovery",
    descriptionKo: "자기발견 인터뷰",
    href: "/discover",
    competitorRef: "HireVue — Assessment modules",
  },
  "product.interview": {
    id: "product.interview",
    category: "product",
    labelKo: "면접",
    labelEn: "Interview",
    descriptionKo: "모의면접 세션",
    href: "/interview/setup",
    competitorRef: "HireVue — Video Interview",
  },
  "product.practice": {
    id: "product.practice",
    category: "product",
    labelKo: "질문 카드",
    labelEn: "Practice",
    descriptionKo: "질문 연습",
    href: "/practice/swipe",
    competitorRef: "HireVue — Question library",
  },
  "product.profile": {
    id: "product.profile",
    category: "product",
    labelKo: "프로필",
    labelEn: "Profile",
    descriptionKo: "계정·소속 설정",
    href: "/profile",
    competitorRef: "Greenhouse — User profile",
  },
  "tenant.cohort": {
    id: "tenant.cohort",
    category: "tenant",
    labelKo: "코호트 대시보드",
    labelEn: "Cohort",
    descriptionKo: "기관 담당자용 학생·면접 현황",
    href: "/org/dashboard",
    competitorRef: "Greenhouse — Job pipeline reports",
  },
  "tenant.settings": {
    id: "tenant.settings",
    category: "tenant",
    labelKo: "기관 면접 설정",
    labelEn: "Tenant settings",
    descriptionKo: "인터뷰 킷·개인화 허브",
    href: "/org/settings",
    competitorRef: "Greenhouse — Job Admin configure",
  },
  "tenant.interview_kit": {
    id: "tenant.interview_kit",
    category: "tenant",
    labelKo: "인터뷰 킷 빌더",
    labelEn: "Interview kit",
    descriptionKo: "문항 선택·루브릭 커스터마이즈",
    href: "/org/settings/interview-kit",
    competitorRef: "HireVue — Builder / Workday-style kit",
  },
  "platform.permissions": {
    id: "platform.permissions",
    category: "platform_ops",
    labelKo: "권한 설정",
    labelEn: "Permissions",
    descriptionKo: "역할·모듈 접근 매트릭스 (Configure > Permissions)",
    href: "/admin/permissions",
    competitorRef: "Greenhouse — Configure > Permissions",
  },
  "platform.users": {
    id: "platform.users",
    category: "platform_ops",
    labelKo: "사용자 권한",
    labelEn: "Users",
    descriptionKo: "플랫폼·기관 역할 부여",
    href: "/admin/users",
    competitorRef: "Greenhouse — Users page",
  },
  "platform.organizations": {
    id: "platform.organizations",
    category: "platform_ops",
    labelKo: "기관 관리",
    labelEn: "Organizations",
    descriptionKo: "테넌트 승인·허브·개인화",
    href: "/admin/organizations",
    competitorRef: "Greenhouse — Site Admin / Workday tenant hub",
  },
  "platform.content": {
    id: "platform.content",
    category: "platform_content",
    labelKo: "문항 뱅크",
    labelEn: "Content bank",
    descriptionKo: "운영 역량·문항·루브릭 CMS",
    href: "/admin/content",
    competitorRef: "HireVue — Admin > Question sets",
  },
  "platform.demo": {
    id: "platform.demo",
    category: "platform_sales",
    labelKo: "고객 데모",
    labelEn: "Demo workspaces",
    descriptionKo: "영업 미팅용 샌드박스",
    href: "/admin/demo",
    competitorRef: "HireVue — Demo / sandbox tenant",
  },
  "platform.subscriptions": {
    id: "platform.subscriptions",
    category: "platform_ops",
    labelKo: "구독 관리",
    labelEn: "Subscriptions",
    descriptionKo: "플랜·결제",
    href: "/admin/subscriptions",
    competitorRef: "Greenhouse — Billing (Site Admin)",
  },
  "platform.audit": {
    id: "platform.audit",
    category: "platform_ops",
    labelKo: "감사 로그",
    labelEn: "Audit log",
    descriptionKo: "CMS 변경·롤백",
    href: "/admin/audit",
    competitorRef: "Greenhouse — Audit trail",
  },
  "platform.benchmark": {
    id: "platform.benchmark",
    category: "platform_ops",
    labelKo: "기관 비교",
    labelEn: "Benchmark",
    descriptionKo: "테넌트 간 지표 비교",
    href: "/admin/organizations/benchmark",
    competitorRef: "Greenhouse — Reports",
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
    "product.practice",
    "product.profile",
    "platform.demo",
  ],
  CONTENT_ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.practice",
    "product.profile",
    "platform.content",
  ],
  ORG_ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
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
    "product.practice",
    "product.profile",
    "tenant.cohort",
  ],
  STUDENT: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.practice",
    "product.profile",
  ],
};

export const PLATFORM_ROLE_ROWS: {
  key: PlatformRoleKey;
  labelKo: string;
  greenhouseAnalog: string;
  hirevueAnalog: string;
}[] = [
  {
    key: "SUPERADMIN",
    labelKo: "수퍼어드민",
    greenhouseAnalog: "Site Admin",
    hirevueAnalog: "Admin (full)",
  },
  {
    key: "ADMIN",
    labelKo: "회사 어드민",
    greenhouseAnalog: "—",
    hirevueAnalog: "Admin (demo/sales)",
  },
  {
    key: "CONTENT_ADMIN",
    labelKo: "콘텐츠 관리자",
    greenhouseAnalog: "Site Admin (content stripe)",
    hirevueAnalog: "Admin (question sets)",
  },
  {
    key: "ORG_ADMIN",
    labelKo: "기관 어드민",
    greenhouseAnalog: "Job Admin (Standard)",
    hirevueAnalog: "Recruiter / Hiring Manager",
  },
  {
    key: "ORG_STAFF",
    labelKo: "회사원",
    greenhouseAnalog: "Job Admin (limited)",
    hirevueAnalog: "Collaborator",
  },
  {
    key: "STUDENT",
    labelKo: "학생",
    greenhouseAnalog: "Basic",
    hirevueAnalog: "Candidate",
  },
];
