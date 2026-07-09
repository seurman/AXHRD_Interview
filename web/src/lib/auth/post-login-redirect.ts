import type { RoleUser } from "@/lib/auth/roles";
import {
  isPersonalTrialOnlyUser,
  type PersonalAccessContext,
} from "@/lib/auth/personal-access";

function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** FREE 개인 사용자가 로그인 직후 갈 수 있는 경로 */
function isTrialAllowedPath(path: string): boolean {
  if (path === "/") return true;
  return (
    path.startsWith("/demo") ||
    path.startsWith("/pricing") ||
    path.startsWith("/auth") ||
    path.startsWith("/billing/fail")
  );
}

/** 로그인·OAuth 완료 후 안전한 이동 경로 (접근 권한 반영) */
export function resolvePostLoginRedirect(
  user: RoleUser,
  context: PersonalAccessContext,
  requestedNext?: string | null,
): string {
  const next = safeNextPath(requestedNext);

  if (isPersonalTrialOnlyUser(user, context)) {
    if (next && isTrialAllowedPath(next)) return next;
    return "/demo";
  }

  return next ?? "/dashboard";
}
