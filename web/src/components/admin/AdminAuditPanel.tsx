"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusDot } from "@/components/admin/StatusDot";
import { formatRelativeTime } from "@/lib/admin/relative-time";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
  SOFT_DELETE: "비활성화",
  BULK_IMPORT: "일괄 반영",
  ROLE_GRANT: "권한 변경",
  ORG_APPROVE: "기관 승인",
  ORG_REJECT: "기관 반려",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "ADMIN",
  CONTENT_ADMIN: "ADMIN(레거시)",
  SUPERADMIN: "SUPERADMIN",
  NONE: "—",
};

export type AuditLogRow = {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  rolledBackAt: string | null;
  createdAt: string;
};

export function AdminAuditPanel({ initialLogs }: { initialLogs: AuditLogRow[] }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [rolling, setRolling] = useState<string | null>(null);

  const rollback = async (id: string) => {
    if (!confirm("이 변경을 롤백할까요? beforeState 기준으로 복원됩니다.")) return;
    setRolling(id);
    try {
      const res = await fetch(`/api/admin/audit/${id}/rollback`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "롤백 실패");
      setLogs((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, rolledBackAt: new Date().toISOString() } : l
        )
      );
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "롤백 실패");
    } finally {
      setRolling(null);
    }
  };

  if (logs.length === 0) {
    return <p className="text-sm text-muted">아직 ADMIN 변경 감사 로그가 없습니다.</p>;
  }

  return (
    <ul>
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-card-border px-1 py-3 text-sm last:border-0"
        >
          <StatusDot tone={log.rolledBackAt ? "neutral" : "accent"} className="w-24 shrink-0">
            {ACTION_LABEL[log.action] ?? log.action}
          </StatusDot>

          <span className="min-w-[10rem] flex-1 truncate">
            <span className="font-medium text-foreground">{log.actorEmail}</span>
            <span className="text-muted"> · {ROLE_LABEL[log.actorRole] ?? log.actorRole}</span>
          </span>

          <span className="shrink-0 text-xs text-muted">{log.entityType}</span>

          <span className="min-w-0 flex-[2] truncate text-xs text-foreground">{log.summary}</span>

          <span className="shrink-0">
            {log.rolledBackAt ? (
              <span className="text-xs text-success">롤백됨</span>
            ) : (
              <button
                type="button"
                onClick={() => rollback(log.id)}
                disabled={rolling === log.id}
                className="btn-outline-primary px-2 py-1 text-xs disabled:opacity-50"
              >
                {rolling === log.id ? "…" : "롤백"}
              </button>
            )}
          </span>

          <span className="ml-auto shrink-0 text-xs text-muted">
            {formatRelativeTime(log.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
