"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-card-border text-xs text-muted">
            <th className="py-2 pr-3 font-medium">시각</th>
            <th className="py-2 pr-3 font-medium">수행자</th>
            <th className="py-2 pr-3 font-medium">작업</th>
            <th className="py-2 pr-3 font-medium">요약</th>
            <th className="py-2 pr-3 font-medium">롤백</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-card-border last:border-0">
              <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">
                {new Date(log.createdAt).toLocaleString("ko-KR")}
              </td>
              <td className="py-2 pr-3 text-xs">
                <div className="text-foreground">{log.actorEmail}</div>
                <div className="text-muted">{ROLE_LABEL[log.actorRole] ?? log.actorRole}</div>
              </td>
              <td className="py-2 pr-3 text-xs text-muted">
                {ACTION_LABEL[log.action] ?? log.action}
                <div className="text-[0.65rem]">{log.entityType}</div>
              </td>
              <td className="py-2 pr-3 text-foreground">{log.summary}</td>
              <td className="py-2 pr-3">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
