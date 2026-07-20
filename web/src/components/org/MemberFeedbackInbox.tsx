"use client";

import { useEffect, useState } from "react";

type FeedbackItem = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  readAt: string | null;
};

/** 구성원 본인 — 기관 담당자 피드백 수신함 */
export function MemberFeedbackInbox() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/org/my-feedback");
        const data = (await res.json()) as { feedback?: FeedbackItem[] };
        if (res.ok) {
          setItems(data.feedback ?? []);
          const unread = (data.feedback ?? []).some((f) => !f.readAt);
          if (unread) {
            await fetch("/api/org/my-feedback", { method: "POST" });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
        Coach notes
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">기관 피드백</h2>
      <p className="mt-1 text-xs text-muted">담당자가 남긴 코칭 메모입니다.</p>
      <ul className="mt-4 space-y-3">
        {items.map((f) => (
          <li
            key={f.id}
            className="rounded-xl border border-card-border bg-background/70 px-4 py-3"
          >
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">{f.authorName}</span>
              <span>
                {new Date(f.createdAt).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
