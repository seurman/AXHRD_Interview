import type { RoleUser } from "@/lib/auth/roles";
import type { PersonalAccessContext } from "@/lib/auth/personal-access";

function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** 로그인·OAuth 완료 후 안전한 이동 경로 */
export function resolvePostLoginRedirect(
  user: RoleUser,
  _context: PersonalAccessContext,
  requestedNext?: string | null,
): string {
  const next = safeNextPath(requestedNext);
  if (next) return next;
  // 소속 없으면 기관 선택·승인 요청으로 안내 (인별 좌석 과금 전제)
  if (!user.organizationId) return "/org/setup";
  return "/dashboard";
}
