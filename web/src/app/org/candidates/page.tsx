import Link from "next/link";
import { requireOrgCandidateScreening } from "@/lib/org/candidate-screening";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrgCandidatesPage() {
  const orgUser = await requireOrgCandidateScreening("/org/candidates");

  const shares = await prisma.orgInterviewKitShare.findMany({
    where: { organizationId: orgUser.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sessions: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Candidate screening
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">지원자 결과</h1>
        <p className="mt-1 text-sm text-muted">
          인터뷰 킷 공유 링크로 완료된 지원자 면접 결과를 확인합니다.
        </p>
      </div>

      {shares.length === 0 ? (
        <div className="card-luxe p-8 text-center text-muted">
          <p>아직 공유한 인터뷰 킷 캠페인이 없습니다.</p>
          <Link href="/org/settings/interview-kit" className="mt-4 inline-block text-sm text-accent hover:underline">
            인터뷰 킷 스튜디오에서 공유 링크 만들기 →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shares.map((share) => (
            <Link
              key={share.id}
              href={`/org/candidates/${share.id}`}
              className="card-luxe block p-5 transition hover:border-gold/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-foreground">{share.label}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    share.isActive ? "bg-success/15 text-success" : "bg-muted/20 text-muted"
                  }`}
                >
                  {share.isActive ? "활성" : "비활성"}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted">/kit/{share.slug}</p>
              <p className="mt-3 text-sm text-muted">
                완료 {share._count.sessions}건
                {share.expiresAt && (
                  <>
                    {" "}
                    · 만료 {share.expiresAt.toLocaleDateString("ko-KR")}
                  </>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
