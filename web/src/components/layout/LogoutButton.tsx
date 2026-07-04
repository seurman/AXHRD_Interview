"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

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
