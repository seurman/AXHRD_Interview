"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, GraduationCap, Plus } from "lucide-react";
import type { OrgKind, PlanTier } from "@prisma/client";
import { ORG_KIND_CONFIG, ORG_KINDS } from "@/lib/org/kinds";
import { ORG_KIND_PRODUCT_DEFAULTS, ORG_PRODUCTS, type OrgEntitlementSnapshot } from "@/lib/org/entitlements";
import { ORG_PLAN_TIERS, planLabel } from "@/lib/billing/plans";

const KIND_ICONS: Record<OrgKind, typeof GraduationCap> = {
  CAREER_CENTER: GraduationCap,
  HR_ENTERPRISE: Building2,
};

export function OrgCreatePanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrgKind>("CAREER_CENTER");
  const [joinCode, setJoinCode] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxSeats, setMaxSeats] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier | "">("");
  const [subscriptionMonths, setSubscriptionMonths] = useState("12");
  const [adminUserEmail, setAdminUserEmail] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [approveNow, setApproveNow] = useState(true);
  const [entitlements, setEntitlements] = useState<OrgEntitlementSnapshot>(
    ORG_KIND_PRODUCT_DEFAULTS.CAREER_CENTER,
  );

  const preset = ORG_KIND_CONFIG[kind];

  useEffect(() => {
    const cfg = ORG_KIND_CONFIG[kind];
    setEntitlements(ORG_KIND_PRODUCT_DEFAULTS[kind]);
    setPlanTier(cfg.defaultPlan);
  }, [kind]);

  const reset = () => {
    setName("");
    setKind("CAREER_CENTER");
    setJoinCode("");
    setValidFrom("");
    setValidUntil("");
    setMaxSeats("");
    setPlanTier(ORG_KIND_CONFIG.CAREER_CENTER.defaultPlan);
    setSubscriptionMonths("12");
    setAdminUserEmail("");
    setAdminNotes("");
    setApproveNow(true);
    setEntitlements(ORG_KIND_PRODUCT_DEFAULTS.CAREER_CENTER);
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
          kind,
          joinCode: joinCode.trim() || undefined,
          status: approveNow ? "APPROVED" : "PENDING",
          validFrom: validFrom || undefined,
          validUntil: validUntil || null,
          maxSeats: maxSeats.trim() ? Number(maxSeats) : null,
          planTier: approveNow ? planTier || preset.defaultPlan : null,
          subscriptionMonths: Number(subscriptionMonths) || 12,
          adminUserEmail: adminUserEmail.trim() || undefined,
          adminNotes: adminNotes.trim() || null,
          interviewEnabled: entitlements.interview,
          saasPersonalizationEnabled: entitlements.competency,
          diagnosticEnabled: entitlements.diagnostic,
          assessmentEnabled: entitlements.assessment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "생성에 실패했습니다.");

      let message = "기관이 생성되었습니다.";
      if (data.subscription?.planTier) {
        message += ` 플랜: ${planLabel(data.subscription.planTier)}`;
      }
      if (adminUserEmail.trim() && !data.adminAssigned) {
        message += "\n(관리자 이메일을 찾지 못했거나 이미 다른 기관에 소속되어 있습니다.)";
      }

      reset();
      setOpen(false);
      router.refresh();
      toast.success(message);
      if (data.organization?.id) {
        router.push(`/admin/organizations/${data.organization.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "생성에 실패했습니다.");
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
    <div className="platform-panel platform-panel--elevated space-y-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">신규 기관 등록</h2>
          <p className="mt-1 text-sm text-muted">
            유형·이용 기간·상품·권한을 한 번에 설정합니다.
          </p>
        </div>
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

      {/* 1. 기관 유형 */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">기관 유형</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ORG_KINDS.map((k) => {
            const cfg = ORG_KIND_CONFIG[k];
            const Icon = KIND_ICONS[k];
            const selected = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-gold/50 bg-gold/5 ring-1 ring-gold/30"
                    : "border-card-border hover:border-gold/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${selected ? "text-gold" : "text-muted"}`} />
                  <span className="font-medium text-foreground">{cfg.label}</span>
                </div>
                <p className="mt-2 text-xs text-muted">{cfg.description}</p>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {cfg.features.map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] text-muted"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 2. 기본 정보 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-foreground">기관명 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-luxe mt-1 w-full"
            placeholder={
              kind === "HR_ENTERPRISE" ? "예: AX테크 채용팀" : "예: AX대학교 취업센터"
            }
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
            placeholder={`비우면 플랜 기본값 (${preset.memberLabel}·담당자 포함)`}
          />
        </label>
      </div>

      {/* 3. 이용 기간 */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">이용 기간</legend>
        <p className="text-xs text-muted">
          시작일을 비우면 즉시 승인 시 오늘부터, 종료일만 지정해도 됩니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-foreground">이용 시작일</span>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="input-luxe mt-1 w-full"
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
        </div>
      </fieldset>

      {/* 4. 상품·권한 */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">제품 Entitlement</legend>
        <p className="text-xs text-muted">
          기관 1개에 면접·역량평가·조직진단을 독립적으로 켭니다. 유형 변경 시 아래 기본값이 적용됩니다.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {ORG_PRODUCTS.map((p) => (
            <label
              key={p.key}
              className="flex items-start gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={entitlements[p.key]}
                onChange={(e) =>
                  setEntitlements((prev) => ({ ...prev, [p.key]: e.target.checked }))
                }
                className="mt-0.5 rounded border-card-border"
              />
              <span>
                <span className="font-medium text-foreground">{p.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{p.shortLabel} SKU</span>
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-foreground">구독 플랜</span>
            <select
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value as PlanTier)}
              className="input-luxe mt-1 w-full"
              disabled={!approveNow}
            >
              {ORG_PLAN_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {planLabel(tier)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-foreground">구독 기간 (개월)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={subscriptionMonths}
              onChange={(e) => setSubscriptionMonths(e.target.value)}
              className="input-luxe mt-1 w-full"
              disabled={!approveNow}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={approveNow}
              onChange={(e) => setApproveNow(e.target.checked)}
              className="rounded border-card-border"
            />
            즉시 승인 (플랜·구독 동시 활성화)
          </label>
        </div>
      </fieldset>

      {/* 5. 관리자 지정 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-foreground">기관 관리자 이메일</span>
          <input
            type="email"
            value={adminUserEmail}
            onChange={(e) => setAdminUserEmail(e.target.value)}
            className="input-luxe mt-1 w-full"
            placeholder="가입된 계정 이메일 (선택)"
          />
          <span className="mt-1 block text-xs text-muted">
            해당 사용자를 기관 ADMIN으로 연결합니다. 아직 가입하지 않았다면 나중에 가입 코드로
            연결할 수 있습니다.
          </span>
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
