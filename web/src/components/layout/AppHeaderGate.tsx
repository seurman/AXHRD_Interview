"use client";

import { usePathname } from "next/navigation";

/** /admin 은 전용 콘솔 셸 — 메인 AppHeader 미표시 */
export function AppHeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }
  return <>{children}</>;
}
