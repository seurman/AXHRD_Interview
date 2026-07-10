"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { clearNavSessionCache } from "@/components/layout/NavSessionProvider";

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
}: {
  variant?: "default" | "nav" | "drawer";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const text = label ?? "Sign out";

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await performLogout();
      clearNavSessionCache();
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
        className="relative z-10 flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl border border-card-border px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/5 active:bg-danger/10 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
            {text}…
          </>
        ) : (
          text
        )}
      </button>
    );
  }

  if (variant === "nav") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleLogout()}
        className="nav-pill text-muted hover:text-foreground disabled:opacity-60"
        title={text}
        aria-label={text}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
        ) : (
          text
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleLogout()}
      className="flex min-h-[44px] touch-manipulation items-center gap-1 text-muted hover:text-danger disabled:opacity-60"
      title={text}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
      ) : (
        <span className="text-sm">{text}</span>
      )}
    </button>
  );
}
