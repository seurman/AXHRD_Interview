"use client";

import { usePathname } from "next/navigation";

/** 마케팅 홈은 full-bleed, 그 외 제품 화면은 기존 max-width 캔버스 유지 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <>{children}</>;
  }
  return <div className="app-shell">{children}</div>;
}
