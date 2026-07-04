import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default async function PlanOverviewPage({ params }: PageProps) {
  const { planId } = await params;

  const plan = await prisma.interviewPlan.findUnique({
    where: { id: planId },
    include: {
      user: true,
      targetCompany: true,
      competencyProgress: {
        include: { feedback: true },
        orderBy: { competency: "asc" },
      },
    },
  });

  if (!plan) notFound();

  const done = plan.competencyProgress.filter((p) => p.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">면접 플랜 진행 현황</h1>
        <p className="mt-2 text-slate-400">
          {plan.user.name} · {plan.targetCompany?.name ?? "회사 미지정"} ·{" "}
          {done.length}/{COMPETENCY_CODES.length} 역량 완료
        </p>
      </div>

      <div className="space-y-3">
        {COMPETENCY_CODES.map((code) => {
          const row = plan.competencyProgress.find((p) => p.competency === code);
          const status = row?.status ?? "NOT_STARTED";
          return (
            <div
              key={code}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-light/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{competencyLabel(code)}</p>
                <p className="text-xs text-slate-500">
                  {status === "COMPLETED"
                    ? `L${row?.levelEst} · ${row?.percentile != null ? formatPercentile(row.percentile) : ""}`
                    : status === "IN_PROGRESS"
                      ? "진행 중"
                      : "미시작"}
                </p>
              </div>
              {status === "COMPLETED" && row?.feedback ? (
                <Link
                  href={`/interview/plan/${planId}/competency/${code}/feedback`}
                  className="text-sm text-accent hover:underline"
                >
                  피드백 →
                </Link>
              ) : status !== "COMPLETED" ? (
                <Link
                  href={`/interview/setup?planId=${planId}&competency=${code}&email=${encodeURIComponent(plan.user.email)}`}
                  className="text-sm text-brand-400 hover:underline"
                >
                  시작 →
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <Link
        href="/interview/setup"
        className="inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
      >
        새 역량 면접 시작
      </Link>
    </div>
  );
}
