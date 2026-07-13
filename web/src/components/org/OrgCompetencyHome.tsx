import Link from "next/link";
import type { CompetencyHomeData } from "@/lib/org/competency-home-data";

export function OrgCompetencyHome({
  organizationName,
  data,
  isAdmin,
}: {
  organizationName: string;
  data: CompetencyHomeData;
  isAdmin: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Competency SaaS
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{organizationName}</h1>
        <p className="mt-1 text-sm text-muted">
          인터뷰 킷·공유 링크로 지원자를 평가하고 결과를 비교하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.kitCompetencyCount}</p>
          <p className="mt-1 text-xs text-muted">설정된 역량 킷</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.activeShareCount}</p>
          <p className="mt-1 text-xs text-muted">활성 공유 캠페인</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.completedApplicantSessions}</p>
          <p className="mt-1 text-xs text-muted">완료 지원자 면접</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isAdmin && (
          <>
            <Link href="/org/settings/interview-kit" className="btn-primary text-sm">
              인터뷰 킷 편집
            </Link>
            <Link href="/org/settings/competencies" className="btn-secondary text-sm">
              커스텀 역량
            </Link>
          </>
        )}
        <Link href="/org/candidates" className="btn-secondary text-sm">
          지원자 결과
        </Link>
      </div>

      <section className="card-luxe p-6">
        <h2 className="mb-1 font-semibold text-foreground">최근 공유 캠페인</h2>
        <p className="mb-4 text-xs text-muted">킷 공유 링크별 완료 건수입니다.</p>
        {data.recentShares.length === 0 ? (
          <p className="text-sm text-muted">
            아직 공유 링크가 없습니다. 인터뷰 킷 스튜디오에서 캠페인을 만들어 보세요.
          </p>
        ) : (
          <ul className="divide-y divide-card-border">
            {data.recentShares.map((share) => (
              <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-foreground">{share.label}</p>
                  <p className="text-xs text-muted">
                    /kit/{share.slug} · 완료 {share.completedCount}건
                    {!share.isActive && " · 비활성"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {share.completedCount >= 2 && (
                    <Link
                      href={`/org/candidates/${share.id}/compare`}
                      className="text-sm text-gold hover:underline"
                    >
                      비교
                    </Link>
                  )}
                  <Link
                    href={`/org/candidates/${share.id}`}
                    className="text-sm text-accent hover:underline"
                  >
                    목록
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
