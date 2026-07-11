"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL } from "@/lib/auth/roles";
import {
  invalidateApprovedOrgOptionsCache,
  loadApprovedOrgOptions,
  type ApprovedOrgOption,
} from "@/lib/admin/approved-org-options";

const PLATFORM_OPTIONS = [
  { value: "NONE", label: PLATFORM_ROLE_LABEL.NONE },
  { value: "BUSINESS_ADMIN", label: PLATFORM_ROLE_LABEL.BUSINESS_ADMIN },
  { value: "DEMO_ADMIN", label: PLATFORM_ROLE_LABEL.DEMO_ADMIN },
  { value: "CONTENT_ADMIN", label: PLATFORM_ROLE_LABEL.CONTENT_ADMIN },
  { value: "SUPERADMIN", label: PLATFORM_ROLE_LABEL.SUPERADMIN },
] as const;

export function UserRoleEditor({
  userId,
  currentRole,
  currentOrgId,
  currentPlatformRole,
}: {
  userId: string;
  currentRole: string;
  currentOrgId: string | null;
  currentPlatformRole: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<ApprovedOrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [orgId, setOrgId] = useState(currentOrgId ?? "");
  const [platformRole, setPlatformRole] = useState(currentPlatformRole);
  const [saving, setSaving] = useState(false);

  const dirty =
    role !== currentRole ||
    orgId !== (currentOrgId ?? "") ||
    platformRole !== currentPlatformRole;

  const openEditor = async () => {
    setOpen(true);
    if (organizations.length > 0) return;
    setLoadingOrgs(true);
    try {
      setOrganizations(await loadApprovedOrgOptions());
    } catch (e) {
      alert(e instanceof Error ? e.message : "기관 목록을 불러오지 못했습니다.");
      setOpen(false);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgRole: role,
          organizationId: orgId || null,
          platformRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "변경에 실패했습니다.");
      }
      invalidateApprovedOrgOptionsCache();
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void openEditor()}
        className="btn-secondary px-3 py-1.5 text-xs"
      >
        권한 변경
      </button>
    );
  }

  if (loadingOrgs) {
    return <p className="text-xs text-muted">기관 목록 불러오는 중…</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-card-border/80 bg-background/40 p-2">
        <label className="flex min-w-[8rem] flex-1 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          소속 기관
          <select
            value={orgId}
            onChange={(e) => {
              const next = e.target.value;
              setOrgId(next);
              if (!next) setRole("MEMBER");
            }}
            className="input-luxe px-2 py-1.5 text-xs"
          >
            <option value="">없음 (개인)</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[6.5rem] flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          기관 역할
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!orgId}
            className="input-luxe px-2 py-1.5 text-xs disabled:opacity-50"
            title={!orgId ? "기관을 먼저 선택하세요" : undefined}
          >
            {Object.entries(ORG_ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[7rem] flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          플랫폼 (내부)
          <select
            value={platformRole}
            onChange={(e) => setPlatformRole(e.target.value)}
            className="input-luxe px-2 py-1.5 text-xs"
            title="AXHRD 운영·영업 권한"
          >
            {PLATFORM_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary mb-0.5 px-3 py-1.5 text-xs"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-[10px] text-muted hover:text-foreground"
      >
        접기
      </button>
    </div>
  );
}
