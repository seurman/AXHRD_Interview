import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { InterviewKitBuilder } from "@/components/org/InterviewKitBuilder";
import { KitShareManager } from "@/components/org/KitShareManager";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgInterviewKitPage({ params }: Props) {
  await requireSuperadmin("/admin/organizations");
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const hubBase = `/admin/organizations/${org.id}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/organizations" className="hover:text-accent">
          기관 관리
        </Link>
        <span>/</span>
        <Link href={hubBase} className="hover:text-accent">
          {org.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">인터뷰 킷</span>
      </nav>

      <p className="max-w-2xl text-sm text-muted">
        고객 데모 빌더와 같은 메타→키트→질의→루브릭 흐름입니다. 구성 후 공유 링크로 바로 실행할 수
        있습니다.
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">Tenant workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{org.name}</h1>
          <p className="mt-1 text-sm text-muted">슈퍼어드민 편집 · 기관 ADMIN과 동일한 킷 빌더</p>
        </div>
        <Link href={hubBase} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          기관 허브
        </Link>
      </div>

      <InterviewKitBuilder organizationId={org.id} backHref={hubBase} backLabel="기관 허브로" />

      <KitShareManager organizationId={org.id} />
    </div>
  );
}
