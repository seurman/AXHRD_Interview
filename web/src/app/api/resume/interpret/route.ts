import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { interpretResumeFast } from "@/lib/interview/resume-interpret";
import { ingestResumeInterpretation } from "@/lib/interview/resume-ontology";
import { evidenceGaps } from "@/lib/interview/resume-evidence";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 업로드/붙여넣기 직후 호출 — 빠른 claim↔역량 해석을 즉시 반환.
 * LLM 보강은 저장 시 after()로 올리거나 waitEnrich=true면 짧게 경쟁.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }

  const rl = checkRateLimit(`resume:interpret:${user.id}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "해석 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json();
    const resumeText = typeof body.resumeText === "string" ? body.resumeText.trim() : "";
    const resumeFileName =
      typeof body.resumeFileName === "string" ? body.resumeFileName.trim() : "paste.txt";
    const resumeId = typeof body.resumeId === "string" ? body.resumeId : undefined;
    const waitEnrich = body.waitEnrich === true;
    const persist = body.persist !== false;

    if (resumeText.length < 20 && !resumeId) {
      return NextResponse.json({ error: "자소서 텍스트가 너무 짧습니다." }, { status: 400 });
    }

    let row =
      resumeId
        ? await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } })
        : null;

    if (resumeId && !row) {
      return NextResponse.json({ error: "자소서를 찾을 수 없습니다." }, { status: 404 });
    }

    const rawText = resumeText.length >= 20 ? resumeText : (row?.rawText ?? "");
    if (rawText.length < 20) {
      return NextResponse.json({ error: "자소서 내용이 필요합니다." }, { status: 400 });
    }

    if (!persist) {
      const fast = interpretResumeFast(rawText);
      return NextResponse.json({
        mode: fast.interpretMode ?? "fast",
        summary: {
          summary: fast.summary,
          skills: fast.skills,
          experiences: fast.experiences,
          keywords: fast.keywords,
          claimCount: fast.evidence?.length ?? 0,
          gaps: evidenceGaps(fast.evidence ?? [])
            .filter((g) => g.strength < 0.4)
            .map((g) => g.code),
        },
        evidence: fast.evidence,
        persisted: false,
      });
    }

    if (!row) {
      row = await prisma.resume.create({
        data: {
          userId: user.id,
          fileName: resumeFileName || "paste.txt",
          rawText,
        },
      });
    } else if (resumeText.length >= 20) {
      row = await prisma.resume.update({
        where: { id: row.id },
        data: { rawText, fileName: resumeFileName || row.fileName },
      });
    }

    const ingested = await ingestResumeInterpretation({
      userId: user.id,
      resumeId: row.id,
      rawText,
      waitEnrichMs: waitEnrich ? 3500 : 0,
      scheduleBackgroundEnrich: true,
    });

    return NextResponse.json({
      resumeId: row.id,
      mode: ingested.summary.interpretMode ?? (ingested.usedEnrich ? "enriched" : "fast"),
      usedEnrich: ingested.usedEnrich,
      enrichScheduled: ingested.enrichScheduled,
      summary: {
        summary: ingested.summary.summary,
        skills: ingested.summary.skills,
        experiences: ingested.summary.experiences,
        keywords: ingested.summary.keywords,
        claimCount: ingested.summary.evidence?.length ?? 0,
        gaps: evidenceGaps(ingested.summary.evidence ?? [])
          .filter((g) => g.strength < 0.4)
          .map((g) => g.code),
      },
      evidence: ingested.summary.evidence,
      persisted: true,
    });
  } catch (e) {
    console.error("[resume/interpret]", e);
    const message = e instanceof Error ? e.message : "자소서 해석 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
