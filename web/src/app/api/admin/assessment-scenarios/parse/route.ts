import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseTaskDocument } from "@/lib/assessment/parse-task-document";

/** 과제 문서 업로드 → 텍스트 추출 + AssessmentTaskSource 저장 */
export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const rl = checkRateLimit(`admin:assessment-parse:${auth.id}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "multipart 형식이 필요합니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  }

  try {
    const parsed = await parseTaskDocument(file);
    const source = await prisma.assessmentTaskSource.create({
      data: {
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        byteSize: parsed.byteSize,
        checksumSha256: parsed.checksumSha256,
        extractedText: parsed.extractedText,
        createdByUserId: auth.id,
      },
    });

    await logAdminAudit({
      actor: auditActor(auth),
      action: "CREATE",
      entityType: "assessment_task_source",
      entityId: source.id,
      summary: `평가 과제 원문 업로드: ${source.fileName}`,
      beforeState: null,
      afterState: {
        fileName: source.fileName,
        byteSize: source.byteSize,
        textLength: source.extractedText.length,
      },
    });

    return NextResponse.json({
      source: {
        id: source.id,
        fileName: source.fileName,
        mimeType: source.mimeType,
        byteSize: source.byteSize,
        checksumSha256: source.checksumSha256,
        extractedTextPreview: source.extractedText.slice(0, 1200),
        extractedTextLength: source.extractedText.length,
        createdAt: source.createdAt,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "문서 파싱 실패" },
      { status: 400 },
    );
  }
}
