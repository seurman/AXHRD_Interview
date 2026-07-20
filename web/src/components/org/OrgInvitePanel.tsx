"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InviteRow = {
  id: string;
  email: string;
  orgRole: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string;
  acceptUrl: string;
};

export function OrgInvitePanel({ isAdmin }: { isAdmin: boolean }) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [emails, setEmails] = useState("");
  const [orgRole, setOrgRole] = useState<"MEMBER" | "STAFF">("MEMBER");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetch("/api/org/invitations");
    const data = await res.json();
    if (res.ok) setInvites(data.invitations ?? []);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) return null;

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/org/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: emails, orgRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "초대 실패");
      setEmails("");
      await load();
      let msg = data.message ?? "초대를 발급했습니다.";
      if (Array.isArray(data.invitations) && data.invitations[0]?.acceptUrl) {
        try {
          await navigator.clipboard.writeText(
            data.invitations.map((i: { acceptUrl: string }) => i.acceptUrl).join("\n"),
          );
          msg = `${msg} · 링크 복사됨`;
        } catch {
          /* ignore */
        }
      }
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "초대 오류");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/invitations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "취소 실패");
      toast.success(data.message ?? "초대를 취소했습니다.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "취소 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-card-border bg-card p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">이메일·CSV 초대</h3>
        <p className="mt-0.5 text-xs text-muted">
          구매한 좌석을 링크로 배분합니다. 초대 수락 = 사전 승인(대기 큐 우회).
        </p>
      </div>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        rows={3}
        placeholder={"email1@school.ac.kr\nemail2@company.com"}
        className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={orgRole}
          onValueChange={(v) => setOrgRole(v === "STAFF" ? "STAFF" : "MEMBER")}
        >
          <SelectTrigger className="h-9 w-[7.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">구성원</SelectItem>
            <SelectItem value="STAFF">담당자</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          className="btn-primary px-3 py-2 text-sm disabled:opacity-50"
          disabled={busy || !emails.trim()}
          onClick={() => void create()}
        >
          초대 발급
        </button>
      </div>

      {invites.length > 0 ? (
        <ul className="divide-y divide-card-border overflow-hidden rounded-lg border border-card-border">
          {invites.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
            >
              <span className="min-w-[10rem] flex-1 truncate font-medium">{i.email}</span>
              <span className="text-xs text-muted">
                {i.orgRole === "STAFF" ? "담당자" : "구성원"}
              </span>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => {
                  void navigator.clipboard.writeText(i.acceptUrl).then(
                    () => toast.success("링크를 복사했습니다."),
                    () => toast.error("복사에 실패했습니다."),
                  );
                }}
              >
                링크 복사
              </button>
              <button
                type="button"
                className="text-xs text-danger hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={() => void revoke(i.id)}
              >
                취소
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">대기 중 초대가 없습니다.</p>
      )}
    </section>
  );
}
