import { NextResponse } from "next/server";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { bulkMapQuestionsToDefaultRubric } from "@/lib/repository/service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const result = await bulkMapQuestionsToDefaultRubric(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
