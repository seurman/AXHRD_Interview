"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MembershipReviewModal,
  type MembershipReviewMode,
} from "@/components/org/MembershipReviewModal";
import { OrgInvitePanel } from "@/components/org/OrgInvitePanel";
import { OrgStudioTabs } from "@/components/org/OrgStudioTabs";
import { OrgConfirmDialog } from "@/components/org/OrgConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

type Seats = {
  members: number;
  pending: number;
  invites?: number;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{
    mode: MembershipReviewMode;
    ids: string[];
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
      toast.error(e instanceof Error ? e.message : "오류");
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
      toast.error("좌석 상한에 도달해 승인할 수 없습니다.");
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
      toast.success(data.message ?? "처리했습니다.");
      setModal(null);
      await load();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "처리 오류";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (userId: string, orgRole: "MEMBER" | "STAFF") => {
    setBusyId(userId);
        try {
      const res = await fetch(`/api/org/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "역할 변경 실패");
      toast.success(data.message ?? "역할을 변경했습니다.");
      await load();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "역할 변경 오류";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    setBusyId(removeTarget.id);
    try {
      const res = await fetch(`/api/org/members/${removeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "해제 실패");
      toast.success(data.message ?? "소속을 해제했습니다.");
      setRemoveTarget(null);
      await load();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "해제 오류";
      toast.error(msg);
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
      const msg = next
        ? "가입 시 담당자 승인이 필요합니다. 승인된 인원만 좌석에 집계됩니다."
        : "가입 코드·기관 선택 시 즉시 소속됩니다.";
      toast.success(msg);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "설정 오류";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-card-border sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="h-12 animate-pulse rounded-xl bg-muted/20" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/20" />
      </div>
    );
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
        <div className="org-ops-kpi bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            소속 멤버
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums">
            {seats?.members ?? 0}
          </p>
        </div>
        <div className="org-ops-kpi bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            승인 대기
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums text-warning">
            {seats?.pending ?? 0}
          </p>
        </div>
        <div className="org-ops-kpi bg-card px-5 py-4 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            좌석 상한
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums">
            {seats?.cap == null ? "∞" : seats.cap}
          </p>
        </div>
        <div className="org-ops-kpi bg-card px-5 py-4 sm:px-6">
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
                seatFull ? "bg-danger" : seatTight ? "bg-warning" : "bg-gold"
              }`}
              style={{ width: `${seatPct ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            예약 = 소속 멤버 + 승인 대기 + 초대. 초대·대기도 좌석을 미리 점유합니다.
          </p>
          {seatFull ? (
            <p className="mt-2 text-xs font-medium text-danger">
              좌석 상한에 도달했습니다.{" "}
              <Link href={`/pricing?seats=${(seats.cap ?? 0) + 10}`} className="underline">
                좌석 추가 구독
              </Link>
              으로 상한을 올리거나 멤버를 정리하세요.
            </p>
          ) : seatTight ? (
            <p className="mt-2 text-xs font-medium text-warning">
              좌석이 90% 이상 사용 중입니다.{" "}
              <Link href={`/pricing?seats=${Math.ceil((seats.cap ?? 10) * 1.2)}`} className="underline">
                좌석 확장
              </Link>
              을 검토하세요.
            </p>
          ) : null}
          {seats.invites != null && seats.invites > 0 ? (
            <p className="mt-1 text-xs text-muted">대기 초대 {seats.invites}건도 좌석에 포함됩니다.</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-card-border px-4 py-3 text-xs text-muted">
          좌석 상한이 없습니다.{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            Organization Standard
          </Link>
          로 좌석을 구매하면 초대·승인 한도가 적용됩니다.
        </div>
      )}

      {isAdmin ? <OrgInvitePanel isAdmin={isAdmin} /> : null}

      {isAdmin ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-card-border bg-card p-4 text-sm sm:p-5">
          <Checkbox
            className="mt-1"
            checked={requireApproval}
            disabled={busyId === "settings"}
            onCheckedChange={(v) => void toggleApproval(v === true)}
          />
          <span>
            <span className="font-semibold text-foreground">가입 시 담당자 승인 필요</span>
            <span className="mt-0.5 block text-xs text-muted">
              켜 두면 인별 좌석이 승인 후에만 배정됩니다.
            </span>
          </span>
        </label>
      ) : null}

      <OrgStudioTabs
        triggersOnly
        value={tab}
        onValueChange={(v) => setTab(v === "members" ? "members" : "pending")}
        tabs={[
          { id: "pending", label: `승인 대기 (${pending.length})`, badge: pending.length },
          { id: "members", label: `멤버 (${members.length})` },
        ]}
      />

      {tab === "pending" ? (
        pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-muted">
            대기 중인 가입 요청이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted">
                <Checkbox
                  checked={selected.size === pending.length && pending.length > 0}
                  onCheckedChange={() => toggleSelectAll()}
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
                    <Checkbox
                      className="mt-1 sm:mt-0"
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
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
                <Select
                  value={m.orgRole === "STAFF" ? "STAFF" : "MEMBER"}
                  disabled={busyId === m.id}
                  onValueChange={(v) =>
                    void changeRole(m.id, v === "STAFF" ? "STAFF" : "MEMBER")
                  }
                >
                  <SelectTrigger className="h-9 w-[7.5rem] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">구성원</SelectItem>
                    <SelectItem value="STAFF">담당자</SelectItem>
                  </SelectContent>
                </Select>
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
                  onClick={() => setRemoveTarget({ id: m.id, name: m.name })}
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
      <OrgConfirmDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open && busyId !== removeTarget?.id) setRemoveTarget(null);
        }}
        title="소속 해제"
        description={
          removeTarget
            ? `${removeTarget.name}님의 소속을 해제할까요? 좌석이 반환됩니다.`
            : undefined
        }
        confirmLabel="해제"
        confirmTone="danger"
        busy={busyId === removeTarget?.id}
        onConfirm={removeMember}
      />
    </div>
  );
}
