import { NextResponse } from "next/server";
import { parseResumeBuffer, validateResumeFile } from "@/lib/resume/parse";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 인증 없이 열려 있는 라우트 — 파일 파싱은 CPU를 많이 쓰므로 IP로 방어.
    const ip = getClientIp(req);
    const rl = checkRateLimit(`resume:parse:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const validationError = validateResumeFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await parseResumeBuffer(buffer, file.name);

    return NextResponse.json({
      text,
      fileName: file.name,
      charCount: text.length,
    });
  } catch (e) {
    console.error("[resume/parse]", e);
    const message =
      e instanceof Error ? e.message : "파일 파싱 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
