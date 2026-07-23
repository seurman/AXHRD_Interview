/**
 * AXHRD 플랫폼 모듈(Capability) 레지스트리
 *
 * AX-native 권한 스트라이프: 페이지=모듈, 역할=capability 집합.
 * 외부 ATS를 복제하지 않고, 면접·역량·참여 현황을 한 데이터 레이어로 묶는다.
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
  | "product.assessment"
  | "product.profile"
  | "product.demo_trial"
  | "tenant.cohort"
  | "tenant.settings"
  | "tenant.interview_kit"
  | "tenant.custom_competency"
  | "tenant.diagnostic"
  | "platform.permissions"
  | "platform.users"
  | "platform.organizations"
  | "platform.content"
  | "platform.demo"
  | "platform.subscriptions"
  | "platform.audit"
  | "platform.sessions"
  | "platform.benchmark"
  | "platform.diagnostic";

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
    href: "/dashboard/jobseeker",
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
    labelKo: "역량 연습",
    labelEn: "Practice",
    descriptionKo: "역량 학습 패스 · 질문 카드",
    href: "/practice/path",
    designNote: "지식·원리 → 스와이프 드릴 → 실전 모의 루프",
  },
  "product.assessment": {
    id: "product.assessment",
    category: "product",
    labelKo: "역량평가",
    labelEn: "Assessment Center",
    descriptionKo: "서류함·역할연기 과제",
    href: "/assessment",
    designNote: "AC 기법(In-Basket·Role-Play)을 증거형 행동평가 리포트로",
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
  "product.demo_trial": {
    id: "product.demo_trial",
    category: "product",
    labelKo: "5분 면접 체험",
    labelEn: "5-min trial",
    descriptionKo: "데모 키트 기반 짧은 모의면접",
    href: "/demo",
    designNote: "FREE 개인 사용자 전용 — 역량 2~3문항 체험",
  },
  "tenant.cohort": {
    id: "tenant.cohort",
    category: "tenant",
    labelKo: "참여 현황",
    labelEn: "Cohort",
    descriptionKo: "기관 담당자용 학생·면접 현황",
    href: "/org/dashboard",
    designNote: "참여 완료율·역량 평균 — 개인 원문 비공개",
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
    labelKo: "인터뷰 킷 스튜디오",
    labelEn: "Interview kit",
    descriptionKo: "뱅크에서 역량·문항 매핑 · 루브릭 조정",
    href: "/org/settings/interview-kit",
    designNote: "기관 면접 킷 조립 — 플랫폼 뱅크 기반",
  },
  "tenant.custom_competency": {
    id: "tenant.custom_competency",
    category: "tenant",
    labelKo: "기관 맞춤 역량",
    labelEn: "Custom competencies",
    descriptionKo: "기본 역량 복제·커스텀 역량·문항 작성",
    href: "/org/settings/competencies",
    designNote: "PLATFORM 포크/ORG 소유 — 승격은 수퍼어드민",
  },
  "tenant.diagnostic": {
    id: "tenant.diagnostic",
    category: "tenant",
    labelKo: "조직진단",
    labelEn: "Organization diagnostic",
    descriptionKo: "ARC Index 웨이브·팀·응답 링크",
    href: "/org/diagnosis",
    designNote: "계약 기관 전용 — diagnosticEnabled 플래그",
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
    descriptionKo: "역량·문항·루브릭 메타데이터 CMS",
    href: "/admin/content",
    designNote: "플랫폼 운영 메타데이터 — 생성·편집·매핑",
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
  "platform.diagnostic": {
    id: "platform.diagnostic",
    category: "platform_content",
    labelKo: "조직진단 CMS",
    labelEn: "Diagnostic CMS",
    descriptionKo: "ARC Index 문항뱅크·웨이브 현황",
    href: "/admin/diagnostic",
    designNote: "DiagnosticInstrument · 전 기관 웨이브 허브",
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

const PRODUCT_CAPS: CapabilityId[] = [
  "product.dashboard",
  "product.discover",
  "product.interview",
  "product.resume_review",
  "product.practice",
  "product.assessment",
  "product.profile",
  "product.demo_trial",
];

export type PlatformRoleKey =
  | "SUPERADMIN"
  | "BUSINESS_ADMIN"
  | "DEMO_ADMIN"
  | "ADMIN"
  | "CONTENT_ADMIN"
  | "ORG_ADMIN"
  | "ORG_STAFF"
  | "MEMBER";

/** 역할별 기본 capability (테넌트 플래그는 resolve 시 병합) */
export const ROLE_CAPABILITY_MATRIX: Record<PlatformRoleKey, CapabilityId[]> = {
  SUPERADMIN: ALL_CAPABILITY_IDS,
  BUSINESS_ADMIN: [
    ...PRODUCT_CAPS,
    "platform.demo",
    "platform.organizations",
    "platform.content",
    "platform.diagnostic",
    "platform.sessions",
    "platform.benchmark",
    "tenant.cohort",
    "tenant.settings",
    "tenant.interview_kit",
    "tenant.custom_competency",
    "tenant.diagnostic",
  ],
  DEMO_ADMIN: [
    ...PRODUCT_CAPS,
    "platform.demo",
    "platform.sessions",
  ],
  ADMIN: [
    ...PRODUCT_CAPS,
    "platform.demo",
    "platform.sessions",
  ],
  CONTENT_ADMIN: [
    ...PRODUCT_CAPS.filter((c) => c !== "product.demo_trial"),
    "platform.content",
  ],
  ORG_ADMIN: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.assessment",
    "product.profile",
    "tenant.cohort",
    "tenant.settings",
    "tenant.interview_kit",
    "tenant.custom_competency",
    "tenant.diagnostic",
  ],
  ORG_STAFF: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.assessment",
    "product.profile",
    "tenant.cohort",
  ],
  MEMBER: [
    "product.dashboard",
    "product.discover",
    "product.interview",
    "product.resume_review",
    "product.practice",
    "product.assessment",
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
    key: "BUSINESS_ADMIN",
    labelKo: "비즈니스 어드민",
    scopeNote: "전 모듈 조회·체험 · 매뉴얼·고객 시연 · 설정/권한 변경 불가",
  },
  {
    key: "DEMO_ADMIN",
    labelKo: "데모 어드민",
    scopeNote: "영업·Presenter · 데모 샌드박스 · 사용량 면제",
  },
  {
    key: "ADMIN",
    labelKo: "데모 어드민 (레거시)",
    scopeNote: "DEMO_ADMIN과 동일 — 마이그레이션 호환",
  },
  {
    key: "CONTENT_ADMIN",
    labelKo: "콘텐츠 관리자",
    scopeNote: "역량·문항·루브릭 CMS 운영",
  },
  {
    key: "ORG_ADMIN",
    labelKo: "기관 어드민",
    scopeNote: "참여 현황·인터뷰 킷·기관 설정",
  },
  {
    key: "ORG_STAFF",
    labelKo: "담당자",
    scopeNote: "참여 현황 조회 · 제한된 설정",
  },
  {
    key: "MEMBER",
    labelKo: "구성원",
    scopeNote: "학생·직장인·지원자 · 개인 성장·면접",
  },
];
