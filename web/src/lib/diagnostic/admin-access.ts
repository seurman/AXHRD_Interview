import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";

export async function requireDiagnosticSuperadmin() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user };
}
