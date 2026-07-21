import { NextResponse } from "next/server";
import {
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { syncLexiconToUnifiedBank } from "@/lib/competency/lexicon-bank-sync";

export const runtime = "nodejs";

/** 역량사전 → Framework Studio 통합 뱅크 동기화 */
export async function POST() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  try {
    const result = await syncLexiconToUnifiedBank();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[competency-lexicon/sync-to-bank]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "동기화 실패" },
      { status: 500 },
    );
  }
}
