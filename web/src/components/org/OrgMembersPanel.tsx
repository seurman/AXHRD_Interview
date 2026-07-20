"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MembershipReviewModal,
  type MembershipReviewMode,
} from "@/components/org/MembershipReviewModal";

type Seats = {
  members: number;
  pending: number;
  reserved: number;
  cap: number | null;
  remaining: number | null;
  requireMembershipApproval: boolean;
};

type PendingRow = {
  id: string;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; createdAt: string };
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  orgRole: string;
  createdAt: string;
  orgCoachingConsent: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  STAFF: "담당자",
  MEMBER: "구성원",
  STUDENT: "구성원",
};

export function OrgMembersPanel({
  isAdmin,
  embedded = false,
}: {
  isAdmin: boolean;
  /** Nested in ops console — avoid an extra outer card frame. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "members">("pending");
  const [seats, setSeats] = useState<Seats | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{
    mode: MembershipReviewMode;
    ids: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setSeats(data.seats);
      setPending(data.pending ?? []);
      setMembers(data.members ?? []);
      setJoinCode(data.organization?.joinCode ?? "");
      setRequireApproval(Boolean(data.organization?.requireMembershipApproval));
      if ((data.pending?.length ?? 0) === 0) setTab("members");
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seatFull = seats?.cap != null && (seats.remaining ?? 0) <= 0;
  const seatTight =
    seats?.cap != null &&
    seats.cap > 0 &&
    seats.reserved / seats.cap >= 0.9 &&
    !seatFull;

  const seatPct = useMemo(() => {
    if (!seats?.cap || seats.cap <= 0) return null;
    return Math.min(100, Math.round((seats.reserved / seats.cap) * 100));
  }, [seats]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending.map((p) => p.id)));
  };

  const openModal = (mode: MembershipReviewMode, ids: string[]) => {
    if (ids.length === 0) return;
    if (mode === "approve" && seatFull) {
      setError("좌석 상한에 도달해 승인할 수 없습니다.");
      return;
    }
    setModal({ mode, ids });
  };

  const runReview = async (opts: {
    orgRole: "MEMBER" | "STAFF";
    rejectReason: string;
  }) => {
    if (!modal) return;
    setBusyId("bulk");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/org/membership-requests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modal.mode,
          ids: modal.ids,
          orgRole: modal.mode === "approve" ? opts.orgRole : undefined,
          rejectReason: modal.mode === "reject" ? opts.rejectReason || null : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "처리 실패");
      setMessage(data.message);
      setModal(null);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 오류");
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (userId: string, orgRole: "MEMBER" | "STAFF") => {
    setBusyId(userId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/org/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "역할 변경 실패");
      setMessage(data.message);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "역할 변경 오류");
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (userId: string, name: string) => {
    if (!confirm(`${name}님의 소속을 해제할까요? 좌석이 반환됩니다.`)) return;
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/org/members/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "해제 실패");
      setMessage(data.message);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "해제 오류");
    } finally {
      setBusyId(null);
    }
  };

  const toggleApproval = async (next: boolean) => {
    if (!isAdmin) return;
    setBusyId("settings");
    try {
      const res = await fetch("/api/org/membership-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireMembershipApproval: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "설정 실패");
      setRequireApproval(next);
      setMessage(
        next
          ? "가입 시 담당자 승인이 필요합니다. 승인된 인원만 좌석에 집계됩니다."
          : "가입 코드·기관 선택 시 즉시 소속됩니다.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "설정 오류");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">멤버·승인 대기 불러오는 중…</p>;
  }

  return (
    <div
      className={
        embedded
          ? "space-y-5"
          : "space-y-5 rounded-xl border border-card-border bg-card p-5 sm:p-6"
      }
    >
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-card-border bg-card-border sm:grid-cols-4">
        <div className="bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            소속 멤버
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums">
            {seats?.members ?? 0}
          </p>
        </div>
        <div className="bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            승인 대기
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums text-warning">
            {seats?.pending ?? 0}
          </p>
        </div>
        <div className="bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            좌석 상한
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums">
            {seats?.cap == null ? "∞" : seats.cap}
          </p>
        </div>
        <div className="bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            가입 코드
          </p>
          <p className="mt-2 break-all font-mono text-sm font-semibold tracking-wider">
            {joinCode || "—"}
          </p>
        </div>
      </div>

      {seats?.cap != null ? (
        <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">좌석 사용량</p>
            <p className="text-xs tabular-nums text-muted">
              예약 {seats.reserved} / {seats.cap}
              {seats.remaining != null ? ` · 잔여 ${seats.remaining}` : ""}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-[width] ${
                seatFull ? "bg-danger" : seatTight ? "bg-warning" : "bg-foreground"
              }`}
              style={{ width: `${seatPct ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            예약 = 소속 멤버 + 승인 대기. 대기 건도 좌석을 미리 점유합니다.
          </p>
          {seatFull ? (
            <p className="mt-2 text-xs font-medium text-danger">
              좌석 상한에 도달했습니다. 승인 전에 상한을 올리거나 멤버를 정리하세요.
            </p>
          ) : seatTight ? (
            <p className="mt-2 text-xs font-medium text-warning">
              좌석이 90% 이상 사용 중입니다. 상한 확장을 검토하세요.
            </p>
          ) : null}
        </div>
      ) : null}

      {isAdmin ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-card-border bg-card p-4 text-sm sm:p-5">
          <input
            type="checkbox"
            className="mt-1"
            checked={requireApproval}
            disabled={busyId === "settings"}
            onChange={(e) => void toggleApproval(e.target.checked)}
          />
          <span>
            <span className="font-semibold text-foreground">가입 시 담당자 승인 필요</span>
            <span className="mt-0.5 block text-xs text-muted">
              켜 두면 인별 좌석이 승인 후에만 배정됩니다.
            </span>
          </span>
        </label>
      ) : null}

      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-xl border border-card-border bg-background p-1"
      >
        {(
          [
            ["pending", `승인 대기 (${pending.length})`],
            ["members", `멤버 (${members.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-10 rounded-lg text-sm font-semibold transition ${
              tab === id
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      {tab === "pending" ? (
        pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-muted">
            대기 중인 가입 요청이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={selected.size === pending.length && pending.length > 0}
                  onChange={toggleSelectAll}
                />
                전체 선택
              </label>
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={selected.size === 0 || seatFull || busyId === "bulk"}
                onClick={() => openModal("approve", [...selected])}
              >
                선택 승인 ({selected.size})
              </button>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                disabled={selected.size === 0 || busyId === "bulk"}
                onClick={() => openModal("reject", [...selected])}
              >
                선택 거절
              </button>
            </div>
            <ul className="divide-y divide-card-border overflow-hidden rounded-xl border border-card-border">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 bg-card px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                >
                  <label className="flex items-start gap-3 sm:items-center">
                    <input
                      type="checkbox"
                      className="mt-1 sm:mt-0"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{p.user.name}</span>
                      <span className="block truncate text-xs text-muted">{p.user.email}</span>
                      {p.message ? (
                        <span className="mt-1 block text-xs text-foreground/80">
                          “{p.message}”
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-muted">
                        신청 {new Date(p.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </span>
                  </label>
                  <div className="flex shrink-0 gap-2 sm:ml-auto">
                    <button
                      type="button"
                      className="btn-primary px-3 py-2 text-sm disabled:opacity-50"
                      disabled={seatFull || busyId === "bulk"}
                      onClick={() => openModal("approve", [p.id])}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                      disabled={busyId === "bulk"}
                      onClick={() => openModal("reject", [p.id])}
                    >
                      거절
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-muted">
          소속 멤버가 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-card-border overflow-hidden rounded-xl border border-card-border">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card px-5 py-3.5 text-sm sm:px-6"
            >
              <span className="min-w-[7rem] font-medium text-foreground">{m.name}</span>
              <span className="min-w-[10rem] flex-1 truncate text-muted">{m.email}</span>
              {isAdmin && m.orgRole !== "ADMIN" ? (
                <select
                  value={m.orgRole === "STAFF" ? "STAFF" : "MEMBER"}
                  disabled={busyId === m.id}
                  onChange={(e) =>
                    void changeRole(m.id, e.target.value === "STAFF" ? "STAFF" : "MEMBER")
                  }
                  className="min-h-9 rounded-md border border-card-border bg-background px-2 text-xs"
                >
                  <option value="MEMBER">구성원</option>
                  <option value="STAFF">담당자</option>
                </select>
              ) : (
                <span className="rounded-md border border-card-border px-2 py-0.5 text-xs text-muted">
                  {ROLE_LABEL[m.orgRole] ?? m.orgRole}
                </span>
              )}
              {isAdmin && m.orgRole !== "ADMIN" ? (
                <button
                  type="button"
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                  disabled={busyId === m.id}
                  onClick={() => void removeMember(m.id, m.name)}
                >
                  소속 해제
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <MembershipReviewModal
        open={modal != null}
        mode={modal?.mode ?? "approve"}
        count={modal?.ids.length ?? 0}
        isAdmin={isAdmin}
        busy={busyId === "bulk"}
        onClose={() => {
          if (busyId !== "bulk") setModal(null);
        }}
        onConfirm={(opts) => void runReview(opts)}
      />
    </div>
  );
}
