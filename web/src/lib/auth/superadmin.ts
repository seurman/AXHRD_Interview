/** SUPERADMIN_EMAILS 환경변수 기반 부트스트랩 (guards·roles 순환 참조 방지) */

function superadminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadmin(email: string) {
  return superadminEmails().includes(email.toLowerCase());
}

export function hasSuperadminAccess(user: { email: string; platformRole?: string }) {
  return isSuperadmin(user.email) || user.platformRole === "SUPERADMIN";
}
