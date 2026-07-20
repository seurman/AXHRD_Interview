"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/org/membership-requests/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "승인 실패");
      setMessage(data.message);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인 오류");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("거절 사유 (선택)") ?? "";
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/org/membership-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectReason: reason || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "거절 실패");
      setMessage(data.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "거절 오류");
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
    <div className="space-y-5">
      <div
        className={`grid gap-3 sm:grid-cols-4 ${
          embedded
            ? "rounded-xl border border-card-border p-4"
            : "card-luxe p-5"
        }`}
      >
        <div>
          <p className="text-xs text-muted">소속 멤버 (과금)</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{seats?.members ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted">승인 대기 (예약)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {seats?.pending ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">좌석 상한</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {seats?.cap == null ? "무제한" : seats.cap}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">가입 코드</p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-wider">{joinCode || "—"}</p>
        </div>
      </div>

      {isAdmin ? (
        <label
          className={`flex cursor-pointer items-start gap-3 p-4 text-sm ${
            embedded ? "rounded-xl border border-card-border" : "card-luxe"
          }`}
        >
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
              Slack Workspace 승인 패턴. 켜 두면 인별 좌석이 승인 후에만 배정됩니다.
            </span>
          </span>
        </label>
      ) : null}

      <div className="flex gap-2 border-b border-card-border pb-2">
        {(
          [
            ["pending", `승인 대기 (${pending.length})`],
            ["members", `멤버 (${members.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === id
                ? "bg-foreground text-background"
                : "text-muted hover:bg-background"
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
          <div className="rounded-xl border border-dashed border-card-border p-8 text-center text-sm text-muted">
            대기 중인 가입 요청이 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="card-luxe flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{p.user.name}</p>
                  <p className="text-xs text-muted">{p.user.email}</p>
                  {p.message ? (
                    <p className="mt-1 text-xs text-foreground/80">“{p.message}”</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted">
                    신청 {new Date(p.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary px-3 py-2 text-sm disabled:opacity-50"
                    disabled={busyId === p.id}
                    onClick={() => void approve(p.id)}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                    disabled={busyId === p.id}
                    onClick={() => void reject(p.id)}
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border p-8 text-center text-sm text-muted">
          소속 멤버가 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm"
            >
              <span className="min-w-[7rem] font-medium text-foreground">{m.name}</span>
              <span className="min-w-[10rem] flex-1 text-muted">{m.email}</span>
              <span className="rounded-md bg-background px-2 py-0.5 text-xs text-muted">
                {ROLE_LABEL[m.orgRole] ?? m.orgRole}
              </span>
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
    </div>
  );
}
