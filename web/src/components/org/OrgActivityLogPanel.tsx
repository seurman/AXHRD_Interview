"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Mic2, Search, Sparkles } from "lucide-react";
import type { OrgActivityRow } from "@/lib/org/activity-log";

function kindIcon(kind: OrgActivityRow["kind"]) {
  if (kind === "interview") return Mic2;
  if (kind === "discover") return Sparkles;
  return FileText;
}

function kindLabel(kind: OrgActivityRow["kind"]) {
  return kind === "interview" ? "모의면접" : "자기발견 인터뷰";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 기관 담당자용 활동 로그 — 이름으로 필터링 가능한 테이블. 답변 원문·점수는 표시하지 않는다. */
export function OrgActivityLogPanel({
  rows,
  bare = false,
}: {
  rows: OrgActivityRow[];
  /** Parent already provides a frame — skip outer card chrome. */
  bare?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.memberName.toLowerCase().includes(q) ||
        (r.competency ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (rows.length === 0) {
    return (
      <div
        className={
          bare
            ? "rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted"
            : "card-luxe border-dashed p-8 text-center text-sm text-muted"
        }
      >
        아직 완료된 활동이 없습니다.
      </div>
    );
  }

  const body = (
    <>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 역량으로 검색"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">검색 결과가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-4 font-medium">이름</th>
                <th className="py-2 pr-4 font-medium">활동</th>
                <th className="py-2 pr-4 font-medium">역량</th>
                <th className="py-2 pr-4 font-medium">시각</th>
                <th className="py-2 font-medium">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const Icon = kindIcon(row.kind);
                return (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    className="border-b border-card-border/80 transition hover:bg-background/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {row.memberName}
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
                        {kindLabel(row.kind)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      {row.competency ? (
                        <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                          {row.competency}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-muted">
                      {formatDateTime(row.completedAt)}
                    </td>
                    <td className="py-2.5">
                      {row.detailHref ? (
                        <Link
                          href={row.detailHref}
                          className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          상세
                        </Link>
                      ) : (
                        <span className="rounded-md bg-background px-2 py-0.5 text-xs text-muted">
                          비공개
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  if (bare) return <div>{body}</div>;
  return <div className="card-luxe p-5">{body}</div>;
}
