import { NextResponse } from "next/server";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";

export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const bank = await loadContentBankSnapshot();
  return NextResponse.json(bank);
}
