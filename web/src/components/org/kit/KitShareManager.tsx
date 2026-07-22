"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { competencyLabel } from "@/lib/labels";
import { OrgConfirmDialog } from "@/components/org/OrgConfirmDialog";

type ShareDto = {
  id: string;
  slug: string;
  label: string;
  competencies: string[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  organizationId?: string;
};

function kitApiBase(path: string, organizationId?: string) {
  if (!organizationId) return path;
  return `${path}?organizationId=${encodeURIComponent(organizationId)}`;
}

function publicKitUrl(slug: string): string {
  if (typeof window === "undefined") return `/kit/${slug}`;
  return `${window.location.origin}/kit/${slug}`;
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicKitUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 없으면 조용히 무시
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
      title={publicKitUrl(slug)}
    >
      <Link2 className="h-3.5 w-3.5" />
      {copied ? "복사됨 ✓" : "링크 복사"}
    </button>
  );
}

export function KitShareManager({ organizationId }: Props) {
  const [competencyCodes, setCompetencyCodes] = useState<string[]>([]);
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCompetencies, setNewCompetencies] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ShareDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const kitBase = kitApiBase("/api/org/interview-kit", organizationId);
  const shareBase = kitApiBase("/api/org/interview-kit/share", organizationId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kitRes, shareRes] = await Promise.all([fetch(kitBase), fetch(shareBase)]);
      const kitJson = await kitRes.json();
      const shareJson = await shareRes.json();
      if (!kitRes.ok) {
        setError(kitJson.error ?? "불러오기에 실패했습니다.");
        return;
      }
      if (!shareRes.ok) {
        setError(shareJson.error ?? "불러오기에 실패했습니다.");
        return;
      }
      const configured: string[] = (kitJson.kits ?? [])
        .filter((k: { selectedQuestionIds: string[] }) => k.selectedQuestionIds.length > 0)
        .map((k: { competency: string }) => k.competency);
      setCompetencyCodes(configured.length > 0 ? configured : (kitJson.competencyCodes ?? []));
      setShares(shareJson.shares ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [kitBase, shareBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleNewCompetency = (code: string) => {
    setNewCompetencies((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const createShare = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(shareBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          competencies: [...newCompetencies],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "생성 실패");
        return;
      }
      setShares((prev) => [json.share as ShareDto, ...prev]);
      setNewLabel("");
      setNewCompetencies(new Set());
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (share: ShareDto) => {
    const url = kitApiBase(`/api/org/interview-kit/share/${share.id}`, organizationId);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !share.isActive }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "변경 실패");
      return;
    }
    setShares((prev) => prev.map((s) => (s.id === share.id ? (json.share as ShareDto) : s)));
  };

  const deleteShare = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const url = kitApiBase(`/api/org/interview-kit/share/${deleteTarget.id}`, organizationId);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = (json as { error?: string }).error ?? "삭제 실패";
        setError(msg);
        toast.error(msg);
        return;
      }
      setShares((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("공유 링크를 삭제했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const availableCodes = useMemo(() => competencyCodes, [competencyCodes]);

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-card-border">
        <p className="animate-pulse text-sm text-muted">공유 링크 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="card-luxe space-y-5 p-6">
      <div>
        <h2 className="font-semibold text-foreground">공유 링크로 배포</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          캠페인 이름과 포함할 역량을 정하면 전용 링크가 생성됩니다. 이 링크를
          받은 사람은 기관 가입 코드 없이(로그인만 하면) 이 킷 설정으로 면접을 시작할 수
          있습니다. 킷 내용을 이후에 수정해도 이미 발급된 링크에 그대로 반영됩니다.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="space-y-3 rounded-xl border border-dashed border-card-border p-4">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="캠페인 이름 (예: 2026 상반기 신입 공채)"
          className="input-luxe w-full text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {availableCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleNewCompetency(code)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                newCompetencies.has(code)
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-card-border text-muted hover:border-gold/40"
              }`}
            >
              {competencyLabel(code)}
            </button>
          ))}
          {availableCodes.length === 0 && (
            <p className="text-xs text-muted">먼저 위에서 역량을 하나 이상 구성해 주세요.</p>
          )}
        </div>
        <p className="text-[11px] text-muted">
          역량을 하나도 선택하지 않으면 킷에 구성된 전체 역량이 포함됩니다.
        </p>
        <button
          type="button"
          onClick={() => void createShare()}
          disabled={creating || !newLabel.trim()}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" /> {creating ? "생성 중…" : "공유 링크 생성"}
        </button>
      </div>

      <div className="space-y-2">
        {shares.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">아직 발급된 공유 링크가 없습니다.</p>
        ) : (
          shares.map((share) => (
            <div
              key={share.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                share.isActive ? "border-card-border" : "border-card-border/50 opacity-60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{share.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {share.competencies.length === 0
                    ? "전체 역량"
                    : share.competencies.map((c) => competencyLabel(c)).join(" · ")}
                  {!share.isActive && " · 비활성"}
                </p>
              </div>
              <CopyLinkButton slug={share.slug} />
              <button
                type="button"
                onClick={() => void toggleActive(share)}
                className="flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
              >
                <Power className="h-3.5 w-3.5" />
                {share.isActive ? "비활성화" : "활성화"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(share)}
                className="flex items-center gap-1 rounded-lg border border-card-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-red-300 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> 삭제
              </button>
            </div>
          ))
        )}
      </div>

      <OrgConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title="공유 링크 삭제"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" 공유 링크를 삭제할까요? 이미 시작된 세션 기록은 유지됩니다.`
            : undefined
        }
        confirmLabel="삭제"
        confirmTone="danger"
        busy={deleting}
        onConfirm={deleteShare}
      />
    </div>
  );
}
