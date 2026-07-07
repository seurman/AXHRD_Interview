"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton({ variant = "default" }: { variant?: "default" | "nav" }) {
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
        title="로그아웃"
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
      title="로그아웃"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
