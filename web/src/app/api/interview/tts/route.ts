import { NextResponse } from "next/server";
import { synthesizeSpeechWithMeta } from "@/lib/gemini/tts";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // TTS는 호출당 비용이 발생하므로 로그인 사용자만 호출 가능하도록 제한.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`interview:tts:${user.id}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { text } = await req.json();

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
