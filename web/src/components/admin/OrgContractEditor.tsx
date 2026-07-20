"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OrgKind, OrgStatus } from "@prisma/client";
import { ORG_KIND_CONFIG, ORG_KINDS } from "@/lib/org/kinds";
import { OrgDiagnosticPricingEditor } from "@/components/admin/OrgDiagnosticPricingEditor";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultOrgDiagnosticPricing,
  parseOrgDiagnosticPricing,
  type OrgDiagnosticPricing,
} from "@/lib/diagnostic/pricing";

type Props = {
  organizationId: string;
  initial: {
    name: string;
    kind: OrgKind;
    joinCode: string;
    status: OrgStatus;
    validFrom: string | null;
    validUntil: string | null;
    maxSeats: number | null;
    adminNotes: string | null;
    memberCount: number;
    seatCap: number | null;
    diagnosticPricing?: unknown;
    requireMembershipApproval?: boolean;
  };
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function OrgContractEditor({ organizationId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState<OrgKind>(initial.kind);
  const [joinCode, setJoinCode] = useState(initial.joinCode);
  const [status, setStatus] = useState<OrgStatus>(initial.status);
  const [validFrom, setValidFrom] = useState(toDateInput(initial.validFrom));
  const [validUntil, setValidUntil] = useState(toDateInput(initial.validUntil));
  const [maxSeats, setMaxSeats] = useState(
    initial.maxSeats != null ? String(initial.maxSeats) : "",
  );
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes ?? "");
  const [diagnosticPricing, setDiagnosticPricing] = useState<OrgDiagnosticPricing>(
    () => parseOrgDiagnosticPricing(initial.diagnosticPricing) ?? defaultOrgDiagnosticPricing(),
  );
  const [requireMembershipApproval, setRequireMembershipApproval] = useState(
    initial.requireMembershipApproval ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<"regen" | "delete" | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          joinCode: joinCode.trim().toUpperCase(),
          status,
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          maxSeats: maxSeats.trim() ? Number(maxSeats) : null,
          adminNotes: adminNotes.trim() || null,
          diagnosticPricing,
          requireMembershipApproval,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      router.refresh();
      toast.success("저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateJoinCode: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "재발급에 실패했습니다.");
      setJoinCode(data.organization.joinCode);
      router.refresh();
      toast.success("가입 코드가 재발급되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "재발급에 실패했습니다.");
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setPending(null);
      router.push("/admin/organizations");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
      setPending(null);
    }
  };

  const deleteDescription =
    initial.memberCount > 0
      ? `소속 멤버 ${initial.memberCount}명이 있습니다. 기관을 삭제하면 모두 소속이 해제됩니다. 계속할까요?`
      : "이 기관을 삭제할까요? 되돌릴 수 없습니다.";

  return (
    <section className="platform-panel platform-panel--elevated space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">계약 · 좌석 · 가입 코드</h2>
          <p className="mt-1 text-sm text-muted">
            이용 인원{" "}
            <strong className="text-foreground">
              {initial.memberCount}
              {initial.seatCap != null ? ` / ${initial.seatCap}` : ""}
            </strong>
            {initial.seatCap != null && initial.memberCount >= initial.seatCap && (
              <span className="ml-2 text-danger">상한 도달</span>
            )}
          </p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as OrgStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">승인 대기</SelectItem>
            <SelectItem value="APPROVED">운영 중</SelectItem>
            <SelectItem value="REJECTED">중지/반려</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">기관명</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-luxe mt-1 w-full"
          />
        </label>
        <div className="block text-sm sm:col-span-2">
          <span className="font-medium">기관 유형</span>
          <Select value={kind} onValueChange={(v) => setKind(v as OrgKind)}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {ORG_KIND_CONFIG[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="mt-1 block text-xs text-muted">{ORG_KIND_CONFIG[kind].description}</span>
        </div>
        <label className="block text-sm">
          <span className="font-medium">가입 코드</span>
          <div className="mt-1 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-luxe w-full font-mono"
            />
            <button
              type="button"
              onClick={() => setPending("regen")}
              disabled={saving}
              className="btn-secondary shrink-0 px-3 text-xs"
            >
              재발급
            </button>
          </div>
        </label>
        <label className="block text-sm">
          <span className="font-medium">좌석 상한</span>
          <input
            type="number"
            min={1}
            value={maxSeats}
            onChange={(e) => setMaxSeats(e.target.value)}
            className="input-luxe mt-1 w-full"
            placeholder="무제한"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">이용 시작일</span>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="input-luxe mt-1 w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">이용 종료일</span>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="input-luxe mt-1 w-full"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">관리자 메모</span>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className="input-luxe mt-1 w-full text-sm"
          />
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <Checkbox
            className="mt-1"
            checked={requireMembershipApproval}
            onCheckedChange={(checked) => setRequireMembershipApproval(checked === true)}
          />
          <span>
            <span className="font-medium">가입 시 담당자 승인 필요</span>
            <span className="mt-0.5 block text-xs text-muted">
              켜 두면 개인이 기관 선택·코드 입력 후 담당자 승인 전까지 좌석에 집계되지 않습니다.
            </span>
          </span>
        </label>
      </div>

      <OrgDiagnosticPricingEditor value={diagnosticPricing} onChange={setDiagnosticPricing} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || deleting}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {saving ? "저장 중…" : "변경 저장"}
        </button>
        <button
          type="button"
          onClick={() => setPending("delete")}
          disabled={saving || deleting}
          className="rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          {deleting ? "삭제 중…" : "기관 삭제"}
        </button>
      </div>

      <AdminConfirmDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === "delete" ? "기관 삭제" : "가입 코드 재발급"}
        description={
          pending === "delete"
            ? deleteDescription
            : "가입 코드를 새로 발급할까요? 기존 코드로는 가입할 수 없습니다."
        }
        confirmLabel={pending === "delete" ? "삭제" : "재발급"}
        confirmTone={pending === "delete" ? "danger" : "primary"}
        busy={saving || deleting}
        onConfirm={() => {
          if (pending === "regen") return regenerateCode();
          if (pending === "delete") return remove();
        }}
      />
    </section>
  );
}
