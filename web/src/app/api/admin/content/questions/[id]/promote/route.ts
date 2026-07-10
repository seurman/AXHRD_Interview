import { NextResponse } from "next/server";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { promoteQuestion, PromoteError, type PromoteMode } from "@/lib/content/promote";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const body = (await req.json()) as { mode?: PromoteMode };
  const mode = body.mode;
  if (mode !== "merge_into_base" && mode !== "promote_as_new_base") {
    return NextResponse.json(
      { error: "mode는 merge_into_base 또는 promote_as_new_base 여야 합니다." },
      { status: 400 }
    );
  }

  try {
    const result = await promoteQuestion(id, mode);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof PromoteError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
