import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { canViewDiagnosticConsole } from "@/lib/auth/platform-ops";

export async function requireDiagnosticSuperadmin() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user };
}

/** GET·리포트 조회 — 비즈니스 어드민 허용 */
export async function requireDiagnosticConsoleRead() {
  const user = await getCurrentUser();
  if (!user || !canViewDiagnosticConsole(user)) {
    return { error: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user, readOnly: !hasSuperadminAccess(user) };
}
