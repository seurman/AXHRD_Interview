"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrgReviewActions({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const act = async (action: "approve" | "reject") => {
    if (action === "reject" && !confirm("이 기관 생성 요청을 반려할까요?")) return;
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "처리에 실패했습니다.");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={loading !== null}
        className="btn-primary px-4 py-1.5 text-sm"
      >
        {loading === "approve" ? "승인 중…" : "승인"}
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={loading !== null}
        className="rounded-lg border border-danger/30 px-4 py-1.5 text-sm text-danger hover:bg-danger/10"
      >
        {loading === "reject" ? "반려 중…" : "반려"}
      </button>
    </div>
  );
}
