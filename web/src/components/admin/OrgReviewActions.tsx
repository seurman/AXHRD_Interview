"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

export function OrgReviewActions({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const act = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "처리에 실패했습니다.");
      }
      setRejectOpen(false);
      toast.success(action === "approve" ? "기관을 승인했습니다." : "요청을 반려했습니다.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => void act("approve")}
        disabled={loading !== null}
        className="btn-primary px-4 py-1.5 text-sm"
      >
        {loading === "approve" ? "승인 중…" : "승인"}
      </button>
      <button
        type="button"
        onClick={() => setRejectOpen(true)}
        disabled={loading !== null}
        className="rounded-lg border border-danger/30 px-4 py-1.5 text-sm text-danger hover:bg-danger/10"
      >
        {loading === "reject" ? "반려 중…" : "반려"}
      </button>
      <AdminConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="기관 생성 반려"
        description="이 기관 생성 요청을 반려할까요?"
        confirmLabel="반려"
        confirmTone="danger"
        busy={loading === "reject"}
        onConfirm={() => act("reject")}
      />
    </div>
  );
}
