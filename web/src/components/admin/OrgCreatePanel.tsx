"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function OrgCreatePanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [maxSeats, setMaxSeats] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [approveNow, setApproveNow] = useState(true);
  const [saasOn, setSaasOn] = useState(false);

  const reset = () => {
    setName("");
    setJoinCode("");
    setMaxSeats("");
    setValidUntil("");
    setAdminNotes("");
    setApproveNow(true);
    setSaasOn(false);
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          joinCode: joinCode.trim() || undefined,
          status: approveNow ? "APPROVED" : "PENDING",
          maxSeats: maxSeats.trim() ? Number(maxSeats) : null,
          validUntil: validUntil || null,
          adminNotes: adminNotes.trim() || null,
          saasPersonalizationEnabled: saasOn,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "생성에 실패했습니다.");
      reset();
      setOpen(false);
      router.refresh();
      if (data.organization?.id) {
        router.push(`/admin/organizations/${data.organization.id}`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        기관 추가
      </button>
    );
  }

  return (
    <div className="card-luxe space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">신규 기관 등록</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          닫기
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-foreground">기관명 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-luxe mt-1 w-full"
            placeholder="예: AX대학교 취업센터"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">가입 코드</span>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="input-luxe mt-1 w-full font-mono"
            placeholder="비우면 자동 생성"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">좌석 상한</span>
          <input
            type="number"
            min={1}
            value={maxSeats}
            onChange={(e) => setMaxSeats(e.target.value)}
            className="input-luxe mt-1 w-full"
            placeholder="비우면 플랜 기본값"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">이용 종료일</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="input-luxe mt-1 w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={approveNow}
            onChange={(e) => setApproveNow(e.target.checked)}
            className="rounded border-card-border"
          />
          즉시 승인
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={saasOn}
            onChange={(e) => setSaasOn(e.target.checked)}
            className="rounded border-card-border"
          />
          맞춤 설정(SaaS) 허용
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-foreground">관리자 메모</span>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            className="input-luxe mt-1 w-full text-sm"
            placeholder="계약 조건, 담당자 연락처 등"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || !name.trim()}
        className="btn-primary text-sm disabled:opacity-50"
      >
        {saving ? "등록 중…" : "기관 생성"}
      </button>
    </div>
  );
}
