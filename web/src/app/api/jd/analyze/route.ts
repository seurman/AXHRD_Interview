import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { deriveInterviewStyleFromJD } from "@/lib/company/jd-mapper";
import { enrichJdAnalysisWithMeaningGraph } from "@/lib/company/jd-enrichment";
import { INDUSTRY_CODES, JOB_ROLES } from "@/types";
import type { IndustryCode, JobRoleCode } from "@/types";

export const maxDuration = 60;

/** 면접 설정 전 — 채용공고 텍스트로 필요역량·면접 스타일 분석 (LLM + Meaning Layer 그래프) */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`jd:analyze:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const jdText = typeof body.jdText === "string" ? body.jdText.trim() : "";
  const industryLabel =
    typeof body.industryLabel === "string" && body.industryLabel.trim()
      ? body.industryLabel.trim()
      : "기타";
  const industryCode =
    typeof body.industryCode === "string" && INDUSTRY_CODES.includes(body.industryCode as IndustryCode)
      ? (body.industryCode as IndustryCode)
      : null;
  const jobRoleCode =
    typeof body.jobRole === "string" && JOB_ROLES.includes(body.jobRole as JobRoleCode)
      ? (body.jobRole as JobRoleCode)
      : null;

  if (!jdText || jdText.length < 15) {
    return NextResponse.json({ error: "분석할 채용공고 텍스트가 너무 짧습니다." }, { status: 400 });
  }

  const base = await deriveInterviewStyleFromJD({ jdText, industryLabel });
  if (!base) {
    return NextResponse.json(
      { error: "공고를 분석하지 못했습니다. 텍스트를 확인해 주세요." },
      { status: 422 },
    );
  }

  try {
    const enriched = await enrichJdAnalysisWithMeaningGraph(base, {
      jdText,
      industryCode,
      jobRoleCode,
    });
    return NextResponse.json(enriched);
  } catch (e) {
    console.error("[jd/analyze] meaning graph enrichment failed:", e);
    return NextResponse.json({
      ...base,
      meaningGraphScores: [],
      recommendationSource: base.recommendedCompetency ? "llm" : null,
    });
  }
}
