/**
 * 업로드 원문 → 역할연기/서류함 과제 구조화 초안 (Gemini).
 * 결과는 즉시 게시하지 않고 DRAFT로 저장한다.
 */
import { generateGeminiForTier } from "@/lib/gemini/client";
import type { AssessmentScenarioKind } from "@prisma/client";

export type DraftCompetencyLink = {
  competencyCode: string;
  nameKo: string;
  definition: string;
  subskills: Array<{
    code: string;
    nameKo: string;
    definition: string;
    indicators: Array<{
      code: string;
      polarity: "POSITIVE" | "NEGATIVE_OR_MISSING";
      textKo: string;
    }>;
  }>;
};

export type RolePlayDraft = {
  kind: "ROLE_PLAY";
  titleKo: string;
  roleContext: string;
  taskBrief: string;
  reportKindLabel: string;
  durationMinutes: number;
  recommendedSequence: string | null;
  maxTurns: number;
  personaName: string;
  personaRole: string;
  personaProfile: string;
  openingLine: string;
  competencies: DraftCompetencyLink[];
};

export type InBasketDraftItem = {
  fromLabel: string;
  subject: string;
  body: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  importance: "LOW" | "MEDIUM" | "HIGH";
  isDistractor: boolean;
  targetCompetencyCode: string | null;
};

export type InBasketDraft = {
  kind: "IN_BASKET";
  titleKo: string;
  roleContext: string;
  taskBrief: string;
  reportKindLabel: string;
  durationMinutes: number;
  recommendedSequence: string | null;
  items: InBasketDraftItem[];
  competencies: DraftCompetencyLink[];
};

export type ScenarioDraft = RolePlayDraft | InBasketDraft;

type AvailableCompetency = {
  code: string;
  nameKo: string;
  description: string | null;
};

export class ScenarioDraftError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "ScenarioDraftError";
  }
}

const SYSTEM = [
  "당신은 한국 기업 역량평가(Assessment Center) 과제 설계 전문가입니다.",
  "관리자가 제공한 샘플 과제(또는 문서)를 참고해, 구조·난이도·채점 가능성이 유사한 새 과제를 JSON으로 작성합니다.",
  "샘플을 그대로 복사하지 마세요. 상황·인물·회사·문서 내용은 새로 구성하되, 평가 목적과 관찰 가능한 행동 구조는 유지하세요.",
  "응시자에게 채점 기준·페르소나 내부 지침이 노출되지 않도록 필드 역할을 분리하세요.",
  "competencies는 제공된 플랫폼 역량 코드 중에서만 선택하세요. competencyCode는 availableCompetencies의 code와 정확히 일치해야 합니다.",
  "각 역량마다 하위역량과 POSITIVE / NEGATIVE_OR_MISSING 행동지표를 과제 맥락에 맞게 작성하세요.",
].join("\n");

function rolePlayContract(): string {
  return [
    "반드시 아래 JSON만 출력:",
    "{",
    '  "kind": "ROLE_PLAY",',
    '  "titleKo": "제목",',
    '  "roleContext": "응시자 역할 맥락",',
    '  "taskBrief": "응시자에게 보이는 브리핑",',
    '  "reportKindLabel": "ASSESSMENT REPORT · 역할수행 과제",',
    '  "durationMinutes": 15,',
    '  "recommendedSequence": "권장 진행 순서",',
    '  "maxTurns": 6,',
    '  "personaName": "상대역 이름",',
    '  "personaRole": "상대역 직급/역할",',
    '  "personaProfile": "연기 지침(응시자 비공개)",',
    '  "openingLine": "첫 발화",',
    '  "competencies": [',
    "    {",
    '      "competencyCode": "CODE", "nameKo": "이름", "definition": "정의",',
    '      "subskills": [{ "code": "SUB", "nameKo": "하위", "definition": "정의",',
    '        "indicators": [',
    '          {"code":"P1","polarity":"POSITIVE","textKo":"긍정 행동"},',
    '          {"code":"N1","polarity":"NEGATIVE_OR_MISSING","textKo":"부정/미관찰"}',
    "        ] }]",
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

function inBasketContract(): string {
  return [
    "반드시 아래 JSON만 출력:",
    "{",
    '  "kind": "IN_BASKET",',
    '  "titleKo": "제목",',
    '  "roleContext": "응시자 역할 맥락",',
    '  "taskBrief": "응시자에게 보이는 브리핑",',
    '  "reportKindLabel": "ASSESSMENT REPORT · 서류함 과제",',
    '  "durationMinutes": 30,',
    '  "recommendedSequence": "권장 처리 순서 힌트(채점용)",',
    '  "items": [',
    "    {",
    '      "fromLabel": "보낸 사람", "subject": "제목", "body": "본문",',
    '      "urgency": "HIGH|MEDIUM|LOW", "importance": "HIGH|MEDIUM|LOW",',
    '      "isDistractor": false, "targetCompetencyCode": "CODE 또는 null"',
    "    }",
    "  ],",
    '  "competencies": [ /* ROLE_PLAY와 동일 구조 */ ]',
    "}",
    "items는 6~10건. 그중 1~2건은 isDistractor=true(미끼).",
  ].join("\n");
}

function sanitizeLevel(value: unknown, fallback: "LOW" | "MEDIUM" | "HIGH") {
  return value === "LOW" || value === "HIGH" || value === "MEDIUM"
    ? value
    : fallback;
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function defaultSubskills(nameKo: string): DraftCompetencyLink["subskills"] {
  return [
    {
      code: "CORE",
      nameKo: "핵심 행동",
      definition: `${nameKo} 핵심 관찰 영역`,
      indicators: [
        {
          code: "P1",
          polarity: "POSITIVE",
          textKo: `${nameKo} 관련 긍정 행동이 명확히 나타난다.`,
        },
        {
          code: "N1",
          polarity: "NEGATIVE_OR_MISSING",
          textKo: `${nameKo} 관련 행동이 관찰되지 않거나 부정적으로 나타난다.`,
        },
      ],
    },
  ];
}

function ensureDraftSubskills(c: DraftCompetencyLink): DraftCompetencyLink {
  const hasIndicators = c.subskills.some((s) => s.indicators.length > 0);
  if (hasIndicators) return c;
  return { ...c, subskills: defaultSubskills(c.nameKo) };
}

function parseCompetencies(raw: unknown): DraftCompetencyLink[] {
  if (!Array.isArray(raw)) return [];
  const out: DraftCompetencyLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const competencyCode =
      typeof c.competencyCode === "string" ? c.competencyCode.trim().toUpperCase() : "";
    const nameKo = typeof c.nameKo === "string" ? c.nameKo.trim() : "";
    const definition = typeof c.definition === "string" ? c.definition.trim() : "";
    if (!competencyCode && !nameKo) continue;
    const subskillsRaw = Array.isArray(c.subskills) ? c.subskills : [];
    const subskills: DraftCompetencyLink["subskills"] = [];
    for (const s of subskillsRaw) {
      if (!s || typeof s !== "object") continue;
      const sub = s as Record<string, unknown>;
      const code = typeof sub.code === "string" ? sub.code.trim().toUpperCase() : "";
      const sName = typeof sub.nameKo === "string" ? sub.nameKo.trim() : "";
      const sDef = typeof sub.definition === "string" ? sub.definition.trim() : "";
      if (!code || !sName) continue;
      const indsRaw = Array.isArray(sub.indicators) ? sub.indicators : [];
      const indicators: DraftCompetencyLink["subskills"][number]["indicators"] = [];
      for (const ind of indsRaw) {
        if (!ind || typeof ind !== "object") continue;
        const i = ind as Record<string, unknown>;
        const iCode = typeof i.code === "string" ? i.code.trim().toUpperCase() : "";
        const textKo = typeof i.textKo === "string" ? i.textKo.trim() : "";
        const polarity =
          i.polarity === "NEGATIVE_OR_MISSING" ? "NEGATIVE_OR_MISSING" : "POSITIVE";
        if (!iCode || !textKo) continue;
        indicators.push({ code: iCode, polarity, textKo });
      }
      subskills.push({ code, nameKo: sName, definition: sDef || sName, indicators });
    }
    out.push(
      ensureDraftSubskills({
        competencyCode: competencyCode || nameKo.toUpperCase().replace(/\s+/g, "_"),
        nameKo: nameKo || competencyCode,
        definition: definition || nameKo || competencyCode,
        subskills,
      }),
    );
  }
  return out;
}

/** AI가 만든 역량을 플랫폼 뱅크 코드에 정렬. 코드/이름 매칭 실패 시 뱅크 상위 역량으로 폴백. */
export function alignCompetenciesToBank(
  competencies: DraftCompetencyLink[],
  available: AvailableCompetency[],
): DraftCompetencyLink[] {
  if (available.length === 0) return [];

  const byCode = new Map(available.map((c) => [c.code.toUpperCase(), c]));
  const byName = new Map(available.map((c) => [normalizeName(c.nameKo), c]));
  const used = new Set<string>();
  const aligned: DraftCompetencyLink[] = [];

  function matchBank(c: DraftCompetencyLink): AvailableCompetency | null {
    const codeHit = byCode.get(c.competencyCode.toUpperCase());
    if (codeHit) return codeHit;
    const nameHit = byName.get(normalizeName(c.nameKo));
    if (nameHit) return nameHit;
    const needle = normalizeName(c.nameKo || c.competencyCode);
    if (!needle) return null;
    for (const a of available) {
      const n = normalizeName(a.nameKo);
      if (n.includes(needle) || needle.includes(n)) return a;
    }
    return null;
  }

  for (const c of competencies) {
    const bank = matchBank(c);
    if (!bank) continue;
    const key = bank.code.toUpperCase();
    if (used.has(key)) continue;
    used.add(key);
    aligned.push(
      ensureDraftSubskills({
        ...c,
        competencyCode: bank.code.toUpperCase(),
        nameKo: bank.nameKo,
        definition: c.definition || bank.description || bank.nameKo,
      }),
    );
  }

  if (aligned.length === 0) {
    const seed = competencies[0];
    for (const bank of available.slice(0, Math.min(2, available.length))) {
      aligned.push(
        ensureDraftSubskills({
          competencyCode: bank.code.toUpperCase(),
          nameKo: bank.nameKo,
          definition: bank.description || bank.nameKo,
          subskills: seed?.subskills?.length
            ? seed.subskills
            : defaultSubskills(bank.nameKo),
        }),
      );
    }
  }

  return aligned;
}

export function parseScenarioDraftJson(
  raw: unknown,
  kind: AssessmentScenarioKind,
): ScenarioDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const titleKo = typeof o.titleKo === "string" ? o.titleKo.trim() : "";
  const taskBrief = typeof o.taskBrief === "string" ? o.taskBrief.trim() : "";
  if (!titleKo || !taskBrief) return null;
  const competencies = parseCompetencies(o.competencies);
  if (competencies.length === 0) return null;

  if (kind === "ROLE_PLAY") {
    return {
      kind: "ROLE_PLAY",
      titleKo,
      roleContext: typeof o.roleContext === "string" ? o.roleContext.trim() : "",
      taskBrief,
      reportKindLabel:
        typeof o.reportKindLabel === "string" && o.reportKindLabel.trim()
          ? o.reportKindLabel.trim()
          : "ASSESSMENT REPORT · 역할수행 과제",
      durationMinutes:
        typeof o.durationMinutes === "number" && o.durationMinutes > 0
          ? Math.min(60, Math.round(o.durationMinutes))
          : 15,
      recommendedSequence:
        typeof o.recommendedSequence === "string" ? o.recommendedSequence.trim() : null,
      maxTurns:
        typeof o.maxTurns === "number" && o.maxTurns > 0
          ? Math.min(12, Math.round(o.maxTurns))
          : 6,
      personaName: typeof o.personaName === "string" ? o.personaName.trim() : "상대역",
      personaRole: typeof o.personaRole === "string" ? o.personaRole.trim() : "",
      personaProfile:
        typeof o.personaProfile === "string" ? o.personaProfile.trim() : "",
      openingLine: typeof o.openingLine === "string" ? o.openingLine.trim() : "",
      competencies,
    };
  }

  const itemsRaw = Array.isArray(o.items) ? o.items : [];
  const items: InBasketDraftItem[] = [];
  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const fromLabel = typeof it.fromLabel === "string" ? it.fromLabel.trim() : "";
    const subject = typeof it.subject === "string" ? it.subject.trim() : "";
    const body = typeof it.body === "string" ? it.body.trim() : "";
    if (!fromLabel || !subject || !body) continue;
    items.push({
      fromLabel,
      subject,
      body,
      urgency: sanitizeLevel(it.urgency, "MEDIUM"),
      importance: sanitizeLevel(it.importance, "MEDIUM"),
      isDistractor: it.isDistractor === true,
      targetCompetencyCode:
        typeof it.targetCompetencyCode === "string"
          ? it.targetCompetencyCode.trim().toUpperCase() || null
          : null,
    });
  }
  if (items.length < 3) return null;

  return {
    kind: "IN_BASKET",
    titleKo,
    roleContext: typeof o.roleContext === "string" ? o.roleContext.trim() : "",
    taskBrief,
    reportKindLabel:
      typeof o.reportKindLabel === "string" && o.reportKindLabel.trim()
        ? o.reportKindLabel.trim()
        : "ASSESSMENT REPORT · 서류함 과제",
    durationMinutes:
      typeof o.durationMinutes === "number" && o.durationMinutes > 0
        ? Math.min(90, Math.round(o.durationMinutes))
        : 30,
    recommendedSequence:
      typeof o.recommendedSequence === "string" ? o.recommendedSequence.trim() : null,
    items,
    competencies,
  };
}

export async function generateScenarioDraftFromDocument(params: {
  kind: AssessmentScenarioKind;
  extractedText: string;
  availableCompetencies: AvailableCompetency[];
  /** 관리자 추가 지시 (업종·직급·톤 등) */
  guidance?: string | null;
}): Promise<ScenarioDraft> {
  const text = params.extractedText.trim().slice(0, 24_000);
  if (!text) {
    throw new ScenarioDraftError(
      "원문 텍스트가 비어 있습니다.",
      "empty_source",
    );
  }
  if (params.availableCompetencies.length === 0) {
    throw new ScenarioDraftError(
      "활성화된 플랫폼 역량이 없습니다.",
      "no_competencies",
    );
  }

  const system =
    SYSTEM +
    "\n\n" +
    (params.kind === "IN_BASKET" ? inBasketContract() : rolePlayContract());

  const guidance =
    typeof params.guidance === "string" && params.guidance.trim()
      ? params.guidance.trim().slice(0, 2000)
      : null;

  const userPrompt = JSON.stringify(
    {
      kind: params.kind,
      sampleTask: text,
      adminGuidance: guidance,
      availableCompetencies: params.availableCompetencies.slice(0, 40),
      instruction:
        "샘플과 유사한 실무형 평가 과제를 새로 설계하세요. 제목·인물·상황·문서는 샘플과 다르게 만들고, competencyCode는 availableCompetencies의 code만 사용하세요. adminGuidance가 있으면 우선 반영하세요.",
    },
    null,
    2,
  );

  const gemini = await generateGeminiForTier({
    systemInstruction: system,
    userPrompt,
    temperature: 0.35,
    maxOutputTokens: 8192,
    timeoutMs: 90_000,
    task: "assessment_scenario_draft",
    responseMimeType: "application/json",
  });
  if (!gemini.text) {
    throw new ScenarioDraftError(
      `AI 응답을 받지 못했습니다${gemini.attempts ? ` (${gemini.attempts})` : ""}.`,
      "gemini_empty",
    );
  }

  let parsed: unknown;
  try {
    const match = gemini.text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new ScenarioDraftError(
        "AI 응답에서 JSON을 찾지 못했습니다.",
        "json_missing",
      );
    }
    parsed = JSON.parse(match[0]) as unknown;
  } catch (e) {
    if (e instanceof ScenarioDraftError) throw e;
    throw new ScenarioDraftError(
      "AI 응답 JSON 파싱에 실패했습니다.",
      "json_parse",
    );
  }

  const draft = parseScenarioDraftJson(parsed, params.kind);
  if (!draft) {
    throw new ScenarioDraftError(
      params.kind === "IN_BASKET"
        ? "서류함 초안 형식이 올바르지 않습니다(제목·브리핑·항목 3건·역량 필요)."
        : "역할연기 초안 형식이 올바르지 않습니다(제목·브리핑·역량 필요).",
      "draft_invalid",
    );
  }

  draft.competencies = alignCompetenciesToBank(
    draft.competencies,
    params.availableCompetencies,
  );
  if (draft.competencies.length === 0) {
    throw new ScenarioDraftError(
      "역량을 플랫폼 뱅크에 연결하지 못했습니다.",
      "competency_align",
    );
  }

  if (draft.kind === "IN_BASKET") {
    const allowed = new Set(
      params.availableCompetencies.map((c) => c.code.toUpperCase()),
    );
    draft.items = draft.items.map((item) => {
      if (!item.targetCompetencyCode) return item;
      if (allowed.has(item.targetCompetencyCode)) return item;
      const byName = params.availableCompetencies.find(
        (c) =>
          normalizeName(c.nameKo) === normalizeName(item.targetCompetencyCode ?? ""),
      );
      return {
        ...item,
        targetCompetencyCode: byName?.code.toUpperCase() ?? null,
      };
    });
  }

  return draft;
}
