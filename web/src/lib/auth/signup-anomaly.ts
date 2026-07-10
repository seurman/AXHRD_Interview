import { checkRateLimit } from "@/lib/rate-limit";

const WINDOW_MS = 60 * 60 * 1000;

function emailDomain(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : "unknown";
}

/**
 * 짧은 시간 내 동일 IP/이메일 도메인에서 다수 가입 시 REVIEW 플래그.
 * 자동 차단 없음 — /admin/users에서 검토.
 */
export function evaluateSignupAnomaly(ip: string, email: string): "NONE" | "REVIEW" {
  const ipRl = checkRateLimit(`signup:ip:${ip}`, 4, WINDOW_MS);
  const domainRl = checkRateLimit(`signup:domain:${emailDomain(email)}`, 9, WINDOW_MS);
  if (!ipRl.allowed || !domainRl.allowed) {
    return "REVIEW";
  }
  return "NONE";
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
