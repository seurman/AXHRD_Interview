import Link from "next/link";
import {
  resolveOrgCandidateScreening,
} from "@/lib/org/candidate-screening";
import { OrgCandidateScreeningGate } from "@/components/org/OrgCandidateScreeningGate";
import { OrgStudioFrame } from "@/components/org/OrgStudioFrame";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrgCandidatesPage() {
  const ctx = await resolveOrgCandidateScreening("/org/candidates");

  if (!ctx.competencyEnabled) {
    return <OrgCandidateScreeningGate organizationName={ctx.organizationName} />;
  }

  const orgUser = ctx.user;

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
    <OrgStudioFrame
      eyebrow={`${ctx.organizationName} · Screening`}
      title="지원자 결과"
      description="인터뷰 킷 공유 링크로 완료된 지원자 면접 결과를 확인합니다."
      actions={
        <Link
          href="/org/settings/interview-kit"
          className="inline-flex min-h-10 items-center rounded-xl border border-card-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-gold/40"
        >
          킷 공유 관리
        </Link>
      }
    >
      {shares.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center text-sm text-muted">
          <p>아직 공유한 인터뷰 킷 캠페인이 없습니다.</p>
          <Link
            href="/org/settings/interview-kit"
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            인터뷰 킷 스튜디오에서 공유 링크 만들기 →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shares.map((share) => (
            <Link
              key={share.id}
              href={`/org/candidates/${share.id}`}
              className="block rounded-xl border border-card-border bg-card p-5 transition hover:border-gold/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-foreground">{share.label}</h2>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
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
    </OrgStudioFrame>
  );
}
