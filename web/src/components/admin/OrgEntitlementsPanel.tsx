"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, ClipboardList, Users } from "lucide-react";
import {
  ORG_PRODUCTS,
  type OrgEntitlementSnapshot,
  type OrgProductKey,
} from "@/lib/org/entitlements";

const PRODUCT_ICONS: Record<OrgProductKey, typeof Users> = {
  interview: Users,
  competency: ClipboardList,
  diagnostic: Activity,
};

const PRODUCT_ACCENT: Record<OrgProductKey, string> = {
  interview: "accent",
  competency: "gold",
  diagnostic: "accent",
};

type Props = {
  organizationId: string;
  organizationName: string;
  entitlements: OrgEntitlementSnapshot;
  competencyEnabledAt?: string | null;
  compact?: boolean;
};

export function OrgEntitlementsPanel({
  organizationId,
  organizationName,
  entitlements: initial,
  competencyEnabledAt,
  compact = false,
}: Props) {
  const router = useRouter();
  const [entitlements, setEntitlements] = useState(initial);
  const [competencyAt, setCompetencyAt] = useState(competencyEnabledAt ?? null);
  const [busy, setBusy] = useState<OrgProductKey | null>(null);

  async function toggle(product: OrgProductKey, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    const next = !entitlements[product];
    setBusy(product);
    try {
      const res = await fetch("/api/admin/organizations/entitlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, product, enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "변경 실패");
        return;
      }
      setEntitlements(json.organization.entitlements);
      if (product === "competency") {
        setCompetencyAt(json.organization.competencyEnabledAt);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (compact) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ORG_PRODUCTS.map((p) => {
          const on = entitlements[p.key];
          return (
            <label key={p.key} className="flex items-center gap-2 text-xs">
              <span className="text-muted">{p.shortLabel}</span>
              <button
                type="button"
                disabled={busy === p.key}
                onClick={(e) => void toggle(p.key, e)}
                className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                  on ? "bg-accent" : "bg-card-border"
                }`}
                aria-pressed={on}
                aria-label={`${organizationName} ${p.label} ${on ? "끄기" : "켜기"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    on ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ORG_PRODUCTS.map((p) => {
        const on = entitlements[p.key];
        const Icon = PRODUCT_ICONS[p.key];
        const accent = PRODUCT_ACCENT[p.key];
        const borderOn =
          accent === "gold" ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-accent/40 bg-gradient-to-br from-accent/10 to-transparent";
        const btnOn = accent === "gold" ? "bg-gold" : "bg-accent";
        const iconOn = accent === "gold" ? "text-gold" : "text-accent";

        return (
          <div
            key={p.key}
            className={`rounded-2xl border p-5 transition ${
              on ? borderOn : "border-card-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 shrink-0 ${on ? iconOn : "text-muted"}`} />
                  <p className="font-semibold text-foreground">{p.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted">{p.description}</p>
                <p className="mt-1 text-xs text-muted">메뉴: {p.tenantMenu}</p>
                {p.key === "competency" && competencyAt && on && (
                  <p className="mt-2 text-xs text-gold">
                    활성화 · {new Date(competencyAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
                {!on && (
                  <p className="mt-2 text-xs text-amber-700">
                    OFF — 기관 ADMIN에게 해당 메뉴가 보이지 않습니다.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={busy === p.key}
                onClick={() => void toggle(p.key)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                  on ? btnOn : "bg-card-border"
                }`}
                aria-pressed={on}
                aria-label={`${organizationName} ${p.label} ${on ? "끄기" : "켜기"}`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    on ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
