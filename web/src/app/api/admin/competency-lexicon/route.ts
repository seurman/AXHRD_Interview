import { NextResponse } from "next/server";
import {
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { getLexiconDoc } from "@/lib/competency/lexicon";

export const runtime = "nodejs";

/** 관리자·콘텐츠 스튜디오용 역량 단어장 SSoT */
export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;
  return NextResponse.json(getLexiconDoc());
}
