"use client";

import { useEffect } from "react";

/** 최소 PWA — manifest 연결 + 정적 셸 서비스워커 등록 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 오프라인 미지원 환경 — 무시 */
    });
  }, []);
  return null;
}
