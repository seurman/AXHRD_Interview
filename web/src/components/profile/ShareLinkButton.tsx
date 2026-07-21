"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconLoader } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";

export function ShareLinkButton({ initialSlug }: { initialSlug: string | null }) {
  const [slug, setSlug] = useState(initialSlug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const url = slug && typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : "";

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/certificate-link", { method: "POST" });
      const data = await res.json();
      if (res.ok) setSlug(data.slug);
      else toast.error(data.error ?? "링크 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    setLoading(true);
    try {
      await fetch("/api/profile/certificate-link", { method: "DELETE" });
      setSlug(null);
      setRevokeOpen(false);
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
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        readOnly
        value={url}
        className="input-luxe min-w-0 w-full flex-1 text-sm text-muted"
        onFocus={(e) => e.target.select()}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="btn-secondary min-h-11 flex-1 shrink-0 sm:flex-none"
        >
          {copied ? "복사됨!" : "링크 복사"}
        </button>
        <button
          type="button"
          onClick={() => setRevokeOpen(true)}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center px-3 text-sm text-danger hover:underline touch-manipulation"
        >
          공유 중단
        </button>
      </div>
      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="공유 링크 비활성화"
        description="공유 링크를 비활성화할까요? 기존에 공유한 링크는 더 이상 열리지 않습니다."
        confirmLabel="공유 중단"
        confirmTone="danger"
        busy={loading}
        onConfirm={revoke}
      />
    </div>
  );
}
