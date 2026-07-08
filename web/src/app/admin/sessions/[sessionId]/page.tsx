import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleString("ko-KR");
}

function scorePct(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score * 100)}점`;
}

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireSuperadmin("/admin/sessions");
  const { sessionId } = await params;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          organization: { select: { name: true } },
        },
      },
      responses: {
        include: { question: { select: { template: true, externalId: true } } },
        orderBy: { createdAt: "asc" },
      },
      chipEvents: { orderBy: { sequence: "asc" } },
      report: { select: { id: true, generatedAt: true } },
    },
  });

  if (!session) notFound();

  const kitOrg = session.kitOrganizationId
    ? await prisma.organization.findUnique({
        where: { id: session.kitOrganizationId },
        select: { name: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/admin/sessions" className="text-sm text-accent hover:underline">
          ← 면접 세션 목록
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">세션 상세</h1>
        <p className="mt-1 font-mono text-xs text-muted">{session.id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card-luxe p-5 text-sm">
          <h2 className="mb-3 font-semibold text-foreground">사용자</h2>
          <dl className="space-y-2 text-muted">
            <div>
              <dt className="text-xs uppercase tracking-wide">이름</dt>
              <dd className="text-foreground">{session.user.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">이메일</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">소속 기관</dt>
              <dd>{session.user.organization?.name ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="card-luxe p-5 text-sm">
          <h2 className="mb-3 font-semibold text-foreground">세션 메타</h2>
          <dl className="space-y-2 text-muted">
            <div>
              <dt className="text-xs uppercase tracking-wide">상태</dt>
              <dd className="text-foreground">{session.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">역량 · 모드</dt>
              <dd>
                {session.focusCompetency ? competencyLabel(session.focusCompetency) : "—"} ·{" "}
                {session.mode}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">시작 · 완료</dt>
              <dd>
                {formatDate(session.startedAt)} → {formatDate(session.completedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">킷 기관</dt>
              <dd>{kitOrg?.name ?? session.kitOrganizationId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">무결성 신호</dt>
              <dd>
                붙여넣기 {session.pasteDetected ? "감지" : "없음"} · 탭 이탈 {session.tabSwitchCount}
                회
                {session.isPresenterDemo ? " · presenter 데모" : ""}
              </dd>
            </div>
            {session.report && (
              <div>
                <dt className="text-xs uppercase tracking-wide">리포트</dt>
                <dd>
                  <Link
                    href={`/interview/${session.id}/report`}
                    className="text-accent hover:underline"
                  >
                    {formatDate(session.report.generatedAt)} 생성
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {session.setupSelectionText && (
        <section className="card-luxe p-5 text-sm">
          <h2 className="mb-2 font-semibold text-foreground">시작 시 선택 스냅샷</h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 text-xs leading-relaxed text-muted">
            {session.setupSelectionText}
          </pre>
        </section>
      )}

      <section className="card-luxe p-5">
        <h2 className="mb-4 font-semibold text-foreground">
          응답 기록 ({session.responses.length})
        </h2>
        <div className="space-y-6">
          {session.responses.map((r, i) => (
            <article
              key={r.id}
              className="rounded-xl border border-card-border bg-background/40 p-4 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-medium text-foreground">#{i + 1}</span>
                <span>
                  {competencyLabel(r.competency)} · L{r.level}
                </span>
                <span>점수 {scorePct(r.rubricScore)}</span>
                {r.initialRubricScore != null && (
                  <span>초기 {scorePct(r.initialRubricScore)}</span>
                )}
                {r.durationSec != null && <span>{r.durationSec}초</span>}
                <span className="font-mono">{r.question.externalId}</span>
              </div>
              <p className="mb-3 text-xs text-muted">{r.question.template}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">답변</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted">
                    {r.correctedTranscript ?? r.transcript}
                  </p>
                  {r.correctedTranscript && r.correctedTranscript !== r.transcript && (
                    <details className="mt-2 text-xs text-muted">
                      <summary className="cursor-pointer text-accent">원본 STT</summary>
                      <p className="mt-1 whitespace-pre-wrap">{r.transcript}</p>
                    </details>
                  )}
                </div>
                {r.followUpQuestion && (
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                    <p className="text-xs font-semibold text-accent">꼬리질문</p>
                    <p className="mt-1 text-muted">{r.followUpQuestion}</p>
                    {r.followUpTranscript && (
                      <>
                        <p className="mt-3 text-xs font-semibold text-foreground">꼬리답변</p>
                        <p className="mt-1 whitespace-pre-wrap text-muted">
                          {r.followUpCorrectedTranscript ?? r.followUpTranscript}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
          {session.responses.length === 0 && (
            <p className="text-sm text-muted">아직 저장된 응답이 없습니다.</p>
          )}
        </div>
      </section>

      {session.chipEvents.length > 0 && (
        <section className="card-luxe p-5 text-sm">
          <h2 className="mb-3 font-semibold text-foreground">칩 이벤트</h2>
          <ul className="space-y-2 text-muted">
            {session.chipEvents.map((c) => (
              <li key={c.id} className="rounded-lg bg-background/50 px-3 py-2">
                #{c.sequence} {competencyLabel(c.competency)} L{c.level} · {c.chipType} ·{" "}
                {scorePct(c.rubricScore)}
                {c.hadFollowUp ? " · 꼬리질문 포함" : ""}
                {c.briefFeedback && (
                  <p className="mt-1 text-xs leading-relaxed">{c.briefFeedback}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-luxe p-5 text-sm">
        <h2 className="mb-2 font-semibold text-foreground">IRT 상태 (JSON)</h2>
        <pre className="max-h-64 overflow-auto rounded-lg bg-background p-3 text-xs text-muted">
          {JSON.stringify(session.irtState, null, 2) ?? "null"}
        </pre>
      </section>
    </div>
  );
}
