"use client";

import { useEffect } from "react";

/** /demo#trial — 앱 헤더 높이를 고려해 체험 카드로 스크롤 */
export function ScrollToTrialHash() {
  useEffect(() => {
    if (window.location.hash !== "#trial") return;
    const el = document.getElementById("trial");
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return null;
}
