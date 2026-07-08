import { NextResponse } from "next/server";
import { warmIrtEngine } from "@/lib/irt-client";

/** Render IRT 슬립 해소용 — 데모·면접 시작 전 클라이언트에서 호출 */
export const maxDuration = 60;

export async function GET() {
  const result = await warmIrtEngine();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
