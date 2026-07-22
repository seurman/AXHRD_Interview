"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrgConfirmDialog } from "@/components/org/OrgConfirmDialog";

export function LeaveOrgButton({
  organizationName,
}: {
  organizationName?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const label = organizationName ? `「${organizationName}」` : "기관";

  const leave = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/org/leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "탈퇴 실패");
      setOpen(false);
      toast.success("기관 소속을 해제했습니다.");
      router.push(typeof data.redirect === "string" ? data.redirect : "/org/setup");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "탈퇴 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="text-sm text-danger hover:underline disabled:opacity-50"
      >
        {busy ? "처리 중…" : "기관 탈퇴"}
      </button>
      <OrgConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="기관 탈퇴"
        description={`${label} 소속을 해제할까요? 좌석이 반환됩니다.`}
        confirmLabel="탈퇴"
        confirmTone="danger"
        busy={busy}
        onConfirm={leave}
      />
    </>
  );
}
