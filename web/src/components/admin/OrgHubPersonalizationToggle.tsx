"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = {
  organizationId: string;
  enabled: boolean;
  enabledAt: string | null;
};

export function OrgHubPersonalizationToggle({ organizationId, enabled, enabledAt }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [at, setAt] = useState(enabledAt);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/organizations/saas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, enabled: !on }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "변경 실패");
        return;
      }
      setOn(json.organization.saasPersonalizationEnabled);
      setAt(json.organization.saasPersonalizationEnabledAt);
      toast.success(
        json.organization.saasPersonalizationEnabled
          ? "면접 맞춤 설정을 켰습니다."
          : "면접 맞춤 설정을 껐습니다.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        on ? "border-gold/40 bg-gradient-to-br from-gold/10 to-transparent" : "border-card-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className={`h-5 w-5 ${on ? "text-gold" : "text-muted"}`} />
            <p className="font-semibold text-foreground">면접 맞춤 설정</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            인터뷰 킷·루브릭 개인화. 기관 ADMIN이 자기 기관 설정만 편집할 수 있습니다.
          </p>
          {at && on && (
            <p className="mt-2 text-xs text-gold">
              활성화 · {new Date(at).toLocaleDateString("ko-KR")}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            on ? "bg-gold" : "bg-card-border"
          }`}
          aria-pressed={on}
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
}
