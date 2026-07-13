import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveOrgCandidateScreening } from "@/lib/org/candidate-screening";
import { OrgCandidateScreeningGate } from "@/components/org/OrgCandidateScreeningGate";
import { getCandidateComparison } from "@/lib/org/candidate-comparison";
import { CandidateCompareView } from "@/components/org/CandidateCompareView";

export const dynamic = "force-dynamic";

export default async function OrgCandidateComparePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const ctx = await resolveOrgCandidateScreening("/org/candidates");
  if (!ctx.competencyEnabled) {
    return <OrgCandidateScreeningGate organizationName={ctx.organizationName} />;
  }

  const { shareId } = await params;
  const data = await getCandidateComparison(ctx.user.organizationId, shareId);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href={`/org/candidates/${shareId}`}
          className="text-sm text-accent hover:underline"
        >
          ← {data.shareLabel}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">지원자 비교</h1>
        <p className="mt-1 text-sm text-muted">
          {data.shareLabel} · 완료 {data.rows.length}명 — 종합 점수·6축 답변 품질을 한눈에
          비교합니다.
        </p>
      </div>

      <div className="card-luxe p-6">
        <CandidateCompareView data={data} />
      </div>
    </div>
  );
}
