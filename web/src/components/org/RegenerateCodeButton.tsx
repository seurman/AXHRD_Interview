"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrgConfirmDialog } from "@/components/org/OrgConfirmDialog";

export function RegenerateCodeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/regenerate-code", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "재발급에 실패했습니다.",
        );
      }
      setOpen(false);
      toast.success("가입 코드를 재발급했습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "재발급에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="text-xs text-muted hover:text-danger hover:underline"
      >
        {loading ? "재발급 중…" : "코드 재발급"}
      </button>
      <OrgConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="가입 코드 재발급"
        description="가입 코드를 재발급하면 기존 코드는 더 이상 사용할 수 없습니다. 계속할까요?"
        confirmLabel="재발급"
        confirmTone="danger"
        busy={loading}
        onConfirm={regenerate}
      />
    </>
  );
}
