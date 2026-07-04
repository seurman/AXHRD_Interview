/**
 * 인메모리 레이트리밋 (단일 프로세스 MVP/알파용).
 *
 * 목적: /api/interview/*, /api/resume/parse 등 비용이 발생하거나
 * CPU를 많이 쓰는 엔드포인트를 스크립트 남용으로부터 보호한다.
 *
 * 한계: 프로세스 재시작 시 초기화되고, 다중 인스턴스(수평 확장) 환경에서는
 * 인스턴스별로 카운트가 분리된다. Phase 2(B2B, 다중 인스턴스)에서는
 * Redis(예: Upstash) 기반으로 교체 필요.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// 5분마다 만료된 버킷 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
// Node 프로세스 종료를 막지 않도록
cleanupTimer.unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * @param key 식별자 (userId 또는 IP + 라우트명 조합 권장)
 * @param limit 허용 최대 요청 수
 * @param windowMs 윈도우 길이(ms)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterSec: 0,
  };
}

/** 인증되지 않은 라우트에서 사용할 IP 추출 (프록시/로컬 환경 대응) */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponseInit(result: RateLimitResult) {
  return {
    status: 429 as const,
    body: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
    headers: { "Retry-After": String(result.retryAfterSec) },
  };
}
