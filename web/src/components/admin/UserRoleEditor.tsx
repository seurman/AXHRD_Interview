"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL } from "@/lib/auth/roles";

const PLATFORM_OPTIONS = [
  { value: "NONE", label: PLATFORM_ROLE_LABEL.NONE },
  { value: "ADMIN", label: PLATFORM_ROLE_LABEL.ADMIN },
  { value: "CONTENT_ADMIN", label: PLATFORM_ROLE_LABEL.CONTENT_ADMIN },
  { value: "SUPERADMIN", label: PLATFORM_ROLE_LABEL.SUPERADMIN },
] as const;

export function UserRoleEditor({
  userId,
  currentRole,
  currentOrgId,
  currentPlatformRole,
  organizations,
}: {
  userId: string;
  currentRole: string;
  currentOrgId: string | null;
  currentPlatformRole: string;
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [orgId, setOrgId] = useState(currentOrgId ?? "");
  const [platformRole, setPlatformRole] = useState(currentPlatformRole);
  const [saving, setSaving] = useState(false);

  const dirty =
    role !== currentRole ||
    orgId !== (currentOrgId ?? "") ||
    platformRole !== currentPlatformRole;

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
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={orgId}
        onChange={(e) => {
          const next = e.target.value;
          setOrgId(next);
          if (!next) setRole("STUDENT");
        }}
        className="input-luxe px-2 py-1 text-xs"
      >
        <option value="">소속 없음</option>
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={!orgId}
        className="input-luxe px-2 py-1 text-xs disabled:opacity-50"
      >
        {Object.entries(ORG_ROLE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={platformRole}
        onChange={(e) => setPlatformRole(e.target.value)}
        className="input-luxe px-2 py-1 text-xs"
        title="플랫폼 권한 (SUPERADMIN만 부여 가능)"
      >
        {PLATFORM_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary px-3 py-1 text-xs"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      )}
    </div>
  );
}
