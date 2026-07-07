/** 역량·레벨별 루브릭 파싱 및 템플릿 */

export type RubricByLevel = Record<string, string[]>;

export function parseRubricByLevel(raw: unknown): RubricByLevel {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: RubricByLevel = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      const lines = val.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
      if (lines.length > 0) out[key] = lines;
    }
  }
  return out;
}

export function rubricForCompetencyLevel(rubricByLevel: unknown, level: number): string[] {
  const map = parseRubricByLevel(rubricByLevel);
  const levelKey = String(level);
  if (map[levelKey]?.length) return map[levelKey];
  if (map.default?.length) return map.default;
  return [];
}

export function linesToRubric(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function rubricToLines(criteria: string[]): string {
  return criteria.join("\n");
}

/** 관리자 업로드용 JSON 템플릿 */
export const RUBRIC_IMPORT_TEMPLATE = {
  version: 1,
  description: "역량별 L1~L5 채점 루브릭 — 한 줄에 기준 1개",
  competencies: [
    {
      code: "COMMUNICATION",
      levels: {
        "1": ["질문 의도를 파악했는가", "답변 구조가 분명한가"],
        "2": ["상황 설명이 구체적인가", "본인 역할을 밝혔는가"],
        "3": ["핵심 메시지가 전달됐는가", "청중·상대를 고려했는가"],
        "4": ["복잡한 내용을 명확히 정리했는가", "설득·공감 요소가 있는가"],
        "5": ["전략적 메시지 설계가 보이는가", "리스크·대안을 함께 설명했는가"],
      },
    },
    {
      code: "PROBLEM_SOLVING",
      levels: {
        "1": ["문제 상황을 인식했는가"],
        "2": ["원인 분석을 시도했는가", "대안을 1개 이상 제시했는가"],
        default: ["논리적 사고 과정이 드러나는가"],
      },
    },
  ],
} as const;

export type RubricImportFile = {
  version?: number;
  competencies: Array<{
    code: string;
    levels: Record<string, string[] | string>;
  }>;
};

export function parseRubricImportFile(raw: unknown): RubricImportFile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.competencies)) return null;
  return o as RubricImportFile;
}

/** levels 객체를 RubricByLevel로 정규화 */
export function normalizeImportLevels(
  levels: Record<string, string[] | string>
): RubricByLevel {
  const out: RubricByLevel = {};
  for (const [key, val] of Object.entries(levels)) {
    if (Array.isArray(val)) {
      const lines = val.filter((c) => typeof c === "string" && c.trim());
      if (lines.length) out[key] = lines;
    } else if (typeof val === "string") {
      const lines = linesToRubric(val);
      if (lines.length) out[key] = lines;
    }
  }
  return out;
}
