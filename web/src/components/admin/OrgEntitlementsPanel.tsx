"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, Briefcase, ClipboardList, Users } from "lucide-react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import {
  ORG_PRODUCTS,
  type OrgEntitlementSnapshot,
  type OrgProductKey,
} from "@/lib/org/entitlements";

const PRODUCT_ICONS: Record<OrgProductKey, typeof Users> = {
  interview: Users,
  competency: ClipboardList,
  diagnostic: Activity,
  assessment: Briefcase,
};

const PRODUCT_ACCENT: Record<OrgProductKey, string> = {
  interview: "accent",
  competency: "gold",
  diagnostic: "accent",
  assessment: "gold",
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
  const [pending, setPending] = useState<OrgProductKey | null>(null);

  function requestToggle(product: OrgProductKey, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setPending(product);
  }

  async function confirmToggle() {
    if (!pending) return;
    const product = pending;
    const next = !entitlements[product];
    const label = ORG_PRODUCTS.find((p) => p.key === product)?.label ?? product;
    setBusy(product);
    try {
      const res = await fetch("/api/admin/organizations/entitlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, product, enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "변경 실패");
        return;
      }
      setEntitlements(json.organization.entitlements);
      if (product === "competency") {
        setCompetencyAt(json.organization.competencyEnabledAt);
      }
      toast.success(`「${label}」을(를) ${next ? "활성화" : "비활성화"}했습니다.`);
      router.refresh();
    } finally {
      setBusy(null);
      setPending(null);
    }
  }

  const pendingLabel = pending
    ? (ORG_PRODUCTS.find((p) => p.key === pending)?.label ?? pending)
    : "";
  const pendingNext = pending ? !entitlements[pending] : false;

  const confirmDialog = (
    <AdminConfirmDialog
      open={pending != null}
      onOpenChange={(open) => {
        if (!open) setPending(null);
      }}
      title={`「${pendingLabel}」 ${pendingNext ? "활성화" : "비활성화"}`}
      description={`${organizationName}의 「${pendingLabel}」을(를) ${
        pendingNext ? "활성화" : "비활성화"
      }할까요?${
        pendingNext ? "" : "\n비활성화하면 기관 관리자에게 해당 메뉴가 즉시 숨겨집니다."
      }`}
      confirmLabel={pendingNext ? "활성화" : "비활성화"}
      confirmTone={pendingNext ? "primary" : "danger"}
      busy={busy != null}
      onConfirm={() => confirmToggle()}
    />
  );

  if (compact) {
    return (
      <>
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
                  onClick={(e) => requestToggle(p.key, e)}
                  className={`relative h-8 w-12 shrink-0 rounded-full transition sm:h-6 sm:w-10 ${
                    on ? "bg-accent" : "bg-card-border"
                  }`}
                  aria-pressed={on}
                  aria-label={`${organizationName} ${p.label} ${on ? "끄기" : "켜기"}`}
                >
                  <span
                    className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition sm:h-5 sm:w-5 ${
                      on ? "left-4 sm:left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {ORG_PRODUCTS.map((p) => {
          const on = entitlements[p.key];
          const Icon = PRODUCT_ICONS[p.key];
          const accent = PRODUCT_ACCENT[p.key];
          const borderOn =
            accent === "gold"
              ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent"
              : "border-accent/40 bg-gradient-to-br from-accent/10 to-transparent";
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
                  onClick={() => requestToggle(p.key)}
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
      {confirmDialog}
    </>
  );
}
