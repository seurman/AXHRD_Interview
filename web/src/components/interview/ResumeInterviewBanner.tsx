"use client";

import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import { trackFunnel } from "@/lib/analytics/funnel";

export type ResumeSessionCard = {
  id: string;
  focusCompetency: string | null;
  sessionNumber: number;
  startedAt: string | null;
  timeBudgetMinutes: number | null;
};

type Props = {
  sessions: ResumeSessionCard[];
  /** setup | dashboard — 문구만 조금 다르게 */
  variant?: "setup" | "dashboard";
};

export function ResumeInterviewBanner({ sessions, variant = "setup" }: Props) {
  if (sessions.length === 0) return null;

  const lead =
    variant === "dashboard"
      ? "이어서 할 면접이 있습니다"
      : "진행 중이던 면접이 있습니다";

  return (
    <section
      className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5"
      aria-label="미완료 면접 이어하기"
    >
      <p className="text-sm font-semibold text-foreground">{lead}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        새로 시작하면 별도 세션이 만들어집니다. 저장해 둔 진행을 이어가려면 아래에서
        선택하세요.
      </p>
      <ul className="mt-3 space-y-2">
        {sessions.map((s) => {
          const title = s.focusCompetency
            ? `${competencyLabel(s.focusCompetency)} 면접 #${s.sessionNumber}`
            : `모의면접 #${s.sessionNumber}`;
          const when = s.startedAt
            ? new Date(s.startedAt).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;
          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted">
                  {[when, s.timeBudgetMinutes ? `약 ${s.timeBudgetMinutes}분` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Link
                href={`/interview/${s.id}`}
                className="btn-primary shrink-0 px-3 py-1.5 text-sm"
                onClick={() =>
                  trackFunnel("interview_resume", {
                    sessionId: s.id,
                    source: variant,
                  })
                }
              >
                이어서 하기
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
