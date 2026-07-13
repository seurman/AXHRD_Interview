"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FlagRow = {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
};

export function FeatureFlagsPanel({ flags: initial }: { flags: FlagRow[] }) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(flag: FlagRow) {
    const next = !flag.enabled;
    if (
      !confirm(
        `「${flag.label}」을(를) ${next ? "활성화" : "비활성화"}할까요?${
          next
            ? ""
            : "\n비활성화하면 지원자 SetupForm에서 해당 옵션이 숨겨지고, API로 직접 요청해도 서버가 무시합니다."
        }`,
      )
    ) {
      return;
    }

    setBusy(flag.key);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const json = (await res.json()) as { error?: string; flag?: FlagRow };
      if (!res.ok) {
        alert(json.error ?? "변경 실패");
        return;
      }
      if (json.flag) {
        setFlags((prev) => prev.map((f) => (f.key === json.flag!.key ? json.flag! : f)));
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {flags.map((flag) => (
        <div
          key={flag.key}
          className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--platform-text)]">{flag.label}</p>
            {flag.description && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--platform-text-muted)]">
                {flag.description}
              </p>
            )}
            <p className="mt-2 font-mono text-xs text-[var(--platform-text-muted)]">{flag.key}</p>
          </div>
          <button
            type="button"
            disabled={busy === flag.key}
            onClick={() => void toggle(flag)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              flag.enabled
                ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                : "bg-zinc-500/15 text-zinc-600 hover:bg-zinc-500/25 dark:text-zinc-300"
            } disabled:opacity-50`}
          >
            {busy === flag.key ? "저장 중…" : flag.enabled ? "활성" : "비활성"}
          </button>
        </div>
      ))}
    </div>
  );
}
