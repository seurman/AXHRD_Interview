/** Edge-safe path helpers for middleware (Prisma-free) */

export function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/c/")) return true;
  if (pathname === "/pricing") return true;
  if (pathname.startsWith("/billing/fail")) return true;
  if (pathname.startsWith("/demo")) return true;
  if (pathname.startsWith("/api/demo")) return true;
  if (pathname.startsWith("/api/trial")) return true;
  return false;
}

export function requiresAuth(pathname: string) {
  if (isPublicPath(pathname)) return false;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/practice")) return true;
  if (pathname.startsWith("/discover")) return true;
  if (pathname.startsWith("/resume-review")) return true;
  if (pathname.startsWith("/interview")) return true;
  if (pathname.startsWith("/api/learning")) return true;
  if (pathname.startsWith("/api/questions")) return true;
  if (pathname.startsWith("/api/interview")) {
    if (pathname === "/api/interview/respond" || pathname === "/api/interview/tts") {
      return false;
    }
    return true;
  }
  if (pathname.startsWith("/api/candidates")) return true;
  if (pathname.startsWith("/api/profile")) return true;
  if (pathname.startsWith("/api/companies")) return true;
  if (pathname.startsWith("/api/resume")) return true;
  if (pathname.startsWith("/api/org")) return true;
  if (pathname.startsWith("/org")) return true;
  if (pathname.startsWith("/assessment")) return true;
  if (pathname.startsWith("/api/assessment")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/billing/success")) return true;
  if (pathname.startsWith("/api/billing/prepare")) return true;
  if (pathname.startsWith("/api/billing/confirm")) return true;
  if (pathname.startsWith("/api/billing/cancel")) return true;
  if (pathname.startsWith("/api/billing/status")) return true;
  return false;
}
