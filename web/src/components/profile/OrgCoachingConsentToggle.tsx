"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  organizationName: string;
  enabled: boolean;
};

export function OrgCoachingConsentToggle({ organizationName, enabled }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    try {
      const res = await fetch("/api/profile/org-coaching-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "변경에 실패했습니다.");
        return;
      }
      setOn(json.orgCoachingConsent);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-luxe p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">기관 코칭 리포트 공유</h2>
          <p className="mt-2 text-sm text-muted">
            {organizationName}이 내 상세 역량 리포트를 볼 수 있도록 허용
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            기관 담당자는 참여 평균 통계는 항상 볼 수 있어요. 이 토글을 켜면 담당자가 내
            개인 리포트(역량별 점수, 답변 피드백)까지 볼 수 있어요. 언제든 끌 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
            on ? "bg-accent" : "bg-card-border"
          }`}
          aria-pressed={on}
          aria-label={`${organizationName} 상세 리포트 공유 ${on ? "끄기" : "켜기"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              on ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
