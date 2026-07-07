"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSubscriptionEditor({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [planTier, setPlanTier] = useState<"ORG_ENTERPRISE" | "ORG_STANDARD">("ORG_ENTERPRISE");
  const [months, setMonths] = useState(12);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          planTier,
          status: "ACTIVE",
          months,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      router.refresh();
      alert("기관 구독이 등록되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className="input-luxe min-w-[12rem] px-2 py-1 text-xs"
      >
        <option value="">기관 선택</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <select
        value={planTier}
        onChange={(e) => setPlanTier(e.target.value as typeof planTier)}
        className="input-luxe px-2 py-1 text-xs"
      >
        <option value="ORG_ENTERPRISE">ORG Enterprise</option>
        <option value="ORG_STANDARD">ORG Standard (수동)</option>
      </select>
      <input
        type="number"
        min={1}
        max={36}
        value={months}
        onChange={(e) => setMonths(Number(e.target.value))}
        className="input-luxe w-20 px-2 py-1 text-xs"
        title="계약 개월"
      />
      <button
        type="button"
        onClick={save}
        disabled={!orgId || saving}
        className="btn-primary px-3 py-1 text-xs disabled:opacity-50"
      >
        {saving ? "저장 중…" : "수동 구독 등록"}
      </button>
    </div>
  );
}
