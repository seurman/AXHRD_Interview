import type { RubricByLevel } from "@/lib/competency/rubric";

export type KitStudioMode = "demo" | "production";

export type KitCompetency = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
  rubricByLevel?: RubricByLevel | unknown;
};

export type KitQuestion = {
  id: string;
  externalId: string;
  competencyId: string;
  competencyCode: string;
  level: number;
  template: string;
  sortOrder: number;
  isActive: boolean;
  rubricCriteria: string[];
};

export type CatalogQuestion = {
  externalId: string;
  level: number;
  template: string;
  sortOrder: number;
  rubricCriteria: string[];
};

export type CatalogComp = {
  source: "ncs" | "global";
  code: string;
  nameKo: string;
  description: string | null;
  questionCount: number;
  clusterCode?: string;
  clusterNameKo?: string;
  rubricByLevel?: RubricByLevel;
  questions?: CatalogQuestion[];
};

export type CatalogCluster = {
  source: "ncs" | "global";
  code: string;
  nameKo: string;
  description: string | null;
  competencies: CatalogComp[];
};

export type KitStudioLabels = {
  studioBadge: string;
  studioSubtitle: string;
  inKitLabel: string;
  catalogAddHint: string;
  dropZoneLabel: string;
  kitPanelTitle: string;
  kitPanelHint: string;
  alreadyInKitMessage: string;
  addedMessage: (count: number, skipped?: string[]) => string;
  removeCompConfirm: (nameKo: string) => string;
  rubricsEmptyHint: string;
  emptyKitPrimary: string;
  goStepEmptyKitMessage: string;
  questionsPanelHint: string;
  addToKitAriaLabel: string;
};

export const PRODUCTION_LABELS: KitStudioLabels = {
  studioBadge: "Content studio",
  studioSubtitle: "메타데이터 → 필요 역량 → 질의 → 루브릭. 운영 문항 뱅크를 구성합니다.",
  inKitLabel: "뱅크",
  catalogAddHint: "드래그하거나 + 로 뱅크에 추가",
  dropZoneLabel: "여기에 놓아 뱅크에 추가",
  kitPanelTitle: "운영 역량 뱅크",
  kitPanelHint: "좌측 메타에서 끌어오거나 + 로 추가",
  alreadyInKitMessage: "이미 뱅크에 있는 역량입니다.",
  addedMessage: (count, skipped) =>
    `${count}개 역량을 운영 뱅크에 넣었습니다.` +
    (skipped?.length ? ` (건너뜀: ${skipped.join(", ")})` : ""),
  removeCompConfirm: (name) => `「${name}」을(를) 뱅크에서 제거(비활성화)할까요?`,
  rubricsEmptyHint: "뱅크에 역량을 먼저 추가하세요.",
  emptyKitPrimary: "여기에 역량을 놓으세요.",
  goStepEmptyKitMessage: "먼저 좌측 메타데이터에서 역량을 추가하세요.",
  questionsPanelHint:
    "레벨을 펼쳐 문항 전문을 보고 수정합니다. 좌측에서 역량을 끌어와도 뱅크에 추가됩니다.",
  addToKitAriaLabel: "뱅크에 추가",
};

export const DEMO_LABELS: KitStudioLabels = {
  studioBadge: "Kit studio",
  studioSubtitle: "메타데이터 → 필요 역량 → 질의 → 루브릭. 저장 후 미리보기에서 바로 면접을 실행합니다.",
  inKitLabel: "키트",
  catalogAddHint: "드래그하거나 + 로 키트에 추가",
  dropZoneLabel: "여기에 놓아 키트에 추가",
  kitPanelTitle: "필요 역량 키트",
  kitPanelHint: "좌측 그립(⋮⋮)을 잡고 이 영역으로 끌어오거나 + 로 추가",
  alreadyInKitMessage: "이미 키트에 있는 역량입니다.",
  addedMessage: (count, skipped) =>
    `${count}개 역량을 키트에 넣었습니다.` +
    (skipped?.length ? ` (건너뜀: ${skipped.join(", ")})` : ""),
  removeCompConfirm: (name) => `「${name}」을(를) 키트에서 제거할까요?`,
  rubricsEmptyHint: "키트에 역량을 먼저 추가하세요.",
  emptyKitPrimary: "여기에 역량을 놓으세요.",
  goStepEmptyKitMessage: "먼저 좌측 메타데이터에서 역량을 키트로 추가하세요.",
  questionsPanelHint:
    "레벨을 펼쳐 문항 전문을 보고 수정합니다. 좌측에서 역량을 끌어와도 키트에 추가됩니다.",
  addToKitAriaLabel: "키트에 추가",
};
