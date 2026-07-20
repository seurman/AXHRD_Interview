import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { jobRoleLabel } from "@/lib/utils";
import { competencyLabel } from "@/lib/labels";
import { getUserStrengthDeck } from "@/lib/discover/user-strengths";
import { StrengthCardDeck } from "@/components/profile/StrengthCardDeck";
import { OrgCoachingConsentToggle } from "@/components/profile/OrgCoachingConsentToggle";
import { BillingManageCard } from "@/components/billing/BillingManageCard";
import { LeaveOrgButton } from "@/components/org/LeaveOrgButton";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/auth/login?next=/profile");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      orgRole: true,
      orgCoachingConsent: true,
      profile: true,
      targetCompanies: { take: 5, orderBy: { createdAt: "desc" } },
      resumes: { take: 3, orderBy: { createdAt: "desc" } },
      organization: { select: { name: true } },
      competencyLogs: { orderBy: { recordedAt: "desc" } },
      sessions: { where: { status: "COMPLETED" } },
      selfDiscoverySessions: { where: { status: "COMPLETED" }, take: 1 },
    },
  });

  if (!user) redirect("/auth/login");

  const strengthDeck = await getUserStrengthDeck(user.id);

  const latestByCompetency: Record<string, { percentile: number; levelEst: number }> = {};
  for (const log of user.competencyLogs) {
    if (!latestByCompetency[log.competency]) {
      latestByCompetency[log.competency] = {
        percentile: log.percentile,
        levelEst: log.levelEst,
      };
    }
  }

  const avgPercentile =
    Object.values(latestByCompetency).length > 0
      ? Math.round(
          Object.values(latestByCompetency).reduce((s, v) => s + v.percentile, 0) /
            Object.values(latestByCompetency).length
        )
      : null;

  return (
    <div className="product-stage product-stage--wide mx-auto max-w-3xl space-y-8">
      <div className="product-stage__inner !max-w-3xl space-y-8">
      <header className="overflow-hidden rounded-2xl border border-card-border bg-card/80 shadow-luxe">
        <div className="bg-gradient-to-r from-primary/10 via-gold/10 to-transparent px-6 py-6">
          <p className="product-stage__kicker">Player Profile</p>
          <h1 className="product-stage__title !text-2xl sm:!text-3xl">{user.name}</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Badge label="희망 직무" value={jobRoleLabel(user.profile?.desiredJobRole ?? "OTHER")} />
            <Badge label="경력" value={`${user.profile?.careerYears ?? 0}년`} />
            {avgPercentile !== null && (
              <Badge label="평균 역량" value={`${avgPercentile}%`} />
            )}
            <Badge label="면접 완료" value={`${user.sessions.length}회`} />
            {strengthDeck && (
              <Badge label="강점 카드" value={`${strengthDeck.totalDiscovered}장`} accent />
            )}
          </div>
        </div>
      </header>

      <BillingManageCard />

      {user.organizationId && user.organization && (
        <OrgCoachingConsentToggle
          organizationName={user.organization.name}
          enabled={user.orgCoachingConsent}
        />
      )}

      <StrengthCardDeck
        strengths={strengthDeck?.strengths ?? []}
        interviewAdvice={strengthDeck?.interviewAdvice}
        totalDiscovered={strengthDeck?.totalDiscovered ?? 0}
        reportHref={strengthDeck ? `/discover/${strengthDeck.sessionId}/report` : undefined}
      />

      {strengthDeck?.narrativeSummary && (
        <section className="card-luxe p-6">
          <h2 className="font-semibold text-foreground">나의 이야기 한 줄</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{strengthDeck.narrativeSummary}</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/profile/certificate"
          className="card-luxe flex flex-col justify-between p-6 transition hover:border-gold/40"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Certificate</p>
            <p className="mt-1 font-semibold text-foreground">역량 인증서</p>
            <p className="mt-1 text-sm text-muted">IRT 프로필을 포트폴리오로 공유</p>
          </div>
          <span className="mt-4 text-gold">→</span>
        </Link>
        <Link
          href="/discover"
          className="card-luxe flex flex-col justify-between p-6 transition hover:border-primary/40"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Discover</p>
            <p className="mt-1 font-semibold text-foreground">나를 발견하기</p>
            <p className="mt-1 text-sm text-muted">강점 카드 업데이트 · 면접 브릿지</p>
          </div>
          <span className="mt-4 text-primary">→</span>
        </Link>
      </div>

      {Object.keys(latestByCompetency).length > 0 && (
        <section className="card-luxe p-6">
          <h2 className="mb-4 font-semibold text-foreground">역량 배지</h2>
          <div className="flex flex-wrap gap-2">
            {COMPETENCY_CODES.filter((c) => latestByCompetency[c]).map((code) => {
              const v = latestByCompetency[code];
              return (
                <span
                  key={code}
                  className="rounded-full border border-card-border bg-background px-3 py-1.5 text-xs font-medium"
                >
                  {competencyLabel(code)} L{v.levelEst} · {v.percentile}%
                </span>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-2">
        <Link
          href={user.organizationId ? "/org/dashboard" : "/org/setup"}
          className="flex items-center justify-between rounded-2xl border border-card-border bg-background p-6 transition hover:border-gold/40"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Organization</p>
            <p className="mt-1 font-semibold text-foreground">
              {user.organizationId
                ? `${user.organization?.name ?? "소속 기관"} · ${
                    user.orgRole === "MEMBER" || user.orgRole === "STUDENT"
                      ? "구성원"
                      : "참여 현황"
                  }`
                : "기관 연결하기"}
            </p>
          </div>
          <span className="text-2xl text-accent">→</span>
        </Link>
        {user.organizationId ? (
          <div className="flex justify-end px-1">
            <LeaveOrgButton organizationName={user.organization?.name} />
          </div>
        ) : null}
      </div>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">기본 정보</h2>
        <dl className="grid gap-3 text-sm">
          <Row label="학력" value={user.profile?.education ?? "—"} />
          <Row label="산업군" value={user.profile?.desiredIndustry ?? "—"} />
        </dl>
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">지원 회사</h2>
        {user.targetCompanies.length === 0 ? (
          <p className="text-sm text-muted">등록된 회사 없음 · 면접 설정에서 추가하세요</p>
        ) : (
          <ul className="space-y-2">
            {user.targetCompanies.map((c) => (
              <li key={c.id} className="rounded-lg bg-background px-4 py-2 text-sm text-foreground">
                {c.name} · {c.industry ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 ${accent ? "bg-gold/15 text-gold" : "bg-background text-foreground"}`}
    >
      <span className="text-muted">{label}</span> {value}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-card-border pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
