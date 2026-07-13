import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadDemoWorkspaceBySlug } from "@/lib/demo/workspace";
import { buildGuestTryFeedback } from "@/lib/demo/guest-try-feedback";

/** 비로그인 1문항 체험 — DB 저장 없음, STAR 휴리스틱 피드백만 반환 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug);
    } catch {
      return rawSlug;
    }
  })();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "guest";

  const rl = checkRateLimit(`demo:try:${ip}`, 12, 10 * 60 * 1000);
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
    return NextResponse.json(
      { error: "15자 이상 답변을 입력해 주세요." },
      { status: 400 },
    );
  }

  const workspace = await loadDemoWorkspaceBySlug(slug);
  if (!workspace) {
    return NextResponse.json({ error: "데모를 찾을 수 없습니다." }, { status: 404 });
  }

  const comp = workspace.competencies.find((c) => c.code === competencyCode);
  if (!comp) {
    return NextResponse.json({ error: "역량을 선택해 주세요." }, { status: 400 });
  }

  const question =
    workspace.questions.find(
      (q) => q.competencyId === comp.id && q.level === Math.min(5, Math.max(1, level)),
    ) ?? workspace.questions.find((q) => q.competencyId === comp.id);

  if (!question?.template) {
    return NextResponse.json({ error: "체험용 문항이 없습니다." }, { status: 404 });
  }

  const feedback = await buildGuestTryFeedback(answer, question.template, comp.code);

  return NextResponse.json({
    ok: true,
    competency: comp.code,
    competencyLabel: comp.nameKo,
    level: question.level,
    question: question.template,
    feedback,
  });
}
