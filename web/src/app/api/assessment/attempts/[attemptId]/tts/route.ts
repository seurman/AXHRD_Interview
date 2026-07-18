import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { synthesizeSpeechWithMeta } from "@/lib/gemini/tts";
import { checkRateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ attemptId: string }> };

/** 역할연기 상대역 발화 TTS — 시도 소유자만 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }

  const { attemptId } = await ctx.params;
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      scenario: { select: { kind: true } },
    },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });
  }
  if (attempt.scenario.kind !== "ROLE_PLAY") {
    return NextResponse.json(
      { error: "역할연기 과제에서만 TTS를 사용할 수 있습니다." },
      { status: 400 },
    );
  }
  if (attempt.status !== "DRAFT" && attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "진행 중인 시도가 아닙니다." }, { status: 400 });
  }

  const rl = checkRateLimit(`assessment:tts:${user.id}`, 40, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const started = Date.now();
  const { audio, cacheHit } = await synthesizeSpeechWithMeta(text.slice(0, 2000));
  const elapsedMs = Date.now() - started;

  if (!audio) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "X-TTS-Cache": cacheHit ? "HIT" : "MISS",
        "X-TTS-Elapsed-Ms": String(elapsedMs),
      },
    });
  }

  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/wav",
      "X-TTS-Cache": cacheHit ? "HIT" : "MISS",
      "X-TTS-Elapsed-Ms": String(elapsedMs),
    },
  });
}
