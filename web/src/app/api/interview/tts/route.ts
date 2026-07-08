import { NextResponse } from "next/server";
import { synthesizeSpeechWithMeta } from "@/lib/gemini/tts";
import { resolveInterviewActorFromRequest } from "@/lib/auth/interview-access";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const actor = sessionId
    ? await resolveInterviewActorFromRequest(req, sessionId)
    : null;

  if (!actor) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }

  const rlKey = actor.isPresenter ? `presenter:${sessionId}` : actor.userId;
  const rl = checkRateLimit(`interview:tts:${rlKey}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { text } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const started = Date.now();
  const { audio, cacheHit } = await synthesizeSpeechWithMeta(text);
  const elapsedMs = Date.now() - started;

  if (!audio) {
    // No API key — return empty so client uses text-only
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
