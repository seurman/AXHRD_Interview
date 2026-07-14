/**
 * 자소서 원문을 그대로 매 질문 생성 프롬프트에 흘려보내지 않고, 한 번만 구조화된
 * 요약으로 정리해 재사용한다.
 *
 * 이유: (1) 원문은 PDF/OCR 추출 과정에서 깨진 문자·줄바꿈·인적사항 블록이 섞여 있을 수
 * 있어 그대로 인용하면 오류(엉뚱한 문장 인용, 개인정보 노출 등)가 날 수 있다.
 * (2) 원문 전체(길면 수천 자)를 문항마다 다시 붙여보내는 대신, 한 번 요약해서
 * Resume.parsedTags(기존에 있었지만 어디서도 안 쓰이던 죽은 필드)에 저장해두면
 * 이후 모든 질문 개인화·연관도 매칭에 재사용할 수 있어 LLM 호출도 늘지 않는다
 * (자소서 저장 시 1회만 호출, 문항 생성 때는 저장된 요약만 읽음).
 */

import { ensureResumeEvidence } from "@/lib/interview/resume-evidence";
import { interpretResume } from "@/lib/interview/resume-interpret";

export type ResumeChunk = {
  /** 경험/프로젝트 제목 — 질문 UI에 표시 */
  title: string;
  /** 500~1000자 마크다운 본문 — 질문 인용·근거 표시의 원천 */
  markdown: string;
  tags?: string[];
};

export interface ResumeSummary {
  /** 3~4문장 평이한 요약 — 어떤 배경·경험을 가진 지원자인지 */
  summary: string;
  /** 핵심 스킬/툴/자격 키워드 */
  skills: string[];
  /** 핵심 경험 1건당 1문장 (회사/프로젝트/역할/성과 포함) — 질문 인용에 사용 */
  experiences: string[];
  /** 직무/JD 매칭용 키워드(산업·직무·기술 용어) */
  keywords: string[];
  /** 의미 단위 마크다운 청크 — personalize-question이 인용의 1차 소스 */
  chunks: ResumeChunk[];
  /**
   * 온톨로지 claim ↔ 역량 링크 (SSOT는 Postgres; Neo4j에 미러).
   * summarize 직후 `ensureResumeEvidence`로 채워짐.
   */
  evidence?: import("@/lib/interview/resume-evidence").ResumeEvidenceClaim[];
  /** fast=휴리스틱 즉시, enriched=LLM 보강 완료 */
  interpretMode?: "fast" | "enriched";
  /** ISO timestamp */
  interpretedAt?: string;
}

function emptySummary(): ResumeSummary {
  return { summary: "", skills: [], experiences: [], keywords: [], chunks: [] };
}

export function normalizeChunks(raw: unknown, experiences: string[]): ResumeChunk[] {
  if (!Array.isArray(raw)) return experiencesToChunks(experiences);
  const chunks: ResumeChunk[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const markdown = typeof o.markdown === "string" ? o.markdown.trim() : "";
    if (!title || markdown.length < 40) continue;
    const tags = Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === "string")
      : undefined;
    chunks.push({ title, markdown: markdown.slice(0, 1200), tags });
  }
  return chunks.length > 0 ? chunks.slice(0, 8) : experiencesToChunks(experiences);
}

function experiencesToChunks(experiences: string[]): ResumeChunk[] {
  return experiences.slice(0, 5).map((exp, i) => ({
    title: `경험 ${i + 1}`,
    markdown: exp,
    tags: [],
  }));
}

/** 사용자 자소서 원문에서 프롬프트 인젝션 시도를 완화(완전 차단은 아님 — 시스템 지시와 병행) */
export function sanitizeResumeForLlm(rawText: string): string {
  return rawText
    .replace(/^(?:system|assistant|user)\s*:/gim, "")
    .replace(/이\s*지시(?:는|를)?\s*무시/gi, "[제거됨]")
    .replace(/무조건\s*만점/gi, "[제거됨]")
    .replace(/만점(?:을|을)?\s*(?:줘|주세요|해\s*줘)/gi, "[제거됨]")
    .replace(/ignore\s+(?:all\s+)?(?:previous|above)\s+instructions/gi, "[removed]")
    .trim();
}

/** API 키 미설정/오류 시 폴백 — LLM 없이 원문에서 문장만 추려 최소한의 요약을 만든다. */
export function heuristicSummary(rawText: string): ResumeSummary {
  const normalized = rawText.replace(/\s*\n+\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  const CONTACT_INFO = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}|01[016789][-\s]?\d{3,4}[-\s]?\d{4}/;
  const sentences = normalized
    .split(/(?<=[.!?])\s+|。+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 120 && !CONTACT_INFO.test(s));

  if (sentences.length === 0) return emptySummary();

  const experiences = [
    ...new Set(sentences.filter((s) => EXPERIENCE_METRIC_PATTERN.test(s))),
  ].slice(0, 5);

  return {
    summary: sentences.slice(0, 3).join(" "),
    skills: [],
    experiences: experiences.length > 0 ? experiences : sentences.slice(0, 3),
    keywords: [],
    chunks: experiencesToChunks(
      experiences.length > 0 ? experiences : sentences.slice(0, 3),
    ),
  };
}

export const EXPERIENCE_METRIC_PATTERN =
  /\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|천만\s?원|배|시간|일|개월|주년?|회)/;

export function prioritizeExperiences(experiences: string[]): string[] {
  const candidates = experiences.filter((e) => typeof e === "string" && e.trim().length >= 8);
  if (candidates.length === 0) return [];

  const withMetric = candidates.filter((e) => EXPERIENCE_METRIC_PATTERN.test(e));
  return withMetric.length > 0 ? withMetric : candidates;
}

function isValidSummary(v: unknown): v is ResumeSummary {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.summary === "string" &&
    Array.isArray(o.skills) &&
    Array.isArray(o.experiences) &&
    Array.isArray(o.keywords)
  );
}

export function normalizeResumeSummary(raw: unknown): ResumeSummary | undefined {
  if (!isValidSummary(raw)) return undefined;
  const o = raw as ResumeSummary;
  const experiences = o.experiences.filter((s): s is string => typeof s === "string");
  const chunks = Array.isArray(o.chunks) && o.chunks.length > 0
    ? normalizeChunks(o.chunks, experiences)
    : normalizeChunks(undefined, experiences);
  const base: ResumeSummary = {
    summary: o.summary.trim(),
    skills: o.skills.filter((s): s is string => typeof s === "string"),
    experiences,
    keywords: o.keywords.filter((s): s is string => typeof s === "string"),
    chunks,
  };
  if (Array.isArray((o as ResumeSummary).evidence) && (o as ResumeSummary).evidence!.length > 0) {
    base.evidence = (o as ResumeSummary).evidence;
  }
  if ((o as ResumeSummary).interpretMode === "fast" || (o as ResumeSummary).interpretMode === "enriched") {
    base.interpretMode = (o as ResumeSummary).interpretMode;
  }
  if (typeof (o as ResumeSummary).interpretedAt === "string") {
    base.interpretedAt = (o as ResumeSummary).interpretedAt;
  }
  return ensureResumeEvidence(base);
}

/**
 * 하위 호환 엔트리 — 기본은 빠른 해석 + 최대 ~4.5초 LLM 보강 경쟁.
 * 즉시 응답이 필요하면 `interpretResume({ waitEnrichMs: 0 })` 또는
 * `interpretResumeFast`를 쓰세요.
 */
export async function summarizeResume(rawText: string): Promise<ResumeSummary> {
  const { summary } = await interpretResume({ rawText, waitEnrichMs: 4500 });
  return summary;
}
