import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";
import {
  DEMO_PRESENTER_COOKIE,
  verifyDemoPresenterToken,
} from "@/lib/demo/presenter";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/c/")) return true;
  if (pathname === "/pricing") return true;
  if (pathname.startsWith("/billing/fail")) return true;
  if (pathname.startsWith("/demo")) return true;
  if (pathname.startsWith("/api/demo")) return true;
  return false;
}

function requiresAuth(pathname: string) {
  if (isPublicPath(pathname)) return false;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/interview")) return true;
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
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/billing/success")) return true;
  if (pathname.startsWith("/api/billing/prepare")) return true;
  if (pathname.startsWith("/api/billing/confirm")) return true;
  if (pathname.startsWith("/api/billing/cancel")) return true;
  if (pathname.startsWith("/api/billing/status")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;

  if (!userId && pathname.startsWith("/interview/")) {
    const sessionId = pathname.split("/")[2];
    const demoToken = request.cookies.get(DEMO_PRESENTER_COOKIE)?.value;
    if (
      sessionId &&
      demoToken &&
      (await verifyDemoPresenterToken(demoToken, sessionId))
    ) {
      return NextResponse.next();
    }
  }

  if (!userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/interview/:path*",
    "/api/interview/:path*",
    "/api/candidates/:path*",
    "/api/profile/:path*",
    "/api/companies/:path*",
    "/api/resume/:path*",
    "/api/org/:path*",
    "/org/:path*",
    "/api/admin/:path*",
    "/admin/:path*",
    "/billing/success",
    "/api/billing/prepare",
    "/api/billing/confirm",
    "/api/billing/cancel",
    "/api/billing/status",
  ],
};
