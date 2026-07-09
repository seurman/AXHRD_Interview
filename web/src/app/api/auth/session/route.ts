import { NextResponse } from "next/server";
import { applyClearSessionCookie, clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import {
  isPersonalTrialOnlyUser,
  loadPersonalAccessContext,
} from "@/lib/auth/personal-access";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  applyClearSessionCookie(response);
  await clearSessionCookie();
  return response;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const accessContext = await loadPersonalAccessContext(user.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    trialOnly: isPersonalTrialOnlyUser(user, accessContext),
    redirect: resolvePostLoginRedirect(user, accessContext, null),
  });
}
