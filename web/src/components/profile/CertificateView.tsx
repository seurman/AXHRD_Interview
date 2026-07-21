import { ScoreGauge } from "@/components/report/ScoreGauge";
import { competencyLabel } from "@/lib/labels";
import type { CertificateData } from "@/lib/candidate/certificate";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** IRT 인증서 — 본인용(/profile/certificate)과 공개 공유용(/c/[slug])이 함께 쓰는 화면.
 *  "설명 가능한 평가"를 정체성으로 내세우기 위해 방법론 한 줄을 항상 노출한다. */
export function CertificateView({ data }: { data: CertificateData }) {
  return (
    <div className="rounded-3xl border-4 border-double border-gold/70 bg-card p-5 shadow-luxe sm:p-8 lg:p-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          AXHRD Competency Certificate
        </p>
        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
          {data.name}님의 역량 인증서
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          발급일 {formatDate(data.issuedAt)} · 완료 세션 {data.sessionCount}회
          {data.pathBadges.length > 0 ? (
            <>
              <span className="hidden sm:inline"> · </span>
              <span className="mt-1 block sm:mt-0 sm:inline">
                학습 패스 인증 {data.pathBadges.length}개
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="my-8 flex justify-center">
        <ScoreGauge
          value={data.overallPercentile ?? 0}
          size={140}
          label="종합 백분위"
        />
      </div>

      {data.pathBadges.length > 0 ? (
        <div className="mb-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Learning Path Certified
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {data.pathBadges.map((b) => (
              <li
                key={b.competency}
                className="max-w-full rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-center text-xs font-medium text-foreground"
              >
                {b.titleKo} · {formatDate(b.certifiedAt)}
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-center text-[11px] leading-relaxed text-muted">
            학습 패스 인증은 개념·원리·드릴·자가점검 완료 표시이며, IRT θ와는 별개입니다.
          </p>
        </div>
      ) : null}

      {data.competencies.length === 0 ? (
        <p className="text-center text-sm text-muted">
          아직 완료된 역량 평가가 없습니다. 면접을 완료하면 이곳에 결과가 표시됩니다.
        </p>
      ) : (
        <div className="space-y-4">
          {data.competencies.map((c) => (
            <div key={c.competency}>
              <div className="mb-1 flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between">
                <span className="font-medium text-foreground">
                  {competencyLabel(c.competency)}
                </span>
                <span className="text-muted">
                  L{c.levelEst} · 상위 {Math.max(0, Math.round(100 - c.percentile))}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-2 rounded-full bg-gold"
                  style={{ width: `${Math.min(100, Math.max(0, c.percentile))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 border-t border-card-border pt-6 text-center">
        <p className="text-xs leading-relaxed text-muted report-prose">
          본 인증서는 IRT(2PL, 문항반응이론) 기반 적응형 평가 엔진으로 산출된 자기계발용 모의 면접
          결과이며, 채용 절차상 공식 자격이나 심사 결과를 증명하지 않습니다.
          <br />
          문항별 난이도·판별도 값을 기반으로 능력치(θ)를 추정하는 방식으로, 결과 산출 과정이
          투명하게 설명 가능합니다.
        </p>
      </div>
    </div>
  );
}
