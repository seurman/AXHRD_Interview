"use client";

import { useState } from "react";
import { IconLoader } from "@/components/ui/icons";

export function ShareLinkButton({ initialSlug }: { initialSlug: string | null }) {
  const [slug, setSlug] = useState(initialSlug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/certificate-link", { method: "POST" });
      const data = await res.json();
      if (res.ok) setSlug(data.slug);
      else alert(data.error ?? "링크 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!confirm("공유 링크를 비활성화할까요? 기존에 공유한 링크는 더 이상 열리지 않습니다.")) return;
    setLoading(true);
    try {
      await fetch("/api/profile/certificate-link", { method: "DELETE" });
      setSlug(null);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!slug) {
    return (
      <button type="button" onClick={generate} disabled={loading} className="btn-secondary">
        {loading ? <IconLoader className="h-4 w-4" /> : null}
        공유 링크 만들기
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        className="input-luxe min-w-0 flex-1 text-sm text-muted"
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={copy} className="btn-secondary shrink-0">
        {copied ? "복사됨!" : "링크 복사"}
      </button>
      <button
        type="button"
        onClick={revoke}
        disabled={loading}
        className="shrink-0 text-xs text-danger hover:underline"
      >
        공유 중단
      </button>
    </div>
  );
}
