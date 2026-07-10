"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

async function performLogout(): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("logout failed");
  }
}

export function LogoutButton({
  variant = "default",
  label,
  onStart,
}: {
  variant?: "default" | "nav" | "drawer";
  label?: string;
  onStart?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    onStart?.();
    try {
      await performLogout();
      // 하드 네비게이션 — 모바일·PWA에서 클라이언트 nav/세션 캐시를 확실히 비운다.
      window.location.assign("/");
    } catch {
      setBusy(false);
    }
  }

  if (variant === "drawer") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleLogout()}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-3 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        <span>{busy ? (label ? `${label}…` : "…") : (label ?? "Sign out")}</span>
      </button>
    );
  }

  if (variant === "nav") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleLogout()}
        className="nav-pill text-white/60 hover:border-white/30 hover:text-white disabled:opacity-60"
        title={label ?? "Sign out"}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleLogout()}
      className="flex min-h-[44px] items-center gap-1 text-muted hover:text-danger disabled:opacity-60"
      title={label ?? "Sign out"}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
