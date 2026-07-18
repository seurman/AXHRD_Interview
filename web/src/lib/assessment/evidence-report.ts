import type {
  BehaviorPolarity,
  CompetencyAssessmentBlock,
  DevelopmentTask,
  EvidenceAssessmentDomain,
  EvidenceAssessmentReport,
  ObservedBehavior,
  RatingLevelLabel,
  RatingScaleRow,
  SubCompetencyAssessment,
} from "@/types/evidence-assessment";
import {
  percentileToFiveScale,
  scoreToLevelLabel,
} from "@/types/evidence-assessment";

export { percentileToFiveScale, scoreToLevelLabel };

const DOMAINS: EvidenceAssessmentDomain[] = [
  "INTERVIEW",
  "ROLE_PLAY",
  "DIAGNOSTIC",
  "IN_BASKET",
];

const POLARITIES: BehaviorPolarity[] = ["POSITIVE", "NEGATIVE_OR_MISSING"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDomain(value: unknown): value is EvidenceAssessmentDomain {
  return typeof value === "string" && DOMAINS.includes(value as EvidenceAssessmentDomain);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function clampScore1to5(n: unknown): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return 3;
  return Math.min(5, Math.max(1, Math.round(num * 100) / 100));
}

function normalizeBehavior(raw: unknown): ObservedBehavior | null {
  if (!isRecord(raw)) return null;
  const polarity = POLARITIES.includes(raw.polarity as BehaviorPolarity)
    ? (raw.polarity as BehaviorPolarity)
    : null;
  const text = str(raw.text).trim();
  if (!polarity || !text) return null;
  return {
    polarity,
    text,
    quote: optStr(raw.quote),
    trigger: optStr(raw.trigger),
    analysis: optStr(raw.analysis),
    indicatorCode: optStr(raw.indicatorCode),
  };
}

function normalizeSubCompetency(raw: unknown): SubCompetencyAssessment | null {
  if (!isRecord(raw)) return null;
  const code = str(raw.code).trim();
  const nameKo = str(raw.nameKo).trim();
  if (!code && !nameKo) return null;
  const score = clampScore1to5(raw.score);
  const observedBehaviors = Array.isArray(raw.observedBehaviors)
    ? raw.observedBehaviors
        .map(normalizeBehavior)
        .filter((b): b is ObservedBehavior => b !== null)
    : [];
  return { code: code || nameKo, nameKo: nameKo || code, score, observedBehaviors };
}

function normalizeCompetency(raw: unknown): CompetencyAssessmentBlock | null {
  if (!isRecord(raw)) return null;
  const code = str(raw.code).trim();
  const nameKo = str(raw.nameKo).trim();
  if (!code && !nameKo) return null;
  const score = clampScore1to5(raw.score);
  const levelLabel = scoreToLevelLabel(score);
  const subCompetencies = Array.isArray(raw.subCompetencies)
    ? raw.subCompetencies
        .map(normalizeSubCompetency)
        .filter((s): s is SubCompetencyAssessment => s !== null)
    : [];
  return {
    code: code || nameKo,
    nameKo: nameKo || code,
    definition: str(raw.definition),
    score,
    levelLabel,
    subCompetencies,
    rationale: str(raw.rationale),
    developmentAdvice: str(raw.developmentAdvice),
  };
}

function normalizeDevelopmentTask(raw: unknown): DevelopmentTask | null {
  if (!isRecord(raw)) return null;
  const title = str(raw.title).trim();
  const body = str(raw.body).trim();
  if (!title && !body) return null;
  return {
    title: title || body.slice(0, 24),
    body,
    practiceSequence: optStr(raw.practiceSequence),
  };
}

function normalizeRatingScale(raw: unknown): RatingScaleRow[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw
    .map((r): RatingScaleRow | null => {
      if (!isRecord(r)) return null;
      const score = Number(r.score);
      if (![1, 2, 3, 4, 5].includes(score)) return null;
      return {
        score: score as 1 | 2 | 3 | 4 | 5,
        levelLabel: str(r.levelLabel) as RatingLevelLabel,
        criteria: str(r.criteria),
      };
    })
    .filter((r): r is RatingScaleRow => r !== null);
  return rows.length ? rows : undefined;
}

/**
 * EvidenceAssessmentReport v1 검증 + 정규화.
 * 형태가 어긋나거나 필수 필드가 없으면 null. 절대 raw를 그대로 캐스팅하지 않는다.
 */
export function parseEvidenceAssessmentReport(
  raw: unknown,
): EvidenceAssessmentReport | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== 1) return null;
  if (!isDomain(raw.domain)) return null;
  if (!Array.isArray(raw.competencies) || raw.competencies.length === 0) return null;

  const competencies = raw.competencies
    .map(normalizeCompetency)
    .filter((c): c is CompetencyAssessmentBlock => c !== null);
  if (competencies.length === 0) return null;

  const overallScore =
    typeof raw.overallScore === "number" && Number.isFinite(raw.overallScore)
      ? clampScore1to5(raw.overallScore)
      : clampScore1to5(
          competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length,
        );

  return {
    schemaVersion: 1,
    domain: raw.domain,
    reportKindLabel: str(raw.reportKindLabel, "ASSESSMENT REPORT"),
    title: str(raw.title),
    roleContext: optStr(raw.roleContext),
    overallScore,
    overallScaleMax: 5,
    overallLevelLabel: scoreToLevelLabel(overallScore),
    executiveSummary: str(raw.executiveSummary),
    competencies,
    strengths: strArray(raw.strengths),
    developmentTasks: Array.isArray(raw.developmentTasks)
      ? raw.developmentTasks
          .map(normalizeDevelopmentTask)
          .filter((t): t is DevelopmentTask => t !== null)
      : [],
    ratingScale: normalizeRatingScale(raw.ratingScale),
    recommendedSequence: optStr(raw.recommendedSequence),
  };
}

export function emptyEvidenceReport(
  partial: Partial<EvidenceAssessmentReport> &
    Pick<EvidenceAssessmentReport, "domain">,
): EvidenceAssessmentReport {
  const overallScore = clampScore1to5(partial.overallScore ?? 3);
  return {
    schemaVersion: 1,
    domain: partial.domain,
    reportKindLabel: partial.reportKindLabel ?? "ASSESSMENT REPORT",
    title: partial.title ?? "",
    roleContext: partial.roleContext ?? null,
    overallScore,
    overallScaleMax: 5,
    overallLevelLabel:
      partial.overallLevelLabel ?? scoreToLevelLabel(overallScore),
    executiveSummary: partial.executiveSummary ?? "",
    competencies: partial.competencies ?? [],
    strengths: partial.strengths ?? [],
    developmentTasks: partial.developmentTasks ?? [],
    ratingScale: partial.ratingScale,
    recommendedSequence: partial.recommendedSequence ?? null,
  };
}

type AnchorRow = {
  score: number;
  levelLabel: string;
  criteria: string;
};

/** DB RatingScaleAnchor 행 → UI/프롬프트용 RatingScaleRow[] (5→1 정렬) */
export function ratingScaleFromAnchors(rows: AnchorRow[]): RatingScaleRow[] {
  return rows
    .filter((r) => r.score >= 1 && r.score <= 5)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      score: r.score as 1 | 2 | 3 | 4 | 5,
      levelLabel: r.levelLabel as RatingLevelLabel,
      criteria: r.criteria,
    }));
}
