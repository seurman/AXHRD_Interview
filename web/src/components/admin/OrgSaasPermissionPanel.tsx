"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Shield } from "lucide-react";

type OrgRow = {
  id: string;
  name: string;
  joinCode: string;
  saasPersonalizationEnabled: boolean;
  saasPersonalizationEnabledAt: string | null;
  kitCount: number;
  memberCount: number;
};

export function OrgSaasPermissionPanel() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations/saas");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기 실패");
        return;
      }
      setOrgs(json.organizations ?? []);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(org: OrgRow) {
    setBusyId(org.id);
    try {
      const res = await fetch("/api/admin/organizations/saas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id, enabled: !org.saasPersonalizationEnabled }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "변경 실패");
        return;
      }
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === org.id
            ? {
                ...o,
                saasPersonalizationEnabled: json.organization.saasPersonalizationEnabled,
                saasPersonalizationEnabledAt: json.organization.saasPersonalizationEnabledAt,
              }
            : o
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="animate-pulse text-sm text-muted">기관 목록 불러오는 중…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-3">
      {orgs.length === 0 ? (
        <p className="text-sm text-muted">승인된 기관이 없습니다.</p>
      ) : (
        orgs.map((org) => (
          <div
            key={org.id}
            className="card-luxe flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{org.name}</p>
              <p className="mt-1 text-xs text-muted">
                코드 <span className="font-mono">{org.joinCode}</span> · 멤버 {org.memberCount} ·
                킷 설정 {org.kitCount}역량
                {org.saasPersonalizationEnabledAt && (
                  <>
                    {" "}
                    · 권한 부여{" "}
                    {new Date(org.saasPersonalizationEnabledAt).toLocaleDateString("ko-KR")}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyId === org.id}
                onClick={() => void toggle(org)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  org.saasPersonalizationEnabled
                    ? "bg-gold/15 text-gold hover:bg-gold/25"
                    : "bg-background text-muted hover:bg-card-border"
                }`}
              >
                <Shield className="mr-1 inline h-4 w-4" />
                {org.saasPersonalizationEnabled ? "개인화 ON" : "개인화 OFF"}
              </button>
              <Link
                href={`/admin/saas/interview-kit?organizationId=${encodeURIComponent(org.id)}`}
                className="btn-secondary flex items-center gap-1 py-2 text-sm"
              >
                <ClipboardList className="h-4 w-4" />
                킷 보기
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
