/** 프로덕션 서브도메인 간 세션 공유 — localhost에서는 domain 미설정 */
export function getSharedCookieDomain(): string | undefined {
  return process.env.NODE_ENV === "production" ? ".axhrd.com" : undefined;
}

export function sharedCookieBaseOptions() {
  const domain = getSharedCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}
