import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Quote,
  Target,
  AlertTriangle,
} from "lucide-react";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { competencyLabel } from "@/lib/labels";
import { REVIEW_CATEGORY_LABELS, type ReviewCategory } from "@/lib/interview/resume-review-criteria-data";

export type ParagraphFeedback = { quote: string; issue: string; suggestion: string };
export type ImprovementItem = { gapLabel: string; suggestion: string };
export type JdMatch = { matchScore: number | null; matched: string[]; missing: string[] };

export type CriterionResultView = {
  code: string;
  category: ReviewCategory | string;
  title: string;
  status: "pass" | "partial" | "fail" | string;
  strengthNote: string;
  gapNote: string;
};

export type DimensionScoreView = {
  category: ReviewCategory | string;
  label: string;
  score: number;
  band: "strong" | "adequate" | "weak" | string;
  strengths: string[];
  gaps: string[];
};

type ResumeReviewReportProps = {
  overallSummary: string;
  matchSource: string;
  paragraphFeedback: ParagraphFeedback[];
  jdMatch: JdMatch;
  improvementPlan: ImprovementItem[];
  suggestedCompetencies: string[];
  companyName?: string | null;
  createdAt: Date;
  dimensionScores?: DimensionScoreView[] | null;
  criteriaResults?: CriterionResultView[] | null;
  narrativeSource?: string | null;
  narrativeModel?: string | null;
};

function matchScoreLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 75) return "양호";
  if (score >= 50) return "보통";
  return "보완 필요";
}

function matchScoreVariant(score: number | null): "accent" | "gold" {
  if (score != null && score >= 60) return "gold";
  return "accent";
}

function bandLabel(band: string): string {
  if (band === "strong") return "양호";
  if (band === "adequate") return "보통";
  return "약함";
}

function statusLabel(status: string): string {
  if (status === "pass") return "충족";
  if (status === "partial") return "부분";
  return "부족";
}

function statusClass(status: string): string {
  if (status === "pass") return "bg-success/15 text-success";
  if (status === "partial") return "bg-warning/15 text-warning";
  return "bg-danger/15 text-danger";
}

function overallFromDims(dims: DimensionScoreView[]): number {
  if (!dims.length) return 0;
  return Math.round(dims.reduce((s, d) => s + (d.score || 0), 0) / dims.length);
}

export function ResumeReviewReport({
  overallSummary,
  matchSource,
  paragraphFeedback,
  jdMatch,
  improvementPlan,
  suggestedCompetencies,
  companyName,
  createdAt,
  dimensionScores,
  criteriaResults,
  narrativeSource,
  narrativeModel,
}: ResumeReviewReportProps) {
  const primaryCompetency = suggestedCompetencies[0] ?? "COMMUNICATION";
  const dims = Array.isArray(dimensionScores) ? dimensionScores : [];
  const results = Array.isArray(criteriaResults) ? criteriaResults : [];
  const hasDims = dims.length > 0;
  const displayScore = hasDims ? overallFromDims(dims) : (jdMatch.matchScore ?? 0);
  const hasScore = hasDims || jdMatch.matchScore != null;
  const isLlm = narrativeSource === "llm";

  return (
    <div className="space-y-8">
      {narrativeSource && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            isLlm
              ? "border-success/30 bg-success/10 text-foreground"
              : "border-warning/40 bg-warning/10 text-foreground"
          }`}
        >
          {isLlm ? (
            <>
              AI 첨삭 모델로 생성되었습니다
              {narrativeModel ? (
                <span className="text-muted"> ({narrativeModel})</span>
              ) : null}
              . 같은 자소서를 다시 돌리면 표현이 조금 달라질 수 있습니다.
            </>
          ) : (
            <>
              AI 서술이 비어 규칙 기반 첨삭으로 대체되었습니다
              {narrativeModel?.startsWith("failed:") ? (
                <span className="text-muted">
                  {" "}
                  — {narrativeModel.replace(/^failed:/, "")}
                </span>
              ) : null}
              . Gemini 쿼터/모델 가용성 문제일 수 있으니, 잠시 후 다시 첨삭을 요청해
              주세요.
            </>
          )}
        </div>
      )}

      <section className="card-luxe flex flex-col gap-6 border-double border-gold/35 p-6 sm:flex-row sm:items-start">
        <div className="flex w-full flex-col items-center gap-3 sm:w-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">
            Resume Review
          </p>
          {hasScore ? (
            <ScoreGauge
              value={displayScore}
              label={hasDims ? "기준 충족도" : "키워드 매칭"}
              variant={matchScoreVariant(displayScore)}
            />
          ) : (
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-dashed border-card-border text-center">
              <span className="text-xs text-muted">점수</span>
              <span className="mt-1 text-sm font-medium text-muted">미산출</span>
            </div>
          )}
          {hasScore && (
            <span className="rounded-full bg-gold/15 px-3 py-0.5 text-xs font-medium text-gold">
              {matchScoreLabel(displayScore)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                matchSource === "jd"
                  ? "bg-accent/15 text-accent"
                  : "bg-gold/15 text-gold"
              }`}
            >
              {matchSource === "jd" ? "공고(JD) 기준" : "산업·직무 일반 기준"}
            </span>
            {companyName && (
              <span className="text-xs text-muted">{companyName}</span>
            )}
            <span className="text-xs text-muted">
              {createdAt.toLocaleString("ko-KR")}
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">기준 대비 총평</h2>
            <p className="mt-1 text-xs text-muted">
              자소서 요약이 아니라, 형식·논리 / 산업 역량 / STAR·BEI 기준과 비교한 평가입니다.
            </p>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-foreground report-prose">
              {overallSummary}
            </p>
          </div>

          {suggestedCompetencies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium text-muted">추천 면접 역량</span>
              {suggestedCompetencies.slice(0, 3).map((code) => (
                <span
                  key={code}
                  className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                >
                  {competencyLabel(code)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {hasDims && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">평가 축 (3)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {dims.map((d) => (
              <div key={d.category} className="card-luxe space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{d.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.band === "strong"
                        ? "bg-success/15 text-success"
                        : d.band === "adequate"
                          ? "bg-warning/15 text-warning"
                          : "bg-danger/15 text-danger"
                    }`}
                  >
                    {bandLabel(d.band)} · {d.score}
                  </span>
                </div>
                {d.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-success">잘한 점</p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {d.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="leading-snug">
                          · {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-warning">부족한 점</p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {d.gaps.slice(0, 3).map((g, i) => (
                        <li key={i} className="leading-snug">
                          · {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="card-luxe space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">기준별 판정</h2>
            <p className="mt-1 text-sm text-muted">
              각 항목은 자소서가 갖춰야 할 기본과 비교한 결과입니다.
            </p>
          </div>
          <ul className="space-y-3">
            {results.map((r) => {
              const catLabel =
                REVIEW_CATEGORY_LABELS[r.category as ReviewCategory] ?? r.category;
              return (
                <li
                  key={r.code}
                  className="rounded-xl border border-card-border bg-background/50 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">{catLabel}</span>
                    <span className="font-semibold text-foreground">{r.title}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  {r.strengthNote ? (
                    <p className="mt-2 text-success/90">
                      <span className="font-medium">잘함 · </span>
                      {r.strengthNote}
                    </p>
                  ) : null}
                  {r.gapNote ? (
                    <p className="mt-1 text-warning">
                      <span className="font-medium">부족 · </span>
                      {r.gapNote}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(jdMatch.matched.length > 0 || jdMatch.missing.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {jdMatch.matched.length > 0 && (
            <section className="card-luxe p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                <h3 className="font-semibold text-foreground">드러난 키워드</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {jdMatch.matched.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </section>
          )}
          {jdMatch.missing.length > 0 && (
            <section className="card-luxe p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-warning" aria-hidden />
                <h3 className="font-semibold text-foreground">보완 키워드</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {jdMatch.missing.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-warning/12 px-2.5 py-1 text-xs font-medium text-warning"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {paragraphFeedback.length > 0 && (
        <section className="card-luxe space-y-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">문단별 수정 제안</h2>
            <p className="mt-1 text-sm text-muted">
              원문 인용과 함께, 어떤 기준이 부족한지·어떻게 고칠지를 정리했습니다.
            </p>
          </div>
          <ol className="space-y-4">
            {paragraphFeedback.map((p, i) => (
              <li
                key={`${p.quote.slice(0, 24)}-${i}`}
                className="rounded-xl border border-card-border bg-background/50 overflow-hidden"
              >
                <div className="flex items-center gap-2 border-b border-card-border bg-background/80 px-4 py-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-muted">문단 피드백</span>
                </div>
                <div className="space-y-4 p-4 text-sm">
                  <blockquote className="relative rounded-lg border-l-4 border-gold/50 bg-gold/5 py-3 pl-4 pr-3">
                    <Quote className="absolute right-3 top-3 h-4 w-4 text-gold/40" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                      원문
                    </p>
                    <p className="mt-1 leading-relaxed text-foreground">「{p.quote}」</p>
                  </blockquote>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-warning/8 p-3">
                      <p className="flex items-center gap-1 text-xs font-semibold text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        부족·문제
                      </p>
                      <p className="mt-1.5 leading-relaxed text-foreground">{p.issue}</p>
                    </div>
                    <div className="rounded-lg bg-accent/8 p-3">
                      <p className="text-xs font-semibold text-accent">수정·보완</p>
                      <p className="mt-1.5 leading-relaxed text-foreground">{p.suggestion}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {improvementPlan.length > 0 && (
        <section className="card-luxe space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-gold" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">우선 수정·보완 액션</h2>
          </div>
          <ul className="space-y-3">
            {improvementPlan.map((item, i) => (
              <li
                key={`${item.gapLabel}-${i}`}
                className="flex gap-3 rounded-xl border border-card-border bg-background/40 p-4 text-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.gapLabel}</p>
                  <p className="mt-1.5 leading-relaxed text-muted">{item.suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/interview/setup?competency=${encodeURIComponent(primaryCompetency)}`}
        className="btn-primary group flex w-full items-center justify-center gap-2 py-3.5"
      >
        {competencyLabel(primaryCompetency)} 역량으로 면접 시작하기
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
