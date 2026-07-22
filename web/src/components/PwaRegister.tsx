"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js?v=5";

/** 최소 PWA — manifest 연결 + 정적 셸 서비스워커 등록 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register(SW_URL);
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch {
        /* 오프라인 미지원 환경 — 무시 */
      }
    })();
  }, []);

  return null;
}
