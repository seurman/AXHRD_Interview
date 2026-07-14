import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { deriveInterviewStyleFromJD, parseJdRequirements } from "@/lib/company/jd-mapper";
import { resolveCompanyContext } from "@/lib/company/enrich";
import {
  buildResumeKeywordPool,
  generateResumeReviewNarrative,
  matchKeywords,
  presetRequiredKeywords,
} from "@/lib/interview/resume-review";
import {
  ingestResumeInterpretation,
  loadCompetencyPerformance,
  persistResumeOntology,
} from "@/lib/interview/resume-ontology";
import { interpretResume } from "@/lib/interview/resume-interpret";
import { matchClaimsToJd, recommendNextCompetencies } from "@/lib/neo4j/graph-analytics";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import { ensureResumeEvidence, evidenceGaps, performanceBand } from "@/lib/interview/resume-evidence";
import { parseResumeSummary } from "@/lib/interview/build-question";
import { competencyLabel, industryLabel, jobRoleLabel } from "@/lib/labels";
import { INDUSTRY_CODES, JOB_ROLES } from "@/types";
import type { CompetencyCode, IndustryCode, JobRoleCode } from "@/types";

export const maxDuration = 90;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`resume:review:${user.id}`, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "첨삭 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const resumeId = typeof body.resumeId === "string" ? body.resumeId : undefined;
    const resumeTextInput = typeof body.resumeText === "string" ? body.resumeText.trim() : "";
    const resumeFileName =
      typeof body.resumeFileName === "string" ? body.resumeFileName.trim() : "paste.txt";
    const targetCompanyId =
      typeof body.targetCompanyId === "string" ? body.targetCompanyId : undefined;
    const jdTextInput = typeof body.jdText === "string" ? body.jdText.trim() : "";
    const jdUrl = typeof body.jdUrl === "string" ? body.jdUrl.trim() : "";
    const industryRaw = typeof body.industry === "string" ? body.industry : "OTHER";
    const jobRoleRaw = typeof body.jobRole === "string" ? body.jobRole : "OTHER";

    const industryCode: IndustryCode = INDUSTRY_CODES.includes(industryRaw as IndustryCode)
      ? (industryRaw as IndustryCode)
      : "OTHER";
    const jobRoleCode: JobRoleCode = (JOB_ROLES as readonly string[]).includes(jobRoleRaw)
      ? (jobRoleRaw as JobRoleCode)
      : "OTHER";

    let resumeRow: { id: string; rawText: string; parsedTags: unknown } | null = null;

    if (resumeId) {
      resumeRow = await prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
      });
      if (!resumeRow) {
        return NextResponse.json({ error: "자소서를 찾을 수 없습니다." }, { status: 404 });
      }
    } else if (resumeTextInput.length >= 20) {
      resumeRow = await prisma.resume.create({
        data: {
          userId: user.id,
          fileName: resumeFileName || "paste.txt",
          rawText: resumeTextInput,
        },
      });
      // 첨삭은 LLM 서사 대기 가능 — 최대 4s 보강 경쟁 + 미완 시 after() 보강
      const ingested = await ingestResumeInterpretation({
        userId: user.id,
        resumeId: resumeRow.id,
        rawText: resumeTextInput,
        waitEnrichMs: 4000,
        scheduleBackgroundEnrich: true,
      });
      resumeRow = {
        ...resumeRow,
        parsedTags: ingested.summary,
        rawText: resumeTextInput,
      };
    } else {
      return NextResponse.json(
        { error: "자소서 내용이 필요합니다. 20자 이상 입력하거나 저장된 자소서를 선택해 주세요." },
        { status: 400 }
      );
    }

    let resumeSummary: ResumeSummary =
      parseResumeSummary(resumeRow.parsedTags) ??
      (await interpretResume({ rawText: resumeRow.rawText, waitEnrichMs: 3500 })).summary;
    resumeSummary = ensureResumeEvidence(resumeSummary);

    await persistResumeOntology({
      userId: user.id,
      resumeId: resumeRow.id,
      summary: resumeSummary,
    });
    if (!parseResumeSummary(resumeRow.parsedTags)?.evidence?.length) {
      await prisma.resume.update({
        where: { id: resumeRow.id },
        data: { parsedTags: JSON.parse(JSON.stringify(resumeSummary)) },
      });
    }

    const performances = await loadCompetencyPerformance(user.id);
    const gaps = evidenceGaps(resumeSummary.evidence ?? []);
    const recs = recommendNextCompetencies({
      performances,
      evidence: resumeSummary.evidence,
      limit: 3,
    });
    const evidenceContext = (resumeSummary.evidence ?? [])
      .slice(0, 8)
      .map((e) => {
        const codes = e.competencies.map((c) => `${c.code}(${c.score.toFixed(2)})`).join(",");
        return `- [${e.title}] → ${codes}`;
      })
      .join("\n");
    const performanceContext = [
      performances.length
        ? performances
            .map((p) => {
              const band = performanceBand(p);
              return `- ${competencyLabel(p.code as CompetencyCode)}: band=${band}, level=${p.levelEst ?? "—"}, θ=${p.theta?.toFixed?.(2) ?? "—"}`;
            })
            .join("\n")
        : "",
      recs.length
        ? `추천 다음 역량:\n${recs.map((r) => `- ${competencyLabel(r.code)} (${r.reason})`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    const suggestedFromEvidence = [
      ...recs.map((r) => r.code),
      ...gaps.filter((g) => g.strength < 0.45).map((g) => g.code),
      ...performances
        .filter((p) => performanceBand(p) === "weak")
        .map((p) => p.code as CompetencyCode),
    ].filter((c, i, arr) => arr.indexOf(c) === i) as CompetencyCode[];

    let matchSource: "jd" | "industry_preset" = "industry_preset";
    let requiredKeywords: string[] = [];
    let requiredSkills: string[] = [];
    let linkedTargetCompanyId: string | null = null;

    if (targetCompanyId) {
      const company = await prisma.targetCompany.findFirst({
        where: { id: targetCompanyId, userId: user.id },
      });
      if (!company) {
        return NextResponse.json({ error: "지원 회사 정보를 찾을 수 없습니다." }, { status: 404 });
      }
      linkedTargetCompanyId = company.id;
      const req = parseJdRequirements(company.jdRequirements);
      if (req) {
        matchSource = "jd";
        requiredSkills = req.skills;
        requiredKeywords = [...req.skills, ...req.keywords];
      }
    }

    if (matchSource === "industry_preset") {
      let jdText = jdTextInput;
      if ((!jdText || jdText.length < 40) && jdUrl) {
        const { resolveJdText } = await import("@/lib/company/fetch-jd-url");
        const resolved = await resolveJdText({ jdText: jdTextInput, jdUrl });
        if (resolved.text) jdText = resolved.text;
      }

      if (jdText.length >= 15) {
        const ctx = resolveCompanyContext({
          companyName: typeof body.companyName === "string" ? body.companyName : undefined,
          industry: industryCode,
        });
        const derived = await deriveInterviewStyleFromJD({
          jdText,
          industryLabel: ctx.industry,
        });
        if (derived) {
          matchSource = "jd";
          requiredSkills = derived.requirements.skills;
          requiredKeywords = [
            ...derived.requirements.skills,
            ...derived.requirements.keywords,
          ];
        }
      }
    }

    if (matchSource === "industry_preset") {
      const preset = presetRequiredKeywords(industryCode, jobRoleCode);
      requiredSkills = preset.skills;
      requiredKeywords = preset.keywords;
    }

    const resumeKeywords = buildResumeKeywordPool(resumeSummary);
    const jdMatch = matchKeywords(resumeKeywords, requiredKeywords);

    const jdClaimHits =
      matchSource === "jd" && requiredKeywords.length > 0
        ? matchClaimsToJd({
            jdText: requiredKeywords.join(" "),
            extraTerms: requiredKeywords,
            evidence: resumeSummary.evidence ?? [],
            limit: 5,
          })
        : [];
    const jdClaimContext = jdClaimHits.length
      ? `JD↔자소서 claim 매칭:\n${jdClaimHits
          .map(
            (h) =>
              `- [${h.title}] score=${h.score.toFixed(1)} terms=${h.matchedTerms.join(",") || "—"} → ${h.competencies.join("/")}`,
          )
          .join("\n")}`
      : "";

    const narrative = await generateResumeReviewNarrative({
      resumeSummary,
      resumeRawText: resumeRow.rawText,
      matchSource,
      jdMatch,
      requiredKeywords,
      industryLabel: industryLabel(industryCode),
      jobRoleLabel: jobRoleLabel(jobRoleCode),
      evidenceContext: [evidenceContext, jdClaimContext].filter(Boolean).join("\n\n") || undefined,
      performanceContext: performanceContext || undefined,
      suggestedFromEvidence: suggestedFromEvidence.slice(0, 3),
    });

    const review = await prisma.resumeReview.create({
      data: {
        userId: user.id,
        resumeId: resumeRow.id,
        targetCompanyId: linkedTargetCompanyId,
        matchSource,
        overallSummary: narrative.overallSummary,
        paragraphFeedback: narrative.paragraphFeedback as Prisma.InputJsonValue,
        jdMatch: jdMatch as Prisma.InputJsonValue,
        improvementPlan: narrative.improvementPlan as Prisma.InputJsonValue,
        suggestedCompetencies: narrative.suggestedCompetencies,
        dimensionScores: narrative.dimensionScores as Prisma.InputJsonValue,
        criteriaResults: narrative.criteriaResults as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      id: review.id,
      matchSource: review.matchSource,
      suggestedCompetencies: narrative.suggestedCompetencies,
    });
  } catch (e) {
    console.error("[resume/review]", e);
    const message = e instanceof Error ? e.message : "첨삭 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
