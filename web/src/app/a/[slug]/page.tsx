import { notFound } from "next/navigation";
import { loadPublicAssessmentShare } from "@/lib/org/assessment-share";
import { AssessmentShareStart } from "@/components/assessment/AssessmentShareStart";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** 기관 역량평가 배포 링크 랜딩 — 비소속 지원자도 로그인 후 응시 */
export default async function PublicAssessmentSharePage({ params }: Props) {
  const { slug } = await params;
  const share = await loadPublicAssessmentShare(slug);
  if (!share) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <AssessmentShareStart share={share} />
    </div>
  );
}
