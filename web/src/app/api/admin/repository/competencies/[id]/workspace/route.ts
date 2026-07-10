import { NextResponse } from "next/server";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { getCompetencyWorkspace } from "@/lib/repository/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const workspace = await getCompetencyWorkspace(id);
  if (!workspace) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(workspace);
}
