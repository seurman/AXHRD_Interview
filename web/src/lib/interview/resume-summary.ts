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

import { generateGeminiText } from "@/lib/gemini/client";

export interface ResumeSummary {
  /** 3~4문장 평이한 요약 — 어떤 배경·경험을 가진 지원자인지 */
  summary: string;
  /** 핵심 스킬/툴/자격 키워드 */
  skills: string[];
  /** 핵심 경험 1건당 1문장 (회사/프로젝트/역할/성과 포함) — 질문 인용에 사용 */
  experiences: string[];
  /** 직무/JD 매칭용 키워드(산업·직무·기술 용어) */
  keywords: string[];
}

const SUMMARY_SYSTEM = `당신은 채용 담당자를 돕는 자기소개서 분석가입니다.
지원자의 자소서 원문(PDF/문서 추출 과정에서 줄바꿈이나 오탈자가 섞여 있을 수 있음)을 읽고
아래 JSON 형식으로만 요약하세요.

중요:
- 원문에 실제로 없는 내용을 지어내지 마세요. 추측하지 말고 원문에 근거한 사실만 정리하세요.
- 이메일·전화번호·생년월일 등 개인정보/인적사항은 요약에 포함하지 마세요.
- experiences는 회사명·프로젝트명·역할·성과(가능하면 수치)를 담아 1문장씩, 최대 5개.
- 원문이 너무 짧거나 실질적 경험 서술이 없으면 배열은 빈 배열로 두세요.

반드시 JSON만:
{
  "summary": "3~4문장 요약",
  "skills": ["..."],
  "experiences": ["..."],
  "keywords": ["..."]
}`;

function emptySummary(): ResumeSummary {
  return { summary: "", skills: [], experiences: [], keywords: [] };
}

/** API 키 미설정/오류 시 폴백 — LLM 없이 원문에서 문장만 추려 최소한의 요약을 만든다.
 *  질문 인용에 쓰던 기존 휴리스틱(성과 수치·인적사항 제외 등)과 같은 원칙을 따른다. */
function heuristicSummary(rawText: string): ResumeSummary {
  const normalized = rawText.replace(/\s*\n+\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  const CONTACT_INFO = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}|01[016789][-\s]?\d{3,4}[-\s]?\d{4}/;
  const sentences = normalized
    .split(/(?<=[.!?])\s+|。+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 120 && !CONTACT_INFO.test(s));

  if (sentences.length === 0) return emptySummary();

  const METRIC_PATTERN = /\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|천만\s?원|배|시간|일|개월|주년?|회)/;
  const experiences = [...new Set(sentences.filter((s) => METRIC_PATTERN.test(s)))].slice(0, 5);

  return {
    summary: sentences.slice(0, 3).join(" "),
    skills: [],
    experiences: experiences.length > 0 ? experiences : sentences.slice(0, 3),
    keywords: [],
  };
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

export async function summarizeResume(rawText: string): Promise<ResumeSummary> {
  const trimmed = rawText.trim();
  if (!trimmed) return emptySummary();

  if (!process.env.GEMINI_API_KEY) {
    return heuristicSummary(trimmed);
  }

  const content = await generateGeminiText({
    systemInstruction: SUMMARY_SYSTEM,
    userPrompt: `자소서 원문:\n${trimmed.slice(0, 4000)}`,
    temperature: 0.2,
    maxOutputTokens: 512,
    timeoutMs: 8000,
  });

  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (isValidSummary(parsed)) {
          return {
            summary: parsed.summary.trim(),
            skills: parsed.skills.filter((s): s is string => typeof s === "string"),
            experiences: parsed.experiences.filter((s): s is string => typeof s === "string"),
            keywords: parsed.keywords.filter((s): s is string => typeof s === "string"),
          };
        }
      } catch (e) {
        console.error("[resume-summary] JSON parse 실패:", e);
      }
    }
  }

  return heuristicSummary(trimmed);
}
