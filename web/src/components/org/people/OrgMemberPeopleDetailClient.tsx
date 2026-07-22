"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrgMemberDetailData } from "@/lib/org/people-dashboard";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { CompetencyTrendChart } from "@/components/org/CompetencyTrendChart";
import { DimensionTimeSeriesChart } from "@/components/dashboard/DimensionTimeSeriesChart";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrgMemberPeopleDetailClient({
  initial,
  canWriteFeedback,
}: {
  initial: OrgMemberDetailData & { consentRequired?: boolean };
  canWriteFeedback: boolean;
}) {
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function sendFeedback(overrideBody?: string) {
    const body = (overrideBody ?? draft).trim();
    if (body.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/org/people/${data.member.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as {
        feedback?: OrgMemberDetailData["feedback"][number];
        error?: string;
      };
      if (!res.ok || !json.feedback) throw new Error(json.error ?? "전송 실패");
      setData((d) => ({ ...d, feedback: [json.feedback!, ...d.feedback] }));
      if (!overrideBody) setDraft("");
      setMessage(overrideBody ? "동의 요청을 보냈습니다." : "피드백을 보냈습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송 실패");
    } finally {
      setBusy(false);
    }
  }

  async function requestConsent() {
    await sendFeedback(
      "상세 역량·면접 리포트 공유 동의를 요청합니다. 프로필에서 「기관 코칭 상세 공유」를 켜 주시면 담당자가 시계열·리포트를 보고 코칭할 수 있습니다.",
    );
  }

  const m = data.member;
  const consentRequired = data.consentRequired === true || !m.coachingConsent;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/org/dashboard?tab=people" className="text-sm text-accent hover:underline">
          ← 구성원
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-[1.75rem] border border-card-border bg-card px-6 py-7 shadow-luxe sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 45%), linear-gradient(225deg, color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 40%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  m.online ? "bg-success" : "bg-muted/40"
                }`}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                Member profile
              </p>
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold text-foreground">
              {m.name}
            </h1>
            <p className="mt-1 text-sm text-muted">{m.email}</p>
            <p className="mt-2 text-xs text-muted">
              가입 {formatWhen(m.joinedAt)} · 로그인 {formatWhen(m.lastLoginAt)} · 로그아웃{" "}
              {formatWhen(m.lastLogoutAt)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="완료 면접" value={String(data.interviews.completed)} />
            <MiniStat
              label="평균 백분위"
              value={
                data.scores.avgPercentile != null
                  ? String(data.scores.avgPercentile)
                  : "—"
              }
            />
            <MiniStat
              label="역량평가"
              value={String(data.assessmentAttempts)}
            />
          </div>
        </div>
      </header>

      {consentRequired ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4 text-sm text-muted">
          <p>
            이 구성원은 상세 역량 공유에 아직 동의하지 않았습니다. 면접 횟수·접속·피드백은
            가능하며, 역량 시계열·세부 점수는 동의 후 표시됩니다.
          </p>
          {canWriteFeedback ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void requestConsent()}
              className="btn-secondary mt-3 px-3 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "요청 중…" : "동의 요청 보내기"}
            </button>
          ) : null}
          {error ? <p className="mt-2 text-xs text-warning">{error}</p> : null}
          {message ? <p className="mt-2 text-xs text-success">{message}</p> : null}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="면접"
          body={`완료 ${data.interviews.completed} · 진행 ${data.interviews.inProgress} · 중단 ${data.interviews.abandoned}`}
          foot={`최근 완료 ${formatWhen(data.interviews.lastCompletedAt)}`}
        />
        <StatCard
          title="강점 역량"
          body={
            data.scores.latestByCompetency[0]
              ? `${data.scores.latestByCompetency[0].label} ${formatPercentile(data.scores.latestByCompetency[0].percentile)}`
              : "데이터 없음"
          }
          foot="최신 스냅샷 기준"
        />
        <StatCard
          title="보완 역량"
          body={
            data.scores.latestByCompetency.length
              ? `${data.scores.latestByCompetency[data.scores.latestByCompetency.length - 1].label} ${formatPercentile(data.scores.latestByCompetency[data.scores.latestByCompetency.length - 1].percentile)}`
              : "데이터 없음"
          }
          foot="집중 코칭 후보"
        />
      </section>

      {!consentRequired ? (
        <>
          <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
            <h2 className="text-base font-semibold text-foreground">역량 백분위 시계열</h2>
            <p className="mt-1 text-xs text-muted">면접이 쌓일수록 역량별 성장 궤적이 보입니다.</p>
            <div className="mt-4">
              <CompetencyTrendChart
                series={data.competencySeries}
                emptyHint="아직 역량 스냅샷이 없습니다."
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
            <h2 className="text-base font-semibold text-foreground">답변 품질 6축 추이</h2>
            <p className="mt-1 text-xs text-muted">세션별 평균 차원 점수입니다.</p>
            <div className="mt-4">
              <DimensionTimeSeriesChart
                timeline={data.dimensionTimeline}
                emptyHint="완료된 면접의 차원 점수가 쌓이면 표시됩니다."
              />
            </div>
          </section>

          {data.scores.latestByCompetency.length > 0 ? (
            <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
              <h2 className="text-base font-semibold text-foreground">최신 역량 점수</h2>
              <ul className="mt-4 space-y-2">
                {data.scores.latestByCompetency.map((c) => (
                  <li key={c.competency}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="tabular-nums text-muted">
                        {formatPercentile(c.percentile)} · Lv.{c.levelEst}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.min(100, Math.max(0, c.percentile))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {data.interviews.recent.length > 0 ? (
        <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
          <h2 className="text-base font-semibold text-foreground">최근 면접</h2>
          <ul className="mt-3 divide-y divide-card-border">
            {data.interviews.recent.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">
                  {s.sessionNumber}차
                  {s.focusCompetency
                    ? ` · ${competencyLabel(s.focusCompetency)}`
                    : ""}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  <span>{formatWhen(s.completedAt)}</span>
                  {!consentRequired ? (
                    <Link
                      href={`/interview/${s.id}/report`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      리포트
                    </Link>
                  ) : (
                    <span className="rounded-md bg-background px-2 py-0.5">비공개</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[1.5rem] border border-card-border bg-card p-5 shadow-luxe sm:p-6">
        <h2 className="text-base font-semibold text-foreground">코칭 피드백</h2>
        <p className="mt-1 text-xs text-muted">
          구성원 프로필에 전달됩니다. 구체적 행동·다음 연습 포인트를 적어 주세요.
        </p>

        {canWriteFeedback ? (
          <div className="mt-4 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="예: 상황 구체화가 좋아졌습니다. 다음엔 수치화된 결과를 한 문장으로 마무리해 보세요."
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{draft.length} / 4000</p>
              <button
                type="button"
                disabled={busy || draft.trim().length < 2}
                onClick={() => void sendFeedback()}
                className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
              >
                {busy ? "전송 중…" : "피드백 보내기"}
              </button>
            </div>
            {!consentRequired && error ? <p className="text-xs text-warning">{error}</p> : null}
            {!consentRequired && message ? <p className="text-xs text-success">{message}</p> : null}
          </div>
        ) : null}

        <ul className="mt-5 space-y-3">
          {data.feedback.length === 0 ? (
            <li className="text-sm text-muted">아직 남긴 피드백이 없습니다.</li>
          ) : (
            data.feedback.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-card-border bg-background/70 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span className="font-medium text-foreground">{f.authorName}</span>
                  <span>
                    {formatWhen(f.createdAt)}
                    {f.readAt ? " · 읽음" : " · 미열람"}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {f.body}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card-border/80 bg-background/70 px-3 py-2">
      <p className="font-[family-name:var(--font-ibm-plex)] text-xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function StatCard({
  title,
  body,
  foot,
}: {
  title: string;
  body: string;
  foot: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-luxe">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{title}</p>
      <p className="mt-2 text-sm font-medium leading-snug text-foreground">{body}</p>
      <p className="mt-2 text-xs text-muted">{foot}</p>
    </div>
  );
}
