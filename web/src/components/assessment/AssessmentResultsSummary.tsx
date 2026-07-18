import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { scoreToLevelLabel } from "@/types/evidence-assessment";

/**
 * 사용자의 완료된 역량평가(역할연기·서류함) 결과 요약 — 면접 리포트 하단 등에 부착.
 * 결과가 없으면 아무것도 렌더링하지 않는다.
 */
export async function AssessmentResultsSummary({
  userId,
  heading = "역량평가 결과 (서류함·역할연기)",
}: {
  userId: string;
  heading?: string;
}) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId, status: "SCORED", report: { isNot: null } },
    orderBy: { submittedAt: "desc" },
    take: 6,
    include: {
      scenario: { select: { titleKo: true, kind: true } },
      report: { select: { overallScore: true, generatedAt: true } },
    },
  });
  if (attempts.length === 0) return null;

  return (
    <section className="card-luxe p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
        <Link href="/assessment" className="text-sm text-accent hover:underline">
          전체 보기 →
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        면접과 별도로 수행한 역량평가 과제의 증거형 행동평가 결과입니다.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {attempts.map((a) => {
          const score = a.report?.overallScore ?? null;
          return (
            <li key={a.id}>
              <Link
                href={`/assessment/attempt/${a.id}/report`}
                className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-background/60 p-4 transition hover:border-gold/30"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {a.scenario.kind === "IN_BASKET" ? "서류함" : "역할연기"}
                    {a.submittedAt
                      ? ` · ${new Date(a.submittedAt).toLocaleDateString("ko-KR")}`
                      : ""}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {a.scenario.titleKo}
                  </p>
                </div>
                {score != null ? (
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-foreground">
                      {score.toFixed(2)}
                      <span className="text-xs font-normal text-muted">/5</span>
                    </p>
                    <p className="text-xs text-accent">{scoreToLevelLabel(score)}</p>
                  </div>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
