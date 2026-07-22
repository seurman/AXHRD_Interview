import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCertificateData } from "@/lib/candidate/certificate";
import { CertificateView } from "@/components/profile/CertificateView";
import { PrintButton } from "@/components/ui/PrintButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** 로그인 없이 열람 가능한 공개 역량 인증서 — 공유 링크 전용, 비활성화 시 404. */
export default async function PublicCertificatePage({ params }: PageProps) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { certificateSlug: slug },
    select: { id: true },
  });

  if (!user) notFound();

  const data = await getCertificateData(user.id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="print-hide flex justify-end">
        <PrintButton />
      </div>
      <div className="print-root">
        <CertificateView data={data} />
      </div>
      <p className="print-hide text-center text-xs text-muted">
        <a href="/" className="text-accent hover:underline">
          HR_IN Solution
        </a>
        {" "}에서 만든 IRT 기반 모의 면접 역량 인증서입니다.
      </p>
    </div>
  );
}
