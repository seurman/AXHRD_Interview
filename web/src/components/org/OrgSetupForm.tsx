"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ORG_KIND_CONFIG } from "@/lib/org/kinds";
import type { OrgKind } from "@prisma/client";

type Mode = "join" | "create";

type DirectoryOrg = {
  id: string;
  name: string;
  kind: OrgKind;
  memberCount: number;
  requireMembershipApproval: boolean;
};

type Pending = {
  id: string;
  organization: { id: string; name: string; kind: OrgKind };
  createdAt: string;
  message: string | null;
};

export function OrgSetupForm({ initialPending }: { initialPending?: Pending | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("join");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [orgName, setOrgName] = useState("");
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState<DirectoryOrg[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(initialPending ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery =
      searchParams.get("joinCode")?.trim().toUpperCase() ||
      searchParams.get("code")?.trim().toUpperCase() ||
      "";
    if (fromQuery) {
      setJoinCode(fromQuery);
      setSelectedOrgId(null);
      setMode("join");
    }
  }, [searchParams]);

  const loadDirectory = useCallback(async (q: string) => {
    const res = await fetch(`/api/org/directory?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (res.ok) setDirectory(data.organizations ?? []);
  }, []);

  useEffect(() => {
    if (mode !== "join" || pending) return;
    const t = window.setTimeout(() => void loadDirectory(query), 200);
    return () => window.clearTimeout(t);
  }, [mode, query, pending, loadDirectory]);

  const cancelPending = async () => {
    if (!pending) return;
    if (!confirm("가입 요청을 취소할까요?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/membership-requests/${pending.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "취소 실패");
      setPending(null);
      setInfo("요청을 취소했습니다. 다른 기관을 선택할 수 있습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "취소 중 오류");
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const body = selectedOrgId
        ? { organizationId: selectedOrgId, message: message.trim() || undefined }
        : { joinCode: joinCode.trim(), message: message.trim() || undefined };
      if (!selectedOrgId && !joinCode.trim()) {
        setError("기관을 선택하거나 가입 코드를 입력해 주세요.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/org/membership-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
      if (data.mode === "joined") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setInfo(data.message ?? "승인 대기 중입니다.");
      setPending({
        id: data.requestId,
        organization: {
          id: selectedOrgId ?? "",
          name: data.organizationName,
          kind: "CAREER_CENTER",
        },
        createdAt: new Date().toISOString(),
        message: message.trim() || null,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!orgName.trim()) {
        setError("기관명을 입력해 주세요.");
        return;
      }
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "기관 생성에 실패했습니다.");
      router.push("/org/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <div className="card-luxe space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          승인 대기
        </p>
        <h2 className="text-lg font-bold text-foreground">{pending.organization.name}</h2>
        <p className="text-sm text-muted">
          기관 담당자가 승인하면 좌석이 배정되고 기관 기능을 이용할 수 있습니다. 거절되면 다시
          신청할 수 있습니다.
        </p>
        {pending.message ? (
          <p className="rounded-lg bg-background/60 px-3 py-2 text-xs text-muted">
            내 메시지: {pending.message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-secondary w-full py-3"
          disabled={loading}
          onClick={() => void cancelPending()}
        >
          {loading ? "처리 중…" : "요청 취소"}
        </button>
      </div>
    );
  }

  return (
    <div className="card-luxe space-y-5 p-6">
      <div className="flex gap-2 rounded-full bg-background p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-full py-2 transition ${
            mode === "join" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          기관 선택 · 가입
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-full py-2 transition ${
            mode === "create" ? "bg-primary text-white" : "text-muted"
          }`}
        >
          담당자 · 기관 만들기
        </button>
      </div>

      {mode === "join" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            소속 기관을 선택하거나 담당자에게 받은 가입 코드를 입력하세요. 대부분 기관은{" "}
            <strong className="font-medium text-foreground">담당자 승인 후</strong> 좌석이
            배정됩니다.
          </p>

          <label className="block text-xs font-medium text-muted">
            기관 검색
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedOrgId(null);
              }}
              placeholder="기관명 검색"
              className="input-luxe mt-1.5 w-full"
            />
          </label>

          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-card-border">
            {directory.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-muted">검색 결과가 없습니다.</li>
            ) : (
              directory.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setJoinCode("");
                    }}
                    className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-sm transition ${
                      selectedOrgId === org.id
                        ? "bg-accent/10 text-foreground"
                        : "hover:bg-background/80"
                    }`}
                  >
                    <span>
                      <span className="font-medium">{org.name}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {ORG_KIND_CONFIG[org.kind]?.label ?? org.kind}
                        {org.requireMembershipApproval ? " · 승인 후 소속" : " · 즉시 소속"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">멤버 {org.memberCount}</span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="relative py-1 text-center text-[11px] text-muted">
            <span className="bg-card px-2">또는 가입 코드</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-card-border" />
          </div>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value);
              setSelectedOrgId(null);
            }}
            placeholder="예: 7QK3-N2XP"
            className="input-luxe w-full font-mono uppercase tracking-wider"
          />

          <label className="block text-xs font-medium text-muted">
            담당자에게 남길 말 (선택)
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="input-luxe mt-1.5 w-full text-sm"
              placeholder="예: OO학과 3학년 · 취업지원 프로그램 참여"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            기관을 새로 만들면 담당자(ADMIN) 권한과 가입 코드가 발급됩니다. 플랫폼 승인 후
            멤버를 받을 수 있습니다.
          </p>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="예: OO대학교 취업센터"
            className="input-luxe w-full"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          {info}
        </p>
      )}

      <button
        type="button"
        onClick={() => void (mode === "join" ? submitJoin() : submitCreate())}
        disabled={loading}
        className="btn-primary w-full py-3"
      >
        {loading
          ? "처리 중…"
          : mode === "join"
            ? selectedOrgId || joinCode.trim()
              ? "가입 요청"
              : "가입 요청"
            : "기관 만들기"}
      </button>
    </div>
  );
}
