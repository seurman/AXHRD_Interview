import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import {
  ORG_PRODUCTS,
  type OrgEntitlementSnapshot,
  type OrgProductKey,
} from "@/lib/org/entitlements";
import type { OrgOverviewData } from "@/lib/org/overview-data";

const PRODUCT_HREFS: Record<OrgProductKey, string> = {
  interview: "/org/dashboard",
  competency: "/org/candidates",
  diagnostic: "/org/diagnosis",
  assessment: "/org/settings/assessment",
};

export function OrgOverview({
  data,
  entitlements,
}: {
  data: OrgOverviewData;
  entitlements: OrgEntitlementSnapshot;
}) {
  const activeProducts = ORG_PRODUCTS.filter((p) => entitlements[p.key]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Org Overview</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{data.organizationName}</h1>
        <p className="mt-1 text-sm text-muted">
          활성화된 상품별 요약입니다. 자세한 화면은 각 카드에서 이동하세요.
        </p>
      </div>

      <div className="space-y-4">
        {activeProducts.map((product) => (
          <section key={product.key} className="card-luxe p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                  {product.shortLabel}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{product.label}</h2>
                <p className="mt-1 text-sm text-muted">{product.description}</p>
              </div>
              <Link
                href={PRODUCT_HREFS[product.key]}
                className="btn-secondary shrink-0 text-sm"
              >
                자세히 보기
              </Link>
            </div>

            {product.key === "interview" && data.interview && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="소속 학생" value={`${data.interview.memberCount}명`} />
                <Metric
                  label="완료 면접"
                  value={`${data.interview.totalCompletedSessions}건`}
                />
                <Metric
                  label="평균 백분위"
                  value={
                    data.interview.overallAvgPercentile != null
                      ? `${data.interview.overallAvgPercentile}`
                      : "—"
                  }
                  hint={
                    data.interview.weakestCompetency
                      ? `취약: ${competencyLabel(data.interview.weakestCompetency)}`
                      : undefined
                  }
                />
              </div>
            )}

            {product.key === "competency" && data.competency && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="역량 킷" value={`${data.competency.kitCompetencyCount}개`} />
                <Metric label="활성 캠페인" value={`${data.competency.activeShareCount}개`} />
                <Metric
                  label="완료 지원자"
                  value={`${data.competency.completedApplicantSessions}건`}
                />
              </div>
            )}

            {product.key === "diagnostic" && data.diagnostic && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="최근 웨이브"
                  value={data.diagnostic.latestWaveLabel ?? "—"}
                  hint={data.diagnostic.latestWaveStatus ?? undefined}
                />
                <Metric label="제출 응답" value={`${data.diagnostic.responseCount}건`} />
                <Metric label="팀 수" value={`${data.diagnostic.teamCount}개`} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-background p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
