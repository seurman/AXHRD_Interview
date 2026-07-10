import { NextResponse } from "next/server";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { mapQuestionToRubric } from "@/lib/repository/service";

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const rubricSetId = typeof body.rubricSetId === "string" ? body.rubricSetId : "";

  if (!questionId || !rubricSetId) {
    return NextResponse.json(
      { error: "questionId와 rubricSetId가 필요합니다." },
      { status: 400 },
    );
  }

  const mapping = await mapQuestionToRubric(questionId, rubricSetId);
  return NextResponse.json({ mapping }, { status: 201 });
}
