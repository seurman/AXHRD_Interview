import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { resolveOrgContentAccess } from "@/lib/content/org-access";
import { OrgQuestionEditor } from "@/components/org/OrgQuestionEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OrgCompetencyQuestionsPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePageUser(`/org/settings/competencies/${id}/questions`);
  const access = await resolveOrgContentAccess(user);
  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-muted">
        권한이 없습니다.{" "}
        <Link href="/org/settings/competencies" className="text-accent hover:underline">
          역량 관리
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold">문항 관리</h1>
      <OrgQuestionEditor competencyId={id} />
    </div>
  );
}
