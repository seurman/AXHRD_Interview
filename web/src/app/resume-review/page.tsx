import Link from "next/link";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ResumeReviewHubPage() {
  const user = await requireProductCapability("product.resume_review", "/resume-review");

  const reviews = await prisma.resumeReview.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      matchSource: true,
      overallSummary: true,
      createdAt: true,
      suggestedCompetencies: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">자소서 첨삭</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          공고(JD) 또는 산업·직무 기준으로 자소서를 대조하고, 부족한 역량은 이어지는
          모의면접에서 검증할 수 있습니다.
        </p>
      </div>

      <Link href="/interview/setup" className="btn-primary inline-flex w-full justify-center py-3">
        면접 준비에서 첨삭 받기
      </Link>

      {reviews.length > 0 && (
        <section className="card-luxe space-y-3 p-6">
          <h2 className="font-semibold text-foreground">최근 첨삭</h2>
          <ul className="space-y-3">
            {reviews.map((r) => {
              const comps = Array.isArray(r.suggestedCompetencies)
                ? (r.suggestedCompetencies as string[])
                : [];
              return (
                <li key={r.id}>
                  <Link
                    href={`/resume-review/${r.id}`}
                    className="block rounded-xl border border-card-border p-4 transition hover:border-accent/40 hover:bg-background/50"
                  >
                    <p className="text-xs text-muted">
                      {r.createdAt.toLocaleString("ko-KR")} ·{" "}
                      {r.matchSource === "jd" ? "공고 기준" : "산업·직무 기준"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">{r.overallSummary}</p>
                    {comps[0] && (
                      <p className="mt-2 text-xs text-accent">
                        추천 역량: {competencyLabel(comps[0])}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
