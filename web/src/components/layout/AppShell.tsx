"use client";

import { usePathname } from "next/navigation";

/** 마케팅 홈·관리자 콘솔은 full-bleed, 그 외 제품 화면은 max-width 캔버스 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <>{children}</>;
  }
  return <div className="app-shell">{children}</div>;
}
