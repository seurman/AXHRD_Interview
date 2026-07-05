import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { jobRoleLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/auth/login?next=/profile");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      targetCompanies: { take: 5, orderBy: { createdAt: "desc" } },
      resumes: { take: 3, orderBy: { createdAt: "desc" } },
      organization: { select: { name: true } },
    },
  });

  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-foreground">내 프로필</h1>

      <Link
        href="/profile/certificate"
        className="flex items-center justify-between rounded-2xl border-2 border-double border-gold/70 bg-gold/5 p-6 transition hover:bg-gold/10"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Competency Certificate
          </p>
          <p className="mt-1 font-semibold text-foreground">역량 인증서 보기 · 공유하기</p>
          <p className="mt-1 text-sm text-muted">
            IRT 기반 역량 프로필을 포트폴리오로 내보내거나 링크로 공유하세요
          </p>
        </div>
        <span className="text-2xl text-gold">→</span>
      </Link>

      <Link
        href={user.organizationId ? "/org/dashboard" : "/org/setup"}
        className="flex items-center justify-between rounded-2xl border border-card-border bg-background p-6 transition hover:border-gold/40"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Organization
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {user.organizationId
              ? `${user.organization?.name ?? "소속 기관"} · ${
                  user.orgRole === "STUDENT" ? "학생" : "코호트 대시보드"
                }`
              : "기관 연결하기"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {user.organizationId
              ? user.orgRole === "STUDENT"
                ? "소속 기관에 연결되어 있습니다"
                : "소속 학생들의 진행 현황을 확인하세요"
              : "대학 취업센터 등 소속 기관이 있다면 코드로 연결하세요"}
          </p>
        </div>
        <span className="text-2xl text-accent">→</span>
      </Link>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">기본 정보</h2>
        <dl className="grid gap-3 text-sm">
          <Row label="이름" value={user.name} />
          <Row label="이메일" value={user.email} />
          <Row label="경력" value={`${user.profile?.careerYears ?? 0}년`} />
          <Row
            label="희망 직무"
            value={jobRoleLabel(user.profile?.desiredJobRole ?? "OTHER")}
          />
          <Row label="학력" value={user.profile?.education ?? "—"} />
        </dl>
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">지원 회사</h2>
        {user.targetCompanies.length === 0 ? (
          <p className="text-sm text-muted">등록된 회사 없음</p>
        ) : (
          <ul className="space-y-2">
            {user.targetCompanies.map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-background px-4 py-2 text-sm text-foreground"
              >
                {c.name} · {c.industry ?? "—"} · {c.size}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">자기소개서</h2>
        {user.resumes.length === 0 ? (
          <p className="text-sm text-muted">업로드된 자소서 없음</p>
        ) : (
          <ul className="space-y-2">
            {user.resumes.map((r) => (
              <li
                key={r.id}
                className="rounded-lg bg-background px-4 py-2 text-sm text-foreground"
              >
                {r.fileName} · {r.rawText.slice(0, 60)}…
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
