import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJdBuffer, validateJdFile } from "@/lib/company/parse-jd-file";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 면접 설정 — 채용공고 파일(PDF·Word·이미지) → 텍스트 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`jd:parse:${user.id}`, 15, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const validationError = validateJdFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseJdBuffer(buffer, file.name);

    return NextResponse.json({
      text: result.text,
      fileName: file.name,
      charCount: result.text.length,
      source: result.source,
      ocrUsed: result.source === "image_ocr",
    });
  } catch (e) {
    console.error("[jd/parse]", e);
    const message = e instanceof Error ? e.message : "파일을 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
