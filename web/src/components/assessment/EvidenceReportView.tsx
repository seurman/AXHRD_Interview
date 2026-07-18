import type { EvidenceAssessmentReport } from "@/types/evidence-assessment";

/**
 * 증거형 평가 리포트 공용 렌더러 — 모의면접 리포트(SessionReportView)와
 * 역량평가(역할연기·서류함) 리포트 페이지에서 함께 사용.
 */
export function EvidenceReportView({
  report,
  heading = "행동 증거 기반 평가",
}: {
  report: EvidenceAssessmentReport;
  heading?: string;
}) {
  return (
    <section className="card-luxe space-y-5 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {report.reportKindLabel}
          </p>
          <h2 className="mt-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
            {heading}
          </h2>
          {report.roleContext ? (
            <p className="mt-1 text-sm text-muted">{report.roleContext}</p>
          ) : null}
        </div>
        <div className="w-full rounded-xl border border-gold/30 bg-gold-light/10 px-4 py-3 text-center sm:w-auto">
          <p className="text-2xl font-bold text-foreground">
            {report.overallScore.toFixed(2)}
            <span className="text-sm font-normal text-muted"> / 5</span>
          </p>
          <p className="mt-1 text-xs font-medium text-accent">
            {report.overallLevelLabel}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted report-prose">
        {report.executiveSummary}
      </p>

      <div className="space-y-4">
        {report.competencies.map((competency) => (
          <article
            key={competency.code}
            className="rounded-2xl border border-card-border bg-background/60 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <h3 className="font-semibold text-foreground">{competency.nameKo}</h3>
              <span className="w-fit rounded-full bg-card px-3 py-1 text-xs font-medium text-accent">
                {competency.score.toFixed(2)} · {competency.levelLabel}
              </span>
            </div>

            {competency.subCompetencies.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {competency.subCompetencies.map((subskill) => (
                  <div key={subskill.code} className="rounded-xl bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-foreground">
                        {subskill.nameKo}
                      </h4>
                      <span className="text-xs text-muted">
                        {subskill.score.toFixed(2)}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {subskill.observedBehaviors.map((behavior, index) => (
                        <li
                          key={`${behavior.indicatorCode ?? behavior.text}-${index}`}
                          className="text-xs leading-relaxed text-muted"
                        >
                          <span
                            className={
                              behavior.polarity === "POSITIVE"
                                ? "font-semibold text-success"
                                : "font-semibold text-warning"
                            }
                          >
                            {behavior.polarity === "POSITIVE" ? "+ " : "△ "}
                          </span>
                          {behavior.text}
                          {behavior.quote ? (
                            <q className="mt-1 block border-l-2 border-card-border pl-2 text-foreground/80">
                              {behavior.quote}
                            </q>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-foreground">평정 근거</dt>
                <dd className="mt-1 leading-relaxed text-muted">{competency.rationale}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">개발 제언</dt>
                <dd className="mt-1 leading-relaxed text-muted">
                  {competency.developmentAdvice}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {report.strengths.length > 0 ? (
        <div>
          <h3 className="font-semibold text-foreground">강점</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted report-prose">
            {report.strengths.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.developmentTasks.length > 0 ? (
        <div>
          <h3 className="font-semibold text-foreground">권장 개발 과제</h3>
          <ol className="mt-3 space-y-3">
            {report.developmentTasks.map((task, index) => (
              <li key={`${task.title}-${index}`} className="rounded-xl bg-card p-4 text-sm">
                <p className="font-medium text-foreground">
                  {index + 1}. {task.title}
                </p>
                <p className="mt-1 leading-relaxed text-muted">{task.body}</p>
                {task.practiceSequence ? (
                  <p className="mt-2 text-xs text-accent">{task.practiceSequence}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {report.ratingScale && report.ratingScale.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">평정 기준 참조표</h3>
          <table className="mt-2 w-full text-left text-xs text-muted">
            <tbody>
              {report.ratingScale.map((row) => (
                <tr key={row.score} className="border-t border-card-border">
                  <td className="w-10 py-1.5 font-medium text-foreground">{row.score}</td>
                  <td className="w-20 py-1.5">{row.levelLabel}</td>
                  <td className="py-1.5">{row.criteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
