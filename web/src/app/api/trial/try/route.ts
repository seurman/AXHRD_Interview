import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildGuestTryFeedback } from "@/lib/demo/guest-try-feedback";
import { pickShowcaseQuestion, listShowcaseCompetencies } from "@/lib/interview/showcase-questions";
import { COMPETENCY_CODES } from "@/types";

/** 비로그인 1문항 체험 — DB 세션 저장 없음, 쇼케이스 문항만 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const competencyParam = url.searchParams.get("competency");
  const levelParam = url.searchParams.get("level");

  if (!competencyParam) {
    const competencies = await listShowcaseCompetencies();
    return NextResponse.json({
      competencies: competencies.map((c) => ({ code: c.code, nameKo: c.nameKo })),
    });
  }

  const code = COMPETENCY_CODES.includes(competencyParam as (typeof COMPETENCY_CODES)[number])
    ? competencyParam
    : COMPETENCY_CODES[0];
  const level = levelParam ? Number(levelParam) : 3;
  const picked = await pickShowcaseQuestion(code, level);
  if (!picked) {
    return NextResponse.json({ error: "체험용 문항이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    competency: picked.competency.code,
    competencyLabel: picked.competency.nameKo,
    level: picked.question.level,
    question: picked.question.template,
  });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`trial:try:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "체험 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const competencyCode =
    typeof body.competencyCode === "string" ? body.competencyCode.trim() : "";
  const level = typeof body.level === "number" ? body.level : Number(body.level) || 3;

  if (!answer || answer.length < 15) {
    return NextResponse.json({ error: "15자 이상 답변을 입력해 주세요." }, { status: 400 });
  }

  const code = COMPETENCY_CODES.includes(competencyCode as (typeof COMPETENCY_CODES)[number])
    ? competencyCode
    : COMPETENCY_CODES[0];

  const picked = await pickShowcaseQuestion(code, level);
  if (!picked) {
    return NextResponse.json(
      { error: "체험용 문항이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }

  const feedback = buildGuestTryFeedback(answer, picked.question.template);

  return NextResponse.json({
    ok: true,
    competency: picked.competency.code,
    competencyLabel: picked.competency.nameKo,
    level: picked.question.level,
    question: picked.question.template,
    feedback,
  });
}
