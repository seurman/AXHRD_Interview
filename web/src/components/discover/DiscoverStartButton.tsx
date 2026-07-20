"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconLoader } from "@/components/ui/icons";

export function DiscoverStartButton({ label }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discover/start", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "시작할 수 없습니다.");
      }
      const data = await res.json();
      router.push(`/discover/${data.sessionId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "세션을 시작할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={loading}
      className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-gold px-8 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:w-auto"
    >
      {loading ? (
        <>
          <IconLoader className="h-5 w-5 animate-spin" />
          준비 중…
        </>
      ) : (
        label ?? "자기발견 인터뷰 시작하기"
      )}
    </button>
  );
}
