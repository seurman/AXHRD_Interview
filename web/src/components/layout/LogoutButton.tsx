"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({
  variant = "default",
  label,
}: {
  variant?: "default" | "nav";
  label?: string;
}) {
  const router = useRouter();

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/session", { method: "POST" });
          router.push("/");
          router.refresh();
        }}
        className="nav-pill text-white/60 hover:border-white/30 hover:text-white"
        title={label ?? "Sign out"}
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/session", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="flex items-center gap-1 text-muted hover:text-danger"
      title={label ?? "Sign out"}
    >
      <LogOut className="h-4 w-4" />
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
