import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getCertificateData } from "@/lib/candidate/certificate";
import { CertificateView } from "@/components/profile/CertificateView";
import { ShareLinkButton } from "@/components/profile/ShareLinkButton";

export const dynamic = "force-dynamic";

export default async function MyCertificatePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/auth/login?next=/profile/certificate");

  const [data, user] = await Promise.all([
    getCertificateData(sessionUser.id),
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { certificateSlug: true },
    }),
  ]);

  if (!data) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/profile" className="text-sm text-muted hover:text-foreground">
          ← 프로필로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">역량 인증서</h1>
        <p className="mt-1 text-sm text-muted">
          지금까지 완료한 면접을 기반으로 산출된 역량 프로필입니다. 이직·취업 시 포트폴리오로
          활용하거나 링크로 공유할 수 있습니다.
        </p>
      </div>

      <div className="card-luxe p-5">
        <p className="mb-3 text-sm font-medium text-foreground">공유 링크</p>
        <ShareLinkButton initialSlug={user?.certificateSlug ?? null} />
      </div>

      <CertificateView data={data} />
    </div>
  );
}
